import { openaiService } from './openai.service';
import prisma from '../lib/prisma';
import { MODULES } from '../types';
import { readFileSync } from 'fs';
import path from 'path';

const SYSTEM_PROMPT_TEMPLATE = readFileSync(
  path.join(__dirname, '../prompts/system-agent.txt'),
  'utf-8'
);

export class AgentService {
  /**
   * Generate the next interview question
   */
  async getNextQuestion(sessionId: string): Promise<{ question: string; audioUrl: string | null }> {
    // Get session with turns
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        person: true,
        turns: {
          orderBy: { timestamp: 'asc' },
          take: 20, // Last 20 turns for context
        },
      },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Get current module
    const currentModule = session.module || 'profile_header';
    const moduleDefinition = MODULES[currentModule];

    if (!moduleDefinition) {
      throw new Error(`Unknown module: ${currentModule}`);
    }

    // Get open questions for this person
    const openQuestions = await prisma.openQuestion.findMany({
      where: {
        personId: session.personId,
        status: 'open',
      },
      orderBy: [
        { priority: 'asc' }, // H before M before L
        { createdAt: 'asc' },
      ],
      take: 5,
    });

    // Build conversation history
    const conversationHistory = session.turns
      .map((turn) => `${turn.speaker === 'agent' ? 'Agent' : 'User'}: ${turn.transcript}`)
      .join('\n');

    // Build open questions summary
    const openQuestionsSummary = openQuestions.length > 0
      ? openQuestions.map(q => `[${q.priority}] ${q.question}`).join('\n')
      : 'None';

    // Calculate module progress
    const moduleProgress = `${session.turns.filter(t => t.speaker === 'agent').length} / ${moduleDefinition.estimatedTurns} questions`;

    // Replace placeholders in system prompt
    const systemPrompt = SYSTEM_PROMPT_TEMPLATE
      .replace('{{MODULE_NAME}}', moduleDefinition.name)
      .replace('{{MODULE_DESCRIPTION}}', moduleDefinition.description)
      .replace('{{MODULE_INSTRUCTIONS}}', moduleDefinition.promptInstructions)
      .replace('{{PERSON_NAME}}', session.person.displayName)
      .replace('{{SESSION_ID}}', session.id)
      .replace('{{TURN_COUNT}}', session.turns.length.toString())
      .replace('{{MODULE_PROGRESS}}', moduleProgress)
      .replace('{{CONVERSATION_HISTORY}}', conversationHistory || 'No previous turns.')
      .replace('{{OPEN_QUESTIONS}}', openQuestionsSummary);

    // Call LLM
    const question = await openaiService.chatCompletion(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the next interview question.' },
      ],
      {
        model: 'gpt-4o',
        temperature: 0.7,
        maxTokens: 200,
        sessionId: session.id,
      }
    );

    // Generate audio (TTS)
    let audioUrl: string | null = null;
    try {
      audioUrl = await openaiService.synthesizeSpeech(question, 'nova');
    } catch (error) {
      console.error('TTS failed, returning text only:', error);
    }

    // Save agent turn
    await prisma.turn.create({
      data: {
        sessionId: session.id,
        speaker: 'agent',
        transcript: question,
        audioUrl: audioUrl,
        status: 'completed',
      },
    });

    return { question, audioUrl };
  }

  /**
   * Check if current block is complete and should trigger extraction
   */
  async shouldTriggerExtraction(sessionId: string): Promise<boolean> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        turns: {
          where: { speaker: 'agent' },
          orderBy: { timestamp: 'desc' },
        },
        summaries: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!session) return false;

    const currentModule = session.module || 'profile_header';
    const moduleDefinition = MODULES[currentModule];

    // Get turns since last summary
    const lastSummary = session.summaries[0];
    const turnsToExtract = await prisma.turn.findMany({
      where: {
        sessionId: session.id,
        timestamp: lastSummary ? { gt: lastSummary.createdAt } : undefined,
      },
      orderBy: { timestamp: 'asc' },
    });

    // Trigger if we have enough turns
    const agentTurnsCount = turnsToExtract.filter(t => t.speaker === 'agent').length;
    return agentTurnsCount >= moduleDefinition.estimatedTurns;
  }

  /**
   * Advance to next module
   */
  async advanceModule(sessionId: string): Promise<string | null> {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    const currentModule = session.module || 'profile_header';
    const moduleKeys = Object.keys(MODULES);
    const currentIndex = moduleKeys.indexOf(currentModule);

    if (currentIndex === -1 || currentIndex >= moduleKeys.length - 1) {
      // No more modules, mark session as completed
      await prisma.session.update({
        where: { id: sessionId },
        data: { status: 'completed', endedAt: new Date() },
      });
      return null;
    }

    const nextModule = moduleKeys[currentIndex + 1];
    await prisma.session.update({
      where: { id: sessionId },
      data: { module: nextModule },
    });

    return nextModule;
  }
}

export const agentService = new AgentService();
