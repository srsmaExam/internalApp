import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { gradeAndCloseAttempt, saveAttemptAnswersBatch } from './attempts';
import type { Db } from '@/db/client';

const ROOT = path.resolve(import.meta.dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

describe('Student Attempt Telemetry Suite', () => {
  let pg: PGlite;
  let db: Db;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const teacherId = '22222222-2222-4222-8222-222222222222';
  const testId = '33333333-3333-4333-8333-333333333333';
  const attemptId = '55555555-5555-4555-8555-555555555555';

  const q1Id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const q2Id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const q3Id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeAll(async () => {
    pg = await PGlite.create();

    const files = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.sql'))
      .map((e) => e.name)
      .sort();

    for (const file of files) {
      const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await pg.exec(content);
    }

    db = drizzle(pg, { schema }) as Db;

    // Seed test profiles
    await db.insert(schema.profiles).values([
      {
        id: studentId,
        username: 'telemetry_student',
        email: 'telemetry_student@example.com',
        fullName: 'Telemetry Student',
        role: 'student',
        isActive: true,
        canLogin: true,
      },
      {
        id: teacherId,
        username: 'telemetry_teacher',
        email: 'telemetry_teacher@example.com',
        fullName: 'Telemetry Teacher',
        role: 'teacher',
        isActive: true,
        canLogin: true,
      },
    ]);

    // Seed test
    await db.insert(schema.tests).values({
      id: testId,
      title: 'Telemetry Test',
      durationS: 3600,
      createdBy: teacherId,
      isPublished: true,
    });

    // Seed questions
    await db.insert(schema.questions).values([
      {
        id: q1Id,
        subject: 'physics',
        type: 'mcq',
        body: 'Q1 Physics: What is velocity?',
        options: [
          { key: 'A', body: 'Displacement/time' },
          { key: 'B', body: 'Distance/time' },
        ],
        answer: { key: 'A' },
      },
      {
        id: q2Id,
        subject: 'chemistry',
        type: 'mcq',
        body: 'Q2 Chemistry: What is atomic number of Carbon?',
        options: [
          { key: 'A', body: '6' },
          { key: 'B', body: '12' },
        ],
        answer: { key: 'A' },
      },
      {
        id: q3Id,
        subject: 'maths',
        type: 'integer',
        body: 'Q3 Maths: 5 + 7 = ?',
        answer: { value: 12 },
      },
    ]);

    await db.insert(schema.testQuestions).values([
      { testId, questionId: q1Id, position: 1, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
      { testId, questionId: q2Id, position: 2, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
      { testId, questionId: q3Id, position: 3, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
    ]);

    // Seed attempt
    await db.insert(schema.attempts).values({
      id: attemptId,
      testId,
      studentId,
      attemptNo: 1,
      startedAt: new Date(),
      deadlineAt: new Date(Date.now() + 3600_000),
      status: 'in_progress',
      questionOrder: [q1Id, q2Id, q3Id],
    });

    // Seed initial attemptAnswers
    await db.insert(schema.attemptAnswers).values([
      { attemptId, questionId: q1Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId, questionId: q2Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId, questionId: q3Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
    ]);
  });

  it('records solving order, split visits, answer modifications (>15s), and first action timing', async () => {
    // Simulate student tackling paper:
    // 1. Student opens Q1, reads for 10s, decides to skip (first action: 'skipped', 10s)
    // 2. Student moves to Q3, reads for 25s, enters 12 (solved #1, first action: 'answered', 25s)
    // 3. Student goes back to Q1 (revisit 2! 40s in visit 2, selects 'A', solved #2)
    // 4. Student goes to Q2, selects 'B' at 15s, then after 30s modifies to 'A' (modification >15s! solved #3)
    const telemetryBatch = [
      {
        questionId: q1Id,
        response: { key: 'A' },
        state: 'answered' as const,
        timeSpentMs: 50_000,
        visitCount: 2,
        solveOrder: 2,
        firstActionTimeMs: 10_000,
        firstActionType: 'skipped',
        visitTimesMs: [10_000, 40_000],
        answerModifications: { count: 0, modifiedAfter15s: false, after15sCount: 0, history: [] },
        modifiedAfter15s: false,
      },
      {
        questionId: q2Id,
        response: { key: 'A' },
        state: 'answered' as const,
        timeSpentMs: 45_000,
        visitCount: 1,
        solveOrder: 3,
        firstActionTimeMs: 15_000,
        firstActionType: 'answered',
        visitTimesMs: [45_000],
        answerModifications: {
          count: 1,
          modifiedAfter15s: true,
          after15sCount: 1,
          history: [
            {
              from: { key: 'B' },
              to: { key: 'A' },
              elapsedMs: 30_000,
              isAfter15s: true,
              timestamp: new Date().toISOString(),
            },
          ],
        },
        modifiedAfter15s: true,
      },
      {
        questionId: q3Id,
        response: { value: 12 },
        state: 'answered' as const,
        timeSpentMs: 25_000,
        visitCount: 1,
        solveOrder: 1,
        firstActionTimeMs: 25_000,
        firstActionType: 'answered',
        visitTimesMs: [25_000],
        answerModifications: { count: 0, modifiedAfter15s: false, after15sCount: 0, history: [] },
        modifiedAfter15s: false,
      },
    ];

    const savedCount = await saveAttemptAnswersBatch(db, attemptId, telemetryBatch);
    expect(savedCount).toBe(3);

    // Verify stored telemetry rows
    const stored = await db.select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, attemptId));
    const q1 = stored.find((r) => r.questionId === q1Id)!;
    const q2 = stored.find((r) => r.questionId === q2Id)!;
    const q3 = stored.find((r) => r.questionId === q3Id)!;

    // 1. Order of solving questions
    expect(q3.solveOrder).toBe(1);
    expect(q1.solveOrder).toBe(2);
    expect(q2.solveOrder).toBe(3);

    // 2. Time spent on each question
    expect(q1.timeSpentMs).toBe(50_000);
    expect(q2.timeSpentMs).toBe(45_000);
    expect(q3.timeSpentMs).toBe(25_000);

    // 4. Answer modifications (>15s)
    expect(q2.modifiedAfter15s).toBe(true);
    expect(q2.answerModifications?.count).toBe(1);
    expect(q2.answerModifications?.modifiedAfter15s).toBe(true);
    expect(q1.modifiedAfter15s).toBe(false);

    // 5. Re-visits and Split Time
    expect(q1.visitCount).toBe(2);
    expect(q1.visitTimesMs).toEqual([10_000, 40_000]);
    expect(q3.visitCount).toBe(1);
    expect(q3.visitTimesMs).toEqual([25_000]);

    // 6. Time for first action (reading vs solving / skipping)
    expect(q1.firstActionTimeMs).toBe(10_000);
    expect(q1.firstActionType).toBe('skipped');
    expect(q2.firstActionTimeMs).toBe(15_000);
    expect(q2.firstActionType).toBe('answered');
    expect(q3.firstActionTimeMs).toBe(25_000);
    expect(q3.firstActionType).toBe('answered');
  });

  it('grades attempt, calculates is_correct, and populates attempts.solve_order', async () => {
    const result = await gradeAndCloseAttempt(db, attemptId, 'submitted');
    expect(result.status).toBe('submitted');
    expect(result.graded).toBe(true);
    expect(result.totalMarks).toBe(12); // All 3 correct (4 marks each)

    // Check graded answers: 3. Answer chosen was correct or incorrect
    const stored = await db.select().from(schema.attemptAnswers).where(eq(schema.attemptAnswers.attemptId, attemptId));
    for (const r of stored) {
      expect(r.isCorrect).toBe(true);
      expect(r.marksAwarded).toBe('4.00');
    }

    // Check attempt level solve order array: [q3Id, q1Id, q2Id]
    const [att] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attemptId));
    expect(att.solveOrder).toEqual([q3Id, q1Id, q2Id]);
  });
});
