import prisma from '../lib/prisma';
import { ExtractionOutput } from '../types';
import { Prisma } from '@prisma/client';

export class ConsolidatorService {
  /**
   * Consolidate extracted data into knowledge base
   */
  async consolidate(personId: string, extraction: ExtractionOutput): Promise<{
    created: { facts: number; timeline: number; skills: number; preferences: number; artifacts: number; openQuestions: number };
    updated: { facts: number; timeline: number; skills: number; preferences: number };
  }> {
    const stats = {
      created: { facts: 0, timeline: 0, skills: 0, preferences: 0, artifacts: 0, openQuestions: 0 },
      updated: { facts: 0, timeline: 0, skills: 0, preferences: 0 },
    };

    // Process facts
    for (const fact of extraction.facts) {
      const result = await this.consolidateFact(personId, fact);
      if (result === 'created') stats.created.facts++;
      if (result === 'updated') stats.updated.facts++;
    }

    // Process timeline entries
    for (const entry of extraction.timeline_entries) {
      const result = await this.consolidateTimelineEntry(personId, entry);
      if (result === 'created') stats.created.timeline++;
      if (result === 'updated') stats.updated.timeline++;
    }

    // Process skills
    for (const skill of extraction.skills) {
      const result = await this.consolidateSkill(personId, skill);
      if (result === 'created') stats.created.skills++;
      if (result === 'updated') stats.updated.skills++;
    }

    // Process preferences
    for (const pref of extraction.preferences) {
      const result = await this.consolidatePreference(personId, pref);
      if (result === 'created') stats.created.preferences++;
      if (result === 'updated') stats.updated.preferences++;
    }

    // Process artifacts (always create new)
    for (const artifact of extraction.artifacts) {
      await prisma.artifact.create({
        data: {
          personId,
          artifactType: artifact.artifact_type,
          title: artifact.title,
          summary: artifact.summary || null,
          contentRef: artifact.content_ref || null,
          tags: artifact.tags,
          sourceTurnIds: artifact.source_turn_ids,
        },
      });
      stats.created.artifacts++;
    }

    // Process open questions
    for (const question of extraction.open_questions) {
      await prisma.openQuestion.create({
        data: {
          personId,
          module: question.module,
          question: question.question,
          priority: question.priority,
          reason: question.reason || null,
          sourceTurnIds: [], // Will be filled when answered
        },
      });
      stats.created.openQuestions++;
    }

    return stats;
  }

  /**
   * Consolidate a single fact (merge or create)
   */
  private async consolidateFact(personId: string, fact: any): Promise<'created' | 'updated' | 'skipped'> {
    // Check for existing fact of same type
    const existing = await prisma.fact.findFirst({
      where: {
        personId,
        factType: fact.fact_type,
        validTo: null, // Currently valid
      },
    });

    if (!existing) {
      // Create new
      await prisma.fact.create({
        data: {
          personId,
          factType: fact.fact_type,
          value: fact.value as Prisma.JsonObject,
          confidence: fact.confidence,
          sourceTurnIds: fact.source_turn_ids,
        },
      });
      return 'created';
    }

    // Check if values are significantly different
    const valuesDiffer = JSON.stringify(existing.value) !== JSON.stringify(fact.value);

    if (valuesDiffer) {
      // Update existing with higher confidence or newer data
      if (fact.confidence >= existing.confidence) {
        await prisma.fact.update({
          where: { id: existing.id },
          data: {
            value: fact.value as Prisma.JsonObject,
            confidence: Math.min(1.0, existing.confidence + 0.1), // Corroboration boost
            sourceTurnIds: [...new Set([...existing.sourceTurnIds, ...fact.source_turn_ids])],
            version: existing.version + 1,
          },
        });
        return 'updated';
      }
    } else {
      // Same value, just boost confidence and add sources
      await prisma.fact.update({
        where: { id: existing.id },
        data: {
          confidence: Math.min(1.0, existing.confidence + 0.1),
          sourceTurnIds: [...new Set([...existing.sourceTurnIds, ...fact.source_turn_ids])],
        },
      });
      return 'updated';
    }

    return 'skipped';
  }

  /**
   * Consolidate a timeline entry
   */
  private async consolidateTimelineEntry(personId: string, entry: any): Promise<'created' | 'updated' | 'skipped'> {
    // Check for existing entry with same org and overlapping dates
    const existing = await prisma.timelineEntry.findFirst({
      where: {
        personId,
        org: entry.org,
        // Fuzzy date matching
        OR: [
          { startDate: entry.start_date },
          { endDate: entry.end_date },
        ],
      },
    });

    if (!existing) {
      // Create new
      await prisma.timelineEntry.create({
        data: {
          personId,
          startDate: entry.start_date,
          endDate: entry.end_date || null,
          org: entry.org,
          role: entry.role,
          responsibilities: entry.responsibilities,
          achievements: entry.achievements,
          kpis: entry.kpis ? (entry.kpis as Prisma.JsonArray) : null,
          reasonForChange: entry.reason_for_change || null,
          confidence: entry.confidence,
          sourceTurnIds: entry.source_turn_ids,
        },
      });
      return 'created';
    }

    // Merge responsibilities and achievements
    const mergedResponsibilities = [...new Set([...existing.responsibilities, ...entry.responsibilities])];
    const mergedAchievements = [...new Set([...existing.achievements, ...entry.achievements])];

    await prisma.timelineEntry.update({
      where: { id: existing.id },
      data: {
        responsibilities: mergedResponsibilities,
        achievements: mergedAchievements,
        kpis: entry.kpis ? (entry.kpis as Prisma.JsonArray) : existing.kpis,
        confidence: Math.min(1.0, existing.confidence + 0.1),
        sourceTurnIds: [...new Set([...existing.sourceTurnIds, ...entry.source_turn_ids])],
        version: existing.version + 1,
      },
    });
    return 'updated';
  }

  /**
   * Consolidate a skill
   */
  private async consolidateSkill(personId: string, skill: any): Promise<'created' | 'updated' | 'skipped'> {
    // Normalize skill name (case-insensitive)
    const normalizedSkill = skill.skill.toLowerCase().trim();

    const existing = await prisma.skill.findFirst({
      where: {
        personId,
        skill: {
          equals: skill.skill,
          mode: 'insensitive',
        },
      },
    });

    if (!existing) {
      // Create new
      await prisma.skill.create({
        data: {
          personId,
          skill: skill.skill,
          level: skill.level,
          evidence: skill.evidence || null,
          tags: skill.tags,
          confidence: skill.confidence,
          sourceTurnIds: skill.source_turn_ids,
        },
      });
      return 'created';
    }

    // Update level if new data is more confident or level is higher
    const shouldUpdateLevel = skill.confidence >= existing.confidence || skill.level > existing.level;

    // Merge tags
    const mergedTags = [...new Set([...existing.tags, ...skill.tags])];

    await prisma.skill.update({
      where: { id: existing.id },
      data: {
        level: shouldUpdateLevel ? skill.level : existing.level,
        evidence: skill.evidence || existing.evidence,
        tags: mergedTags,
        confidence: Math.min(1.0, existing.confidence + 0.1),
        sourceTurnIds: [...new Set([...existing.sourceTurnIds, ...skill.source_turn_ids])],
        version: existing.version + 1,
      },
    });
    return 'updated';
  }

  /**
   * Consolidate a preference
   */
  private async consolidatePreference(personId: string, pref: any): Promise<'created' | 'updated' | 'skipped'> {
    const existing = await prisma.preference.findFirst({
      where: {
        personId,
        category: pref.category,
      },
    });

    if (!existing) {
      // Create new
      await prisma.preference.create({
        data: {
          personId,
          category: pref.category,
          value: pref.value as Prisma.JsonObject,
          confidence: pref.confidence,
          sourceTurnIds: pref.source_turn_ids,
        },
      });
      return 'created';
    }

    // Merge values (assuming additive)
    const mergedValue = { ...existing.value, ...pref.value };

    await prisma.preference.update({
      where: { id: existing.id },
      data: {
        value: mergedValue as Prisma.JsonObject,
        confidence: Math.min(1.0, existing.confidence + 0.1),
        sourceTurnIds: [...new Set([...existing.sourceTurnIds, ...pref.source_turn_ids])],
        version: existing.version + 1,
      },
    });
    return 'updated';
  }
}

export const consolidatorService = new ConsolidatorService();
