import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { CreateSessionSchema, AddTurnSchema, GetNextQuestionSchema, TriggerExtractionSchema } from '../types';
import { agentService } from '../services/agent.service';
import { extractorService } from '../services/extractor.service';
import { consolidatorService } from '../services/consolidator.service';
import { openaiService } from '../services/openai.service';
import { writeFileSync, unlinkSync } from 'fs';
import path from 'path';
import { nanoid } from 'nanoid';
import config from '../config';

export async function sessionsRoutes(fastify: FastifyInstance) {
  // Create new session
  fastify.post('/sessions', {
    onRequest: [fastify.authenticate],
    schema: {
      body: {
        type: 'object',
        properties: {
          module: { type: 'string' },
        },
      },
    },
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const body = request.body as any;

      const session = await prisma.session.create({
        data: {
          personId: user.personId,
          module: body.module || 'profile_header',
          status: 'active',
        },
        include: {
          person: true,
        },
      });

      return {
        success: true,
        session: {
          id: session.id,
          personId: session.personId,
          startedAt: session.startedAt,
          status: session.status,
          module: session.module,
        },
      };
    },
  });

  // Get all sessions for user
  fastify.get('/sessions', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };

      const sessions = await prisma.session.findMany({
        where: { personId: user.personId },
        orderBy: { startedAt: 'desc' },
        include: {
          _count: {
            select: { turns: true },
          },
        },
      });

      return {
        success: true,
        sessions: sessions.map((s) => ({
          id: s.id,
          startedAt: s.startedAt,
          endedAt: s.endedAt,
          status: s.status,
          module: s.module,
          turnCount: s._count.turns,
        })),
      };
    },
  });

  // Get session details
  fastify.get('/sessions/:id', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const { id } = request.params as { id: string };

      const session = await prisma.session.findFirst({
        where: { id, personId: user.personId },
        include: {
          turns: {
            orderBy: { timestamp: 'asc' },
          },
        },
      });

      if (!session) {
        return reply.code(404).send({ success: false, error: 'Session not found' });
      }

      return {
        success: true,
        session: {
          id: session.id,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          status: session.status,
          module: session.module,
          turns: session.turns,
        },
      };
    },
  });

  // Add turn (with audio upload)
  fastify.post('/sessions/:id/turns', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const { id } = request.params as { id: string };

      // Verify session ownership
      const session = await prisma.session.findFirst({
        where: { id, personId: user.personId },
      });

      if (!session) {
        return reply.code(404).send({ success: false, error: 'Session not found' });
      }

      // Handle multipart upload
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({ success: false, error: 'No audio file provided' });
      }

      // Save audio file
      const filename = `audio_${nanoid()}.webm`;
      const filepath = path.join(config.UPLOAD_DIR, filename);
      const buffer = await data.toBuffer();
      writeFileSync(filepath, buffer);

      // Transcribe with Whisper
      let transcript: string;
      let audioDuration: number;
      try {
        const result = await openaiService.transcribeAudio(filepath);
        transcript = result.transcript;
        audioDuration = result.duration;
      } catch (error) {
        // Clean up file
        unlinkSync(filepath);
        return reply.code(500).send({ success: false, error: 'Failed to transcribe audio' });
      }

      // Store audio URL if enabled
      const audioUrl = config.STORE_AUDIO ? `/uploads/${filename}` : null;

      // Clean up audio if not storing
      if (!config.STORE_AUDIO) {
        unlinkSync(filepath);
      }

      // Create turn
      const turn = await prisma.turn.create({
        data: {
          sessionId: id,
          speaker: 'user',
          transcript,
          audioUrl,
          meta: {
            duration: audioDuration,
            filename: data.filename,
          },
          status: 'completed',
        },
      });

      return {
        success: true,
        turn: {
          id: turn.id,
          transcript,
          audioUrl,
          timestamp: turn.timestamp,
        },
      };
    },
  });

  // Get next agent question
  fastify.post('/sessions/:id/agent/next', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const { id } = request.params as { id: string };

      // Verify session ownership
      const session = await prisma.session.findFirst({
        where: { id, personId: user.personId },
      });

      if (!session) {
        return reply.code(404).send({ success: false, error: 'Session not found' });
      }

      // Check if should trigger extraction
      const shouldExtract = await agentService.shouldTriggerExtraction(id);

      if (shouldExtract) {
        // Trigger extraction and consolidation
        try {
          const extracted = await extractorService.extractFromSession(id);
          await consolidatorService.consolidate(user.personId, extracted);

          // Advance to next module if needed
          await agentService.advanceModule(id);
        } catch (error) {
          console.error('Extraction/consolidation failed:', error);
          // Continue anyway, don't block the interview
        }
      }

      // Get next question
      const { question, audioUrl } = await agentService.getNextQuestion(id);

      return {
        success: true,
        question,
        audioUrl,
        shouldExtract,
      };
    },
  });

  // Manually trigger extraction
  fastify.post('/sessions/:id/extract', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const { id } = request.params as { id: string };
      const body = request.body as any;

      // Verify session ownership
      const session = await prisma.session.findFirst({
        where: { id, personId: user.personId },
      });

      if (!session) {
        return reply.code(404).send({ success: false, error: 'Session not found' });
      }

      // Extract
      const extracted = await extractorService.extractFromSession(id, body.turnIds);

      // Consolidate
      const stats = await consolidatorService.consolidate(user.personId, extracted);

      return {
        success: true,
        extracted,
        stats,
      };
    },
  });
}
