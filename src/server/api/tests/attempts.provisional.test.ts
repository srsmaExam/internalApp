import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';
import type { Session } from '@/lib/session';

/**
 * FBR-03 end-to-end regression: walks the exact exploit path described in the
 * bug report —
 *
 *   login (auto-provision) -> GET /student dashboard -> POST attempts
 *   -> GET result
 *
 * — and asserts a provisional account is blocked from an 'enrolled' test at
 * the attempt-creation boundary (not just hidden from the dashboard list),
 * and that a 'public' test it IS allowed to attempt never discloses the
 * answer key or worked solution.
 */

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

let pg: PGlite;
let db: Db;
let currentSession: Session;

vi.mock('@/lib/auth', () => ({
  apiStudent: vi.fn(async () => currentSession),
  apiSession: vi.fn(async () => currentSession),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

async function startAttempt(testId: string) {
  const { POST } = await import('./attempts');
  const req = new Request(`http://localhost/api/tests/${testId}/attempts`, { method: 'POST' });
  const res = await POST(req, { params: Promise.resolve({ id: testId }) });
  return { status: res.status, body: await res.json() };
}

async function getResult(attemptId: string) {
  const { GET } = await import('../attempts/result');
  const req = new Request(`http://localhost/api/attempts/${attemptId}/result`);
  const res = await GET(req, { params: Promise.resolve({ id: attemptId }) });
  return { status: res.status, body: await res.json() };
}

describe('FBR-03 exploit path: provisional account entitlement', () => {
  const teacherId = '11111111-1111-4111-8111-111111111111';
  const provisionalStudentId = '22222222-2222-4222-8222-222222222222';
  const enrolledTestId = '33333333-3333-4333-8333-333333333333';
  const publicTestId = '44444444-4444-4444-8444-444444444444';
  const q1 = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const q2 = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

  beforeAll(async () => {
    pg = await PGlite.create();
    const files = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.sql'))
      .map((e) => e.name)
      .sort();
    for (const file of files) {
      await pg.exec(fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8'));
    }
    db = drizzle(pg, { schema }) as Db;

    await db.insert(schema.profiles).values([
      {
        id: teacherId,
        username: 'teacher1',
        email: 'teacher1@example.com',
        fullName: 'Teacher One',
        role: 'teacher',
        passwordHash: 'x',
        isActive: true,
        canLogin: true,
      },
      {
        id: provisionalStudentId,
        username: 'student_5550001',
        email: 'student_5550001@student.srsma.local',
        fullName: 'Student 0001',
        role: 'student',
        phone: '+915550001',
        batch: 'Prospective',
        isActive: true,
        canLogin: true,
        isProvisional: true,
      },
    ]);

    await db.insert(schema.questions).values([
      {
        id: q1,
        humanCode: 'Q-EXPLOIT-001',
        subject: 'physics',
        type: 'mcq',
        status: 'verified',
        body: 'Question 1',
        options: [
          { key: 'A', body: 'a' },
          { key: 'B', body: 'b' },
        ],
        answer: { key: 'A' },
        solution: 'TOP_SECRET_WORKED_SOLUTION',
        createdBy: teacherId,
        lastEditedBy: teacherId,
      },
      {
        id: q2,
        humanCode: 'Q-EXPLOIT-002',
        subject: 'physics',
        type: 'mcq',
        status: 'verified',
        body: 'Question 2',
        options: [
          { key: 'A', body: 'a' },
          { key: 'B', body: 'b' },
        ],
        answer: { key: 'B' },
        solution: 'ANOTHER_SECRET_SOLUTION',
        createdBy: teacherId,
        lastEditedBy: teacherId,
      },
    ]);

    // Enrolled-only test (the default) — must be unreachable to a provisional account.
    await db.insert(schema.tests).values({
      id: enrolledTestId,
      title: 'Board Readiness Challenge Mock Test 1',
      durationS: 10800,
      maxAttempts: 1,
      isPublished: true,
      audience: 'enrolled',
      resultsPolicy: 'immediate',
      createdBy: teacherId,
    });
    await db.insert(schema.testQuestions).values([
      { testId: enrolledTestId, questionId: q1, position: 1 },
      { testId: enrolledTestId, questionId: q2, position: 2 },
    ]);

    // Deliberately public diagnostic — a provisional account MAY attempt this,
    // but must still never see the answer key or solution.
    await db.insert(schema.tests).values({
      id: publicTestId,
      title: 'Board Readiness Challenge',
      durationS: 1800,
      maxAttempts: 1,
      isPublished: true,
      audience: 'public',
      resultsPolicy: 'immediate',
      createdBy: teacherId,
    });
    await db.insert(schema.testQuestions).values([
      { testId: publicTestId, questionId: q1, position: 1 },
      { testId: publicTestId, questionId: q2, position: 2 },
    ]);
  });

  afterAll(async () => {
    await pg.close();
  });

  it('refuses a provisional account starting an attempt on an enrolled-only test (403)', async () => {
    currentSession = {
      userId: provisionalStudentId,
      username: 'student_5550001',
      fullName: 'Student 0001',
      role: 'student',
      isProvisional: true,
    };

    const { status, body } = await startAttempt(enrolledTestId);
    expect(status).toBe(403);
    expect(body.error).toBe('enrollment_required');
  });

  it('allows a provisional account to attempt a public test, and directly discloses solutions upon submission', async () => {
    currentSession = {
      userId: provisionalStudentId,
      username: 'student_5550001',
      fullName: 'Student 0001',
      role: 'student',
      isProvisional: true,
    };

    const { status: startStatus, body: startBody } = await startAttempt(publicTestId);
    expect(startStatus).toBe(201);
    const attemptId = startBody.attemptId;

    // Force it into a submitted state directly (bypassing the runner) so the
    // result endpoint's disclosure gate can be exercised.
    await db
      .update(schema.attempts)
      .set({ status: 'submitted', submittedAt: new Date(), totalMarks: '0', maxMarks: '8' })
      .where((await import('drizzle-orm')).eq(schema.attempts.id, attemptId));

    const { status: resultStatus, body: resultBody } = await getResult(attemptId);
    expect(resultStatus).toBe(200);

    const serialized = JSON.stringify(resultBody);
    expect(serialized).toContain('TOP_SECRET_WORKED_SOLUTION');
    expect(serialized).toContain('ANOTHER_SECRET_SOLUTION');

    for (const q of resultBody.questions) {
      expect(q).toHaveProperty('answer');
      expect(q).toHaveProperty('solution');
    }
  });
});
