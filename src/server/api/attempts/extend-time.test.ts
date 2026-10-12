import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

const studentId = '11111111-1111-4111-8111-111111111111';
const testId = '22222222-2222-4222-8222-222222222222';
const qId = '33333333-3333-4333-8333-333333333333';
const attemptId = '44444444-4444-4444-8444-444444444444';

let pg: PGlite;
let db: Db;

vi.mock('@/lib/auth', () => ({
  apiSession: vi.fn(async () => ({
    userId: studentId,
    username: 'student1',
    fullName: 'Student One',
    role: 'student',
  })),
  getSession: vi.fn(async () => ({
    userId: studentId,
    username: 'student1',
    fullName: 'Student One',
    role: 'student',
  })),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

describe('Time Extension and Auto-Submit Features', () => {
  beforeAll(async () => {
    pg = await PGlite.create();
    const files = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.sql'))
      .map((e) => e.name)
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await pg.exec(sql);
    }

    db = drizzle(pg, { schema }) as Db;

    // Seed student profile
    await db.insert(schema.profiles).values({
      id: studentId,
      username: 'student1',
      fullName: 'Student One',
      email: 'student1@example.com',
      role: 'student',
    });

    // Seed test
    await db.insert(schema.tests).values({
      id: testId,
      title: 'Practice Test',
      durationS: 3600,
      createdBy: studentId,
    });

    // Seed question
    await db.insert(schema.questions).values({
      id: qId,
      body: 'What is 2+2?',
      type: 'mcq',
      subject: 'maths',
      options: [
        { key: 'A', body: '3' },
        { key: 'B', body: '4' },
      ],
      answer: { key: 'B' },
      solution: '2 + 2 = 4',
      status: 'verified',
    });

    await db.insert(schema.testQuestions).values({
      testId,
      questionId: qId,
      position: 1,
    });

    // Seed attempt
    await db.insert(schema.attempts).values({
      id: attemptId,
      testId,
      studentId,
      attemptNo: 1,
      startedAt: new Date(),
      deadlineAt: new Date(Date.now() + 600 * 1000), // 10 mins from now
      status: 'in_progress',
      questionOrder: [qId],
      timeExtensionsCount: 0,
    });

    await db.insert(schema.attemptAnswers).values({
      attemptId,
      questionId: qId,
      state: 'answered',
      response: { key: 'B' },
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('allows extending time twice by 10 minutes each', async () => {
    const { POST: extendTime } = await import('./extend-time');

    // 1st Extension
    const req1 = new Request(`http://localhost/api/attempts/${attemptId}/extend-time`, {
      method: 'POST',
    });
    const res1 = await extendTime(req1, { params: Promise.resolve({ id: attemptId }) } as never);
    const body1 = await res1.json();

    expect(res1.status).toBe(200);
    expect(body1.ok).toBe(true);
    expect(body1.timeExtensionsCount).toBe(1);
    expect(body1.remainingExtensions).toBe(1);

    // 2nd Extension
    const req2 = new Request(`http://localhost/api/attempts/${attemptId}/extend-time`, {
      method: 'POST',
    });
    const res2 = await extendTime(req2, { params: Promise.resolve({ id: attemptId }) } as never);
    const body2 = await res2.json();

    expect(res2.status).toBe(200);
    expect(body2.ok).toBe(true);
    expect(body2.timeExtensionsCount).toBe(2);
    expect(body2.remainingExtensions).toBe(0);

    // 3rd Extension attempt must be rejected
    const req3 = new Request(`http://localhost/api/attempts/${attemptId}/extend-time`, {
      method: 'POST',
    });
    const res3 = await extendTime(req3, { params: Promise.resolve({ id: attemptId }) } as never);
    expect(res3.status).toBe(400);
    const body3 = await res3.json();
    expect(body3.error).toBe('max_extensions_reached');
  });

  it('submits with auto_submitted status when autoSubmitted flag is true', async () => {
    const { POST: submitAttempt } = await import('./submit');

    const req = new Request(`http://localhost/api/attempts/${attemptId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        autoSubmitted: true,
        autoSubmitReason: 'popup_timeout_60s',
      }),
    });

    const res = await submitAttempt(req, { params: Promise.resolve({ id: attemptId }) } as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe('auto_submitted');

    // Check in database
    const [row] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attemptId));
    expect(row.status).toBe('auto_submitted');
  });
});
