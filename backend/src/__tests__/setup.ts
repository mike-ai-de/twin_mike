import { beforeAll, afterAll, afterEach } from 'vitest';
import prisma from '../lib/prisma';

// Setup before all tests
beforeAll(async () => {
  // Ensure test database is ready
  await prisma.$connect();
});

// Cleanup after each test
afterEach(async () => {
  // Clean up test data
  const tables = ['turn', 'session', 'fact', 'timeline_entry', 'skill', 'preference', 'artifact', 'open_question', 'person'];

  for (const table of tables) {
    await prisma.$executeRawUnsafe(`DELETE FROM ${table} WHERE email LIKE '%test%' OR display_name LIKE '%Test%'`);
  }
});

// Cleanup after all tests
afterAll(async () => {
  await prisma.$disconnect();
});
