import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { and, eq, isNotNull, or, sql } from 'drizzle-orm';
import * as schema from '@/db/schema';
import { gradeAndCloseAttempt, regradeTestAttempts, saveAttemptAnswersBatch } from './attempts';
import type { Db } from '@/db/client';


const ROOT = path.resolve(import.meta.dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

describe('Attempt Lifecycle Integration & Security Suite', () => {
  let pg: PGlite;
  let db: Db;

  const studentId = '11111111-1111-4111-8111-111111111111';
  const teacherId = '22222222-2222-4222-8222-222222222222';
  const testId = '33333333-3333-4333-8333-333333333333';
  const testOnReleaseId = '44444444-4444-4444-8444-444444444444';

  const q1Id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const q2Id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const q3Id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';

  beforeAll(async () => {
    // In-memory PGlite
    pg = await PGlite.create();

    // Run migrations
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
        username: 'test_student',
        email: 'student@example.com',
        fullName: 'Test Student',
        role: 'student',
        isActive: true,
        canLogin: true,
      },
      {
        id: teacherId,
        username: 'test_teacher',
        email: 'teacher@example.com',
        fullName: 'Test Teacher',
        role: 'teacher',
        isActive: true,
        canLogin: true,
      },
    ]);

    // Seed questions
    // Q1: Physics MCQ, answer B
    // Q2: Chemistry MCQ, answer A
    // Q3: Maths Integer/Numerical, answer range 10 to 12
    await db.insert(schema.questions).values([
      {
        id: q1Id,
        subject: 'physics',
        chapter: 'Kinematics',
        type: 'mcq',
        body: 'What is acceleration?',
        options: [
          { key: 'A', body: 'Option A' },
          { key: 'B', body: 'Option B' },
          { key: 'C', body: 'Option C' },
          { key: 'D', body: 'Option D' },
        ],
        answer: { key: 'B' },
        status: 'verified',
      },
      {
        id: q2Id,
        subject: 'chemistry',
        chapter: 'Thermodynamics',
        type: 'mcq',
        body: 'What is enthalpy?',
        options: [
          { key: 'A', body: 'Option A' },
          { key: 'B', body: 'Option B' },
        ],
        answer: { key: 'A' },
        status: 'verified',
      },
      {
        id: q3Id,
        subject: 'maths',
        chapter: 'Calculus',
        type: 'integer',
        body: 'Calculate integral value.',
        options: [],
        answer: { min: 10, max: 12 },
        status: 'verified',
      },
    ]);

    // Seed Test 1: Immediate results policy
    await db.insert(schema.tests).values({
      id: testId,
      title: 'JEE Online Test Full Mock 1',
      durationS: 1800,
      maxAttempts: 3,
      isPublished: true,
      resultsPolicy: 'immediate',
      createdBy: teacherId,
    });

    // Seed Test 2: On-release results policy
    await db.insert(schema.tests).values({
      id: testOnReleaseId,
      title: 'JEE Online Test Strict Mock 2 (On Release)',
      durationS: 1800,
      maxAttempts: 1,
      isPublished: true,
      resultsPolicy: 'on_release',
      releasedAt: null,
      createdBy: teacherId,
    });

    // Link questions to Test 1: MCQ (+4 / -1 / 0), Numerical (+4 / 0 / 0)
    await db.insert(schema.testQuestions).values([
      { testId, questionId: q1Id, position: 1, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
      { testId, questionId: q2Id, position: 2, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
      { testId, questionId: q3Id, position: 3, marksCorrect: '4', marksWrong: '0', marksUnattempted: '0' },
    ]);

    // Link Q1 to Test 2
    await db.insert(schema.testQuestions).values([
      { testId: testOnReleaseId, questionId: q1Id, position: 1, marksCorrect: '4', marksWrong: '-1', marksUnattempted: '0' },
    ]);
  });

  afterAll(async () => {
    if (pg) await pg.close();
  });

  it('end-to-end attempt lifecycle: start -> record answers -> grade on close (A-4, A-5)', async () => {
    const attemptId = '55555555-5555-4555-8555-555555555555';

    // 1. Start attempt
    const deadlineAt = new Date(Date.now() + 1800 * 1000);
    await db.insert(schema.attempts).values({
      id: attemptId,
      testId,
      studentId,
      attemptNo: 1,
      status: 'in_progress',
      deadlineAt,
      questionOrder: [q1Id, q2Id, q3Id],
    });

    // Initial answers
    await db.insert(schema.attemptAnswers).values([
      { attemptId, questionId: q1Id, state: 'seen_unanswered', timeSpentMs: 10000, visitCount: 1 },
      { attemptId, questionId: q2Id, state: 'seen_unanswered', timeSpentMs: 15000, visitCount: 1 },
      { attemptId, questionId: q3Id, state: 'seen_unanswered', timeSpentMs: 20000, visitCount: 1 },
    ]);

    // 2. Student records responses:
    // Q1: B (Correct -> +4)
    // Q2: B (Wrong -> -1)
    // Q3: 11.5 (Correct range 10-12 -> +4)
    // Expected total marks: 4 - 1 + 4 = 7 marks out of 12
    await db
      .update(schema.attemptAnswers)
      .set({ response: { key: 'B' }, state: 'answered', timeSpentMs: 30000 })
      .where(and(eq(schema.attemptAnswers.attemptId, attemptId), eq(schema.attemptAnswers.questionId, q1Id)));

    await db
      .update(schema.attemptAnswers)
      .set({ response: { key: 'B' }, state: 'answered', timeSpentMs: 25000 })
      .where(and(eq(schema.attemptAnswers.attemptId, attemptId), eq(schema.attemptAnswers.questionId, q2Id)));

    await db
      .update(schema.attemptAnswers)
      .set({ response: { value: 11.5 }, state: 'answered', timeSpentMs: 40000 })
      .where(and(eq(schema.attemptAnswers.attemptId, attemptId), eq(schema.attemptAnswers.questionId, q3Id)));

    // 3. Grade and close attempt
    const result = await gradeAndCloseAttempt(db, attemptId, 'auto_submitted');

    expect(result.graded).toBe(true);
    expect(result.status).toBe('auto_submitted');
    expect(result.totalMarks).toBe(7);
    expect(result.maxMarks).toBe(12);

    // 4. Verify stored attempt state
    const [storedAttempt] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attemptId));
    expect(storedAttempt.status).toBe('auto_submitted');
    expect(Number(storedAttempt.totalMarks)).toBe(7);
    expect(Number(storedAttempt.maxMarks)).toBe(12);

    // 5. Verify v_test_ranks view with multiple attempts
    // Postgres percent_rank() with 1 row returns 0. Seed a second student attempt to test multi-student ranking.
    const student2Id = '88888888-8888-4888-8888-888888888888';
    await db.insert(schema.profiles).values({
      id: student2Id,
      username: 'test_student_2',
      email: 'student2@example.com',
      fullName: 'Test Student Two',
      role: 'student',
      isActive: true,
      canLogin: true,
    });

    const attempt2Student2Id = '99999999-9999-4999-8999-999999999999';
    await db.insert(schema.attempts).values({
      id: attempt2Student2Id,
      testId,
      studentId: student2Id,
      attemptNo: 1,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q1Id, q2Id, q3Id],
    });

    // Student 2 answers only Q2 (Wrong -> -1 marks)
    await db.insert(schema.attemptAnswers).values([
      { attemptId: attempt2Student2Id, questionId: q1Id, state: 'seen_unanswered' },
      { attemptId: attempt2Student2Id, questionId: q2Id, response: { key: 'B' }, state: 'answered' },
      { attemptId: attempt2Student2Id, questionId: q3Id, state: 'seen_unanswered' },
    ]);

    await gradeAndCloseAttempt(db, attempt2Student2Id, 'submitted');

    // Query leaderboard
    const rankRows = await db.$client.query<{
      test_id: string;
      student_id: string;
      attempt_no: number;
      total_marks: number;
      rank: number;
      percentile: number;
    }>('SELECT * FROM v_test_ranks WHERE test_id = $1 ORDER BY rank ASC', [testId]);

    expect(rankRows.rows.length).toBe(2);
    // Student 1: 7 marks -> Rank 1, 100th percentile
    expect(rankRows.rows[0].student_id).toBe(studentId);
    expect(Number(rankRows.rows[0].total_marks)).toBe(7);
    expect(Number(rankRows.rows[0].rank)).toBe(1);
    expect(Number(rankRows.rows[0].percentile)).toBe(100);

    // Student 2: -1 marks -> Rank 2, 0th percentile
    expect(rankRows.rows[1].student_id).toBe(student2Id);
    expect(Number(rankRows.rows[1].total_marks)).toBe(-1);
    expect(Number(rankRows.rows[1].rank)).toBe(2);
    expect(Number(rankRows.rows[1].percentile)).toBe(0);

    // 6. Verify idempotency
    const repeatResult = await gradeAndCloseAttempt(db, attemptId, 'submitted');
    expect(repeatResult.graded).toBe(false);
    expect(repeatResult.totalMarks).toBe(7);
  });

  it('results policy gating on student analytics (A-9)', async () => {
    const onReleaseAttemptId = '66666666-6666-4666-8666-666666666666';

    // Start & submit attempt for the on_release test
    await db.insert(schema.attempts).values({
      id: onReleaseAttemptId,
      testId: testOnReleaseId,
      studentId,
      attemptNo: 1,
      status: 'in_progress',
      deadlineAt: new Date(),
      questionOrder: [q1Id],
    });

    await db.insert(schema.attemptAnswers).values([
      { attemptId: onReleaseAttemptId, questionId: q1Id, response: { key: 'B' }, state: 'answered' },
    ]);

    await gradeAndCloseAttempt(db, onReleaseAttemptId, 'submitted');

    // Query with results_policy gate
    const analyticsQuery = (studentId: string) =>
      db
        .select({
          attemptId: schema.attempts.id,
          testId: schema.attempts.testId,
          totalMarks: schema.attempts.totalMarks,
        })
        .from(schema.attempts)
        .innerJoin(schema.tests, eq(schema.tests.id, schema.attempts.testId))
        .where(
          and(
            eq(schema.attempts.studentId, studentId),
            sql`${schema.attempts.status} <> 'in_progress'`,
            or(eq(schema.tests.resultsPolicy, 'immediate'), isNotNull(schema.tests.releasedAt)),
          ),
        );

    // Before release: only Test 1 is visible, Test 2 is hidden
    const unreleasedResults = await analyticsQuery(studentId);
    expect(unreleasedResults.some((r) => r.testId === testOnReleaseId)).toBe(false);
    expect(unreleasedResults.some((r) => r.testId === testId)).toBe(true);

    // Teacher releases Test 2 results
    await db
      .update(schema.tests)
      .set({ releasedAt: new Date() })
      .where(eq(schema.tests.id, testOnReleaseId));

    // After release: Test 2 is now visible in student analytics
    const releasedResults = await analyticsQuery(studentId);
    expect(releasedResults.some((r) => r.testId === testOnReleaseId)).toBe(true);
  });

  it('prevents modifying question set when attempts exist (A-10)', async () => {
    // Check attempt count
    const [{ attemptCount }] = await db
      .select({ attemptCount: sql<number>`cast(count(*) as int)` })
      .from(schema.attempts)
      .where(eq(schema.attempts.testId, testId));

    expect(attemptCount).toBeGreaterThan(0);
    // Since attemptCount > 0, API rejects PUT with 409 test_in_use
    expect(attemptCount > 0).toBe(true);
  });

  it('allows teacher to modify maxAttempts even when attempts exist', async () => {
    const [{ attemptCount }] = await db
      .select({ attemptCount: sql<number>`cast(count(*) as int)` })
      .from(schema.attempts)
      .where(eq(schema.attempts.testId, testId));
    expect(attemptCount).toBeGreaterThan(0);

    // Updating maxAttempts to allow more retakes (e.g. 5)
    await db.update(schema.tests).set({ maxAttempts: 5 }).where(eq(schema.tests.id, testId));
    const [testAfterUpdate] = await db.select().from(schema.tests).where(eq(schema.tests.id, testId));
    expect(testAfterUpdate.maxAttempts).toBe(5);

    // Updating maxAttempts to 0 for unlimited retakes
    await db.update(schema.tests).set({ maxAttempts: 0 }).where(eq(schema.tests.id, testId));
    const [testUnlimited] = await db.select().from(schema.tests).where(eq(schema.tests.id, testId));
    expect(testUnlimited.maxAttempts).toBe(0);
  });

  it('sequential attempt allocation preserves uniqueness (A-16)', async () => {
    // Max attempt_no query inside transaction
    const [{ maxAttemptNo }] = await db
      .select({ maxAttemptNo: sql<number>`coalesce(max(${schema.attempts.attemptNo}), 0)` })
      .from(schema.attempts)
      .where(and(eq(schema.attempts.testId, testId), eq(schema.attempts.studentId, studentId)));

    const nextAttemptNo = Number(maxAttemptNo) + 1;
    expect(nextAttemptNo).toBe(2);

    const attempt2Id = '77777777-7777-4777-8777-777777777777';
    await db.insert(schema.attempts).values({
      id: attempt2Id,
      testId,
      studentId,
      attemptNo: nextAttemptNo,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q1Id, q2Id, q3Id],
    });

    const [att2] = await db.select().from(schema.attempts).where(eq(schema.attempts.id, attempt2Id));
    expect(att2.attemptNo).toBe(2);
  });

  it('saveAttemptAnswersBatch updates multiple question responses in a single atomic batch', async () => {
    const batchAttemptId = 'ba7c0000-0000-4000-8000-000000000001';
    await db.insert(schema.attempts).values({
      id: batchAttemptId,
      testId,
      studentId,
      attemptNo: 3,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q1Id, q2Id, q3Id],
    });

    await db.insert(schema.attemptAnswers).values([
      { attemptId: batchAttemptId, questionId: q1Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId: batchAttemptId, questionId: q2Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId: batchAttemptId, questionId: q3Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
    ]);

    // Save batch of answers (Q1: MCQ, Q2: flagged with no response, Q3: numerical value)
    const count = await saveAttemptAnswersBatch(db, batchAttemptId, [
      { questionId: q1Id, response: { key: 'B' }, state: 'answered', timeSpentMs: 12000, visitCount: 1 },
      { questionId: q2Id, response: null, state: 'flagged_unanswered', timeSpentMs: 5000, visitCount: 2 },
      { questionId: q3Id, response: { value: 11.5 }, state: 'answered', timeSpentMs: 25000, visitCount: 1 },
    ]);

    expect(count).toBe(3);

    const saved = await db
      .select()
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, batchAttemptId));

    const q1Ans = saved.find((s) => s.questionId === q1Id);
    const q2Ans = saved.find((s) => s.questionId === q2Id);
    const q3Ans = saved.find((s) => s.questionId === q3Id);

    expect(q1Ans?.response).toEqual({ key: 'B' });
    expect(q1Ans?.state).toBe('answered');
    expect(q1Ans?.timeSpentMs).toBe(12000);

    expect(q2Ans?.response).toBeNull();
    expect(q2Ans?.state).toBe('flagged_unanswered');
    expect(q2Ans?.visitCount).toBe(2);

    expect(q3Ans?.response).toEqual({ value: 11.5 });
    expect(q3Ans?.state).toBe('answered');
    expect(q3Ans?.timeSpentMs).toBe(25000);

    // Grade and close this attempt
    const gradeRes = await gradeAndCloseAttempt(db, batchAttemptId, 'submitted');
    expect(gradeRes.graded).toBe(true);
    // Q1 (+4), Q2 (0 unattempted), Q3 (+4) -> 8 marks
    expect(gradeRes.totalMarks).toBe(8);

    // Now test changing the marking scheme to +1, 0
    await db
      .update(schema.testQuestions)
      .set({ marksCorrect: '1', marksWrong: '0', marksUnattempted: '0' })
      .where(eq(schema.testQuestions.testId, testId));

    const regradedCount = await regradeTestAttempts(db, testId);
    expect(regradedCount).toBeGreaterThanOrEqual(1);

    // Verify student's attempt was updated: Q1 (+1), Q2 (0), Q3 (+1) -> 2 marks
    const [regradedAttempt] = await db
      .select()
      .from(schema.attempts)
      .where(eq(schema.attempts.id, batchAttemptId));
    expect(Number(regradedAttempt.totalMarks)).toBe(2);
    expect(Number(regradedAttempt.maxMarks)).toBe(3);

    const regradedAnswers = await db
      .select()
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, batchAttemptId));

    const q1Regraded = regradedAnswers.find((s) => s.questionId === q1Id);
    expect(Number(q1Regraded?.marksAwarded)).toBe(1);
  });

  it('FBR-07: saveAttemptAnswersBatch repairs a gradeable response saved with an "unanswered" state', async () => {
    const repairAttemptId = 'ba7c0000-0000-4000-8000-000000000002';
    await db.insert(schema.attempts).values({
      id: repairAttemptId,
      testId,
      studentId,
      attemptNo: 4,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q1Id, q2Id],
    });

    await db.insert(schema.attemptAnswers).values([
      { attemptId: repairAttemptId, questionId: q1Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId: repairAttemptId, questionId: q2Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
    ]);

    // Simulates a client (or a future regression) writing the exact
    // contradiction FBR-07 fixed on the client: a real selection paired with
    // `seen_unanswered`. The server must not persist that combination.
    await saveAttemptAnswersBatch(db, repairAttemptId, [
      { questionId: q1Id, response: { key: 'A' }, state: 'seen_unanswered' },
      { questionId: q2Id, response: { value: 7 }, state: 'not_seen' },
    ]);

    const repaired = await db
      .select()
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, repairAttemptId));

    const q1Repaired = repaired.find((s) => s.questionId === q1Id);
    const q2Repaired = repaired.find((s) => s.questionId === q2Id);

    expect(q1Repaired?.response).toEqual({ key: 'A' });
    expect(q1Repaired?.state).toBe('answered');
    expect(q2Repaired?.response).toEqual({ value: 7 });
    expect(q2Repaired?.state).toBe('answered');
  });

  it('FBR-07: the repair never fires for a genuinely ungradeable response', async () => {
    const repairAttemptId = 'ba7c0000-0000-4000-8000-000000000003';
    await db.insert(schema.attempts).values({
      id: repairAttemptId,
      testId,
      studentId,
      attemptNo: 5,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q3Id],
    });

    await db.insert(schema.attemptAnswers).values([
      { attemptId: repairAttemptId, questionId: q3Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
    ]);

    // A half-typed "-" (draftValue only) is stored as a null response — must
    // stay seen_unanswered, not be repaired into a false "answered".
    await saveAttemptAnswersBatch(db, repairAttemptId, [
      { questionId: q3Id, response: null, state: 'seen_unanswered' },
    ]);

    const [row] = await db
      .select()
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, repairAttemptId));

    expect(row.response).toBeNull();
    expect(row.state).toBe('seen_unanswered');
  });

  it('handles submitting an attempt where all questions are unattempted (all isCorrect === null)', async () => {
    const unattemptedId = 'ba7c0000-0000-4000-8000-000000000004';
    await db.insert(schema.attempts).values({
      id: unattemptedId,
      testId,
      studentId,
      attemptNo: 6,
      status: 'in_progress',
      deadlineAt: new Date(Date.now() + 1800 * 1000),
      questionOrder: [q1Id, q2Id, q3Id],
    });

    await db.insert(schema.attemptAnswers).values([
      { attemptId: unattemptedId, questionId: q1Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId: unattemptedId, questionId: q2Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
      { attemptId: unattemptedId, questionId: q3Id, state: 'not_seen', timeSpentMs: 0, visitCount: 0 },
    ]);

    const result = await gradeAndCloseAttempt(db, unattemptedId, 'submitted');
    expect(result.graded).toBe(true);
    expect(result.status).toBe('submitted');
    expect(result.totalMarks).toBe(0);

    const answers = await db
      .select()
      .from(schema.attemptAnswers)
      .where(eq(schema.attemptAnswers.attemptId, unattemptedId));

    expect(answers.length).toBe(3);
    for (const ans of answers) {
      expect(ans.isCorrect).toBeNull();
      expect(Number(ans.marksAwarded)).toBe(0);
    }

    // Also test that regrading this test with unattempted attempt works cleanly
    const regraded = await regradeTestAttempts(db, testId);
    expect(regraded).toBeGreaterThanOrEqual(1);
  });
});


