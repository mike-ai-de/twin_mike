import { FastifyInstance } from 'fastify';
import prisma from '../lib/prisma';
import { SearchKBSchema } from '../types';

export async function kbRoutes(fastify: FastifyInstance) {
  // Text search across knowledge base
  fastify.get('/kb/search', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        required: ['q'],
        properties: {
          q: { type: 'string' },
          types: { type: 'string' }, // comma-separated
          limit: { type: 'number', default: 20 },
        },
      },
    },
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const query = request.query as any;
      const searchTerm = `%${query.q}%`;
      const limit = Math.min(query.limit || 20, 100);

      const results: any[] = [];

      // Search facts
      const facts = await prisma.fact.findMany({
        where: {
          personId: user.personId,
          OR: [
            { factType: { contains: query.q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });
      results.push(...facts.map((f) => ({ type: 'fact', ...f })));

      // Search timeline entries
      const timeline = await prisma.timelineEntry.findMany({
        where: {
          personId: user.personId,
          OR: [
            { org: { contains: query.q, mode: 'insensitive' } },
            { role: { contains: query.q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });
      results.push(...timeline.map((t) => ({ type: 'timeline_entry', ...t })));

      // Search skills
      const skills = await prisma.skill.findMany({
        where: {
          personId: user.personId,
          skill: { contains: query.q, mode: 'insensitive' },
        },
        take: limit,
      });
      results.push(...skills.map((s) => ({ type: 'skill', ...s })));

      // Search artifacts
      const artifacts = await prisma.artifact.findMany({
        where: {
          personId: user.personId,
          OR: [
            { title: { contains: query.q, mode: 'insensitive' } },
            { summary: { contains: query.q, mode: 'insensitive' } },
          ],
        },
        take: limit,
      });
      results.push(...artifacts.map((a) => ({ type: 'artifact', ...a })));

      return {
        success: true,
        query: query.q,
        count: results.length,
        results: results.slice(0, limit),
      };
    },
  });

  // Export entire knowledge base
  fastify.get('/kb/export', {
    onRequest: [fastify.authenticate],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          format: { type: 'string', enum: ['json', 'markdown'], default: 'json' },
        },
      },
    },
    handler: async (request, reply) => {
      const user = request.user as { personId: string };
      const query = request.query as any;

      // Get person
      const person = await prisma.person.findUnique({
        where: { id: user.personId },
      });

      // Get all KB data
      const [facts, timeline, skills, preferences, artifacts] = await Promise.all([
        prisma.fact.findMany({ where: { personId: user.personId, validTo: null } }),
        prisma.timelineEntry.findMany({ where: { personId: user.personId }, orderBy: { startDate: 'desc' } }),
        prisma.skill.findMany({ where: { personId: user.personId }, orderBy: { skill: 'asc' } }),
        prisma.preference.findMany({ where: { personId: user.personId } }),
        prisma.artifact.findMany({ where: { personId: user.personId } }),
      ]);

      const kbData = {
        person: {
          id: person?.id,
          displayName: person?.displayName,
          email: person?.email,
        },
        exportedAt: new Date().toISOString(),
        facts,
        timeline,
        skills,
        preferences,
        artifacts,
        stats: {
          factsCount: facts.length,
          timelineCount: timeline.length,
          skillsCount: skills.length,
          preferencesCount: preferences.length,
          artifactsCount: artifacts.length,
        },
      };

      if (query.format === 'markdown') {
        // Generate markdown
        let md = `# Knowledge Base: ${person?.displayName}\n\n`;
        md += `Exported: ${new Date().toISOString()}\n\n`;

        md += `## Career Timeline\n\n`;
        timeline.forEach((t) => {
          md += `### ${t.role} at ${t.org}\n`;
          md += `**Period:** ${t.startDate} - ${t.endDate || 'Present'}\n\n`;
          if (t.responsibilities.length > 0) {
            md += `**Responsibilities:**\n${t.responsibilities.map(r => `- ${r}`).join('\n')}\n\n`;
          }
          if (t.achievements.length > 0) {
            md += `**Achievements:**\n${t.achievements.map(a => `- ${a}`).join('\n')}\n\n`;
          }
        });

        md += `## Skills\n\n`;
        skills.forEach((s) => {
          md += `- **${s.skill}** (Level ${s.level}/5)`;
          if (s.evidence) md += `: ${s.evidence}`;
          md += '\n';
        });

        md += `\n## Facts\n\n`;
        facts.forEach((f) => {
          md += `- **${f.factType}**: ${JSON.stringify(f.value)}\n`;
        });

        reply.header('Content-Type', 'text/markdown');
        reply.header('Content-Disposition', `attachment; filename="kb_export_${Date.now()}.md"`);
        return md;
      }

      // JSON format
      reply.header('Content-Type', 'application/json');
      reply.header('Content-Disposition', `attachment; filename="kb_export_${Date.now()}.json"`);
      return kbData;
    },
  });

  // Get dashboard stats
  fastify.get('/kb/stats', {
    onRequest: [fastify.authenticate],
    handler: async (request, reply) => {
      const user = request.user as { personId: string };

      const [
        factsCount,
        timelineCount,
        skillsCount,
        preferencesCount,
        artifactsCount,
        openQuestionsCount,
        sessionsCount,
      ] = await Promise.all([
        prisma.fact.count({ where: { personId: user.personId, validTo: null } }),
        prisma.timelineEntry.count({ where: { personId: user.personId } }),
        prisma.skill.count({ where: { personId: user.personId } }),
        prisma.preference.count({ where: { personId: user.personId } }),
        prisma.artifact.count({ where: { personId: user.personId } }),
        prisma.openQuestion.count({ where: { personId: user.personId, status: 'open' } }),
        prisma.session.count({ where: { personId: user.personId } }),
      ]);

      return {
        success: true,
        stats: {
          facts: factsCount,
          timeline: timelineCount,
          skills: skillsCount,
          preferences: preferencesCount,
          artifacts: artifactsCount,
          openQuestions: openQuestionsCount,
          sessions: sessionsCount,
        },
      };
    },
  });
}
