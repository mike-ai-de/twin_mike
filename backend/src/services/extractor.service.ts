import { openaiService } from './openai.service';
import prisma from '../lib/prisma';
import { ExtractionOutputSchema, ExtractionOutput, MODULES } from '../types';
import { readFileSync } from 'fs';
import path from 'path';

const EXTRACTOR_PROMPT_TEMPLATE = readFileSync(
  path.join(__dirname, '../prompts/system-extractor.txt'),
  'utf-8'
);

export class ExtractorService {
  /**
   * Extract structured data from conversation turns
   */
  async extractFromSession(sessionId: string, turnIds?: string[]): Promise<ExtractionOutput> {
    // Get session with person
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { person: true },
    });

    if (!session) {
      throw new Error('Session not found');
    }

    // Get turns to extract
    let turns;
    if (turnIds && turnIds.length > 0) {
      turns = await prisma.turn.findMany({
        where: { id: { in: turnIds }, sessionId },
        orderBy: { timestamp: 'asc' },
      });
    } else {
      // Get turns since last summary
      const lastSummary = await prisma.summary.findFirst({
        where: { sessionId },
        orderBy: { createdAt: 'desc' },
      });

      turns = await prisma.turn.findMany({
        where: {
          sessionId,
          timestamp: lastSummary ? { gt: lastSummary.createdAt } : undefined,
        },
        orderBy: { timestamp: 'asc' },
      });
    }

    if (turns.length === 0) {
      throw new Error('No turns to extract');
    }

    // Get current module
    const currentModule = session.module || 'profile_header';
    const moduleDefinition = MODULES[currentModule];

    // Format turns for extraction
    const turnsText = turns
      .map((t) => `[Turn ${t.id}] ${t.speaker === 'agent' ? 'Agent' : 'User'}: ${t.transcript}`)
      .join('\n\n');

    // Get existing KB summary for deduplication
    const existingKBSummary = await this.getExistingKBSummary(session.personId, currentModule);

    // Build extraction prompt
    const extractorPrompt = EXTRACTOR_PROMPT_TEMPLATE
      .replace('{{MODULE_NAME}}', currentModule)
      .replace('{{EXPECTED_TYPES}}', this.getExpectedTypes(currentModule))
      .replace('{{TURNS_TO_EXTRACT}}', turnsText)
      .replace('{{EXISTING_KB_SUMMARY}}', existingKBSummary);

    // Call LLM with JSON mode
    const rawJson = await openaiService.chatCompletion(
      [
        { role: 'system', content: extractorPrompt },
        { role: 'user', content: 'Extract structured data from the conversation turns.' },
      ],
      {
        model: 'gpt-4o',
        temperature: 0.1, // Low temperature for consistency
        maxTokens: 3000,
        jsonMode: true,
        sessionId: session.id,
      }
    );

    // Parse and validate
    let extractedData: ExtractionOutput;
    try {
      const parsed = JSON.parse(rawJson);
      extractedData = ExtractionOutputSchema.parse(parsed);
    } catch (error) {
      console.error('Extraction parsing error:', error);
      console.error('Raw JSON:', rawJson);
      throw new Error('Failed to parse extraction output');
    }

    // Save summary
    await prisma.summary.create({
      data: {
        sessionId: session.id,
        module: currentModule,
        summaryText: `Extracted ${extractedData.facts.length} facts, ${extractedData.timeline_entries.length} timeline entries, ${extractedData.skills.length} skills`,
        extractedJson: extractedData as any,
      },
    });

    return extractedData;
  }

  /**
   * Get existing KB summary for deduplication context
   */
  private async getExistingKBSummary(personId: string, module: string): Promise<string> {
    const counts = await Promise.all([
      prisma.fact.count({ where: { personId } }),
      prisma.timelineEntry.count({ where: { personId } }),
      prisma.skill.count({ where: { personId } }),
      prisma.preference.count({ where: { personId } }),
      prisma.artifact.count({ where: { personId } }),
    ]);

    const [factCount, timelineCount, skillCount, prefCount, artifactCount] = counts;

    let summary = `Existing KB entries for this person:\n`;
    summary += `- Facts: ${factCount}\n`;
    summary += `- Timeline Entries: ${timelineCount}\n`;
    summary += `- Skills: ${skillCount}\n`;
    summary += `- Preferences: ${prefCount}\n`;
    summary += `- Artifacts: ${artifactCount}\n`;

    // For timeline module, include existing timeline entries
    if (module === 'timeline' && timelineCount > 0) {
      const entries = await prisma.timelineEntry.findMany({
        where: { personId },
        orderBy: { startDate: 'desc' },
        take: 10,
      });

      summary += `\nExisting timeline entries (to avoid duplicates):\n`;
      entries.forEach((e) => {
        summary += `- ${e.org}, ${e.role} (${e.startDate} - ${e.endDate || 'current'})\n`;
      });
    }

    // For skills module, include existing skills
    if (module === 'skills' && skillCount > 0) {
      const skills = await prisma.skill.findMany({
        where: { personId },
        orderBy: { skill: 'asc' },
        take: 20,
      });

      summary += `\nExisting skills (to avoid duplicates):\n`;
      skills.forEach((s) => {
        summary += `- ${s.skill} (level ${s.level})\n`;
      });
    }

    return summary;
  }

  /**
   * Get expected extraction types for module
   */
  private getExpectedTypes(module: string): string {
    const typeMap: Record<string, string> = {
      profile_header: 'facts (current_role, location, education, certifications)',
      timeline: 'timeline_entries, facts (career milestones)',
      skills: 'skills, preferences (work style)',
      principles: 'preferences (leadership, communication)',
      assets: 'artifacts (templates, processes, playbooks)',
      stakeholders: 'facts (key relationships)',
      goals: 'preferences (career goals, aspirations)',
    };

    return typeMap[module] || 'all types';
  }
}

export const extractorService = new ExtractorService();
