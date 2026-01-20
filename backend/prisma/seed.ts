import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create test person
  const person = await prisma.person.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      displayName: 'Test User',
    },
  });

  console.log(`✓ Created person: ${person.displayName} (${person.email})`);

  // Create example session
  const session = await prisma.session.create({
    data: {
      personId: person.id,
      module: 'profile_header',
      status: 'completed',
      endedAt: new Date(),
    },
  });

  console.log(`✓ Created session: ${session.id}`);

  // Create example turns
  const turns = await prisma.turn.createMany({
    data: [
      {
        sessionId: session.id,
        speaker: 'agent',
        transcript: 'Hello! Let\'s start building your knowledge base. Can you tell me about your current role?',
        timestamp: new Date('2024-01-15T10:00:00Z'),
      },
      {
        sessionId: session.id,
        speaker: 'user',
        transcript: 'I\'m currently a Senior Product Manager at TechCorp, based in Berlin. I\'ve been in this role for about 2 years.',
        timestamp: new Date('2024-01-15T10:00:30Z'),
      },
      {
        sessionId: session.id,
        speaker: 'agent',
        transcript: 'Great! What are your main responsibilities in this role?',
        timestamp: new Date('2024-01-15T10:01:00Z'),
      },
      {
        sessionId: session.id,
        speaker: 'user',
        transcript: 'I lead a team of 5 product managers, managing our B2B SaaS platform. I\'m responsible for roadmap planning, stakeholder management, and strategic initiatives.',
        timestamp: new Date('2024-01-15T10:01:45Z'),
      },
      {
        sessionId: session.id,
        speaker: 'agent',
        transcript: 'Can you share some specific achievements or KPIs you\'ve impacted?',
        timestamp: new Date('2024-01-15T10:02:15Z'),
      },
      {
        sessionId: session.id,
        speaker: 'user',
        transcript: 'Sure! I increased our monthly recurring revenue by 40% year-over-year. I also reduced customer churn from 8% to 4% by implementing a new onboarding process.',
        timestamp: new Date('2024-01-15T10:03:00Z'),
      },
    ],
  });

  console.log(`✓ Created ${turns.count} turns`);

  // Create example facts
  await prisma.fact.createMany({
    data: [
      {
        personId: person.id,
        factType: 'current_role',
        value: { title: 'Senior Product Manager', company: 'TechCorp' },
        confidence: 1.0,
        sourceTurnIds: [],
      },
      {
        personId: person.id,
        factType: 'location',
        value: { city: 'Berlin', country: 'Germany' },
        confidence: 1.0,
        sourceTurnIds: [],
      },
    ],
  });

  console.log('✓ Created example facts');

  // Create example timeline entry
  await prisma.timelineEntry.create({
    data: {
      personId: person.id,
      startDate: '2022-01',
      endDate: null,
      org: 'TechCorp',
      role: 'Senior Product Manager',
      responsibilities: [
        'Lead team of 5 product managers',
        'Manage B2B SaaS platform',
        'Roadmap planning and strategic initiatives',
        'Stakeholder management',
      ],
      achievements: [
        'Increased MRR by 40% YoY',
        'Reduced churn from 8% to 4%',
        'Implemented new onboarding process',
      ],
      kpis: [
        { name: 'MRR Growth', value: '+40% YoY' },
        { name: 'Churn Reduction', value: '8% → 4%' },
      ],
      confidence: 0.9,
      sourceTurnIds: [],
    },
  });

  console.log('✓ Created example timeline entry');

  // Create example skills
  await prisma.skill.createMany({
    data: [
      {
        personId: person.id,
        skill: 'Product Management',
        level: 5,
        evidence: 'Senior PM role with 8+ years experience',
        tags: ['product', 'management', 'leadership'],
        confidence: 1.0,
        sourceTurnIds: [],
      },
      {
        personId: person.id,
        skill: 'Stakeholder Management',
        level: 4,
        evidence: 'Managing executive stakeholders and cross-functional teams',
        tags: ['communication', 'leadership'],
        confidence: 0.9,
        sourceTurnIds: [],
      },
      {
        personId: person.id,
        skill: 'Data Analysis',
        level: 4,
        evidence: 'KPI tracking and data-driven decision making',
        tags: ['analytics', 'technical'],
        confidence: 0.8,
        sourceTurnIds: [],
      },
    ],
  });

  console.log('✓ Created example skills');

  // Create example open questions
  await prisma.openQuestion.createMany({
    data: [
      {
        personId: person.id,
        module: 'timeline',
        question: 'What were your roles before TechCorp?',
        priority: 'H',
        status: 'open',
        sourceTurnIds: [],
      },
      {
        personId: person.id,
        module: 'skills',
        question: 'What technical tools and frameworks are you proficient in?',
        priority: 'M',
        status: 'open',
        sourceTurnIds: [],
      },
    ],
  });

  console.log('✓ Created example open questions');

  // Create summary
  await prisma.summary.create({
    data: {
      sessionId: session.id,
      module: 'profile_header',
      summaryText: 'Extracted current role, location, and basic professional information',
      extractedJson: {
        module: 'profile_header',
        facts: [],
        timeline_entries: [],
        skills: [],
        preferences: [],
        artifacts: [],
        open_questions: [],
        risks_or_contradictions: [],
      },
    },
  });

  console.log('✓ Created summary');

  console.log('\n✅ Seeding complete!');
  console.log(`\nTest credentials:`);
  console.log(`Email: ${person.email}`);
  console.log(`\nUse magic link auth to login.`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seeding failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
