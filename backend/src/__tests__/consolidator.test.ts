import { describe, it, expect, beforeEach } from 'vitest';
import { ConsolidatorService } from '../services/consolidator.service';
import prisma from '../lib/prisma';

describe('ConsolidatorService', () => {
  const consolidator = new ConsolidatorService();
  let testPersonId: string;

  beforeEach(async () => {
    // Create test person
    const person = await prisma.person.create({
      data: {
        email: 'test-consolidator@example.com',
        displayName: 'Test User',
      },
    });
    testPersonId = person.id;
  });

  it('should create new fact when none exists', async () => {
    const extraction = {
      module: 'profile_header' as const,
      facts: [
        {
          fact_type: 'current_role',
          value: { title: 'Product Manager', company: 'TestCorp' },
          confidence: 1.0,
          source_turn_ids: ['turn_123'],
        },
      ],
      timeline_entries: [],
      skills: [],
      preferences: [],
      artifacts: [],
      open_questions: [],
      risks_or_contradictions: [],
    };

    const stats = await consolidator.consolidate(testPersonId, extraction);

    expect(stats.created.facts).toBe(1);
    expect(stats.updated.facts).toBe(0);

    const fact = await prisma.fact.findFirst({
      where: { personId: testPersonId, factType: 'current_role' },
    });

    expect(fact).toBeTruthy();
    expect(fact?.value).toEqual({ title: 'Product Manager', company: 'TestCorp' });
  });

  it('should update existing fact with higher confidence', async () => {
    // Create initial fact
    await prisma.fact.create({
      data: {
        personId: testPersonId,
        factType: 'location',
        value: { city: 'Berlin' },
        confidence: 0.8,
        sourceTurnIds: ['turn_1'],
      },
    });

    // Extract updated fact
    const extraction = {
      module: 'profile_header' as const,
      facts: [
        {
          fact_type: 'location',
          value: { city: 'Berlin', country: 'Germany' },
          confidence: 0.9,
          source_turn_ids: ['turn_2'],
        },
      ],
      timeline_entries: [],
      skills: [],
      preferences: [],
      artifacts: [],
      open_questions: [],
      risks_or_contradictions: [],
    };

    const stats = await consolidator.consolidate(testPersonId, extraction);

    expect(stats.updated.facts).toBeGreaterThan(0);

    const fact = await prisma.fact.findFirst({
      where: { personId: testPersonId, factType: 'location' },
    });

    expect(fact?.value).toEqual({ city: 'Berlin', country: 'Germany' });
    expect(fact?.sourceTurnIds).toContain('turn_1');
    expect(fact?.sourceTurnIds).toContain('turn_2');
  });

  it('should merge timeline entry responsibilities', async () => {
    // Create initial timeline entry
    await prisma.timelineEntry.create({
      data: {
        personId: testPersonId,
        startDate: '2022-01',
        org: 'TestCorp',
        role: 'PM',
        responsibilities: ['Planning'],
        achievements: [],
        confidence: 0.9,
        sourceTurnIds: ['turn_1'],
      },
    });

    // Extract additional responsibilities
    const extraction = {
      module: 'timeline' as const,
      facts: [],
      timeline_entries: [
        {
          start_date: '2022-01',
          end_date: null,
          org: 'TestCorp',
          role: 'PM',
          responsibilities: ['Execution', 'Reporting'],
          achievements: ['Increased MRR by 20%'],
          kpis: null,
          reason_for_change: null,
          confidence: 0.9,
          source_turn_ids: ['turn_2'],
        },
      ],
      skills: [],
      preferences: [],
      artifacts: [],
      open_questions: [],
      risks_or_contradictions: [],
    };

    const stats = await consolidator.consolidate(testPersonId, extraction);

    expect(stats.updated.timeline).toBeGreaterThan(0);

    const entry = await prisma.timelineEntry.findFirst({
      where: { personId: testPersonId, org: 'TestCorp' },
    });

    expect(entry?.responsibilities).toContain('Planning');
    expect(entry?.responsibilities).toContain('Execution');
    expect(entry?.responsibilities).toContain('Reporting');
    expect(entry?.achievements).toContain('Increased MRR by 20%');
  });

  it('should create skill with correct level', async () => {
    const extraction = {
      module: 'skills' as const,
      facts: [],
      timeline_entries: [],
      skills: [
        {
          skill: 'Product Management',
          level: 5,
          evidence: '10 years experience',
          tags: ['product', 'management'],
          confidence: 1.0,
          source_turn_ids: ['turn_123'],
        },
      ],
      preferences: [],
      artifacts: [],
      open_questions: [],
      risks_or_contradictions: [],
    };

    const stats = await consolidator.consolidate(testPersonId, extraction);

    expect(stats.created.skills).toBe(1);

    const skill = await prisma.skill.findFirst({
      where: { personId: testPersonId, skill: 'Product Management' },
    });

    expect(skill?.level).toBe(5);
    expect(skill?.evidence).toBe('10 years experience');
  });

  it('should update skill level if new is higher', async () => {
    // Create initial skill
    await prisma.skill.create({
      data: {
        personId: testPersonId,
        skill: 'Data Analysis',
        level: 3,
        confidence: 0.8,
        sourceTurnIds: ['turn_1'],
      },
    });

    // Extract higher level
    const extraction = {
      module: 'skills' as const,
      facts: [],
      timeline_entries: [],
      skills: [
        {
          skill: 'Data Analysis',
          level: 4,
          evidence: 'Advanced SQL and Python',
          tags: ['technical'],
          confidence: 0.9,
          source_turn_ids: ['turn_2'],
        },
      ],
      preferences: [],
      artifacts: [],
      open_questions: [],
      risks_or_contradictions: [],
    };

    const stats = await consolidator.consolidate(testPersonId, extraction);

    expect(stats.updated.skills).toBeGreaterThan(0);

    const skill = await prisma.skill.findFirst({
      where: { personId: testPersonId, skill: 'Data Analysis' },
    });

    expect(skill?.level).toBe(4);
  });
});
