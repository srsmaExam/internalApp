import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { apiSession } from '@/lib/auth';
import { HttpError, json, withApi } from '@/lib/http';
import { getDb } from '@/db/client';
import { attemptAnswers, attempts, profiles, questions, testQuestions, tests, type QuestionOption } from '@/db/schema';
import { isGradeableResponse } from '@/lib/grading';
import { gradeAndCloseAttempt } from '@/lib/attempts';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi<Ctx>(async (req, { params }) => {
  // apiSession, not requireSession — the latter redirects, which withApi turns
  // into a 500 rather than a 401.
  const session = await apiSession();
  const { id: attemptId } = await params;
  const db = await getDb();

  let [attempt] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
  if (!attempt) throw new HttpError(404, 'not_found', 'Attempt not found');

  if (session.role === 'student' && attempt.studentId !== session.userId) {
    throw new HttpError(403, 'forbidden', 'You cannot view another student’s results.');
  }

  if (attempt.status === 'in_progress') {
    // If deadline has passed, auto-grade and close it immediately instead of rejecting
    if (Date.now() > new Date(attempt.deadlineAt).getTime()) {
      await gradeAndCloseAttempt(db, attemptId, 'auto_submitted');
      const [reloaded] = await db.select().from(attempts).where(eq(attempts.id, attemptId));
      if (reloaded) attempt = reloaded;
    } else {
      throw new HttpError(400, 'attempt_in_progress', 'This attempt has not been submitted yet.');
    }
  }

  const [test] = await db.select().from(tests).where(eq(tests.id, attempt.testId));
  if (!test) throw new HttpError(404, 'not_found', 'Test not found');

  // Gated on results_policy for students
  if (session.role === 'student' && test.resultsPolicy === 'on_release' && !test.releasedAt) {
    throw new HttpError(
      403,
      'awaiting_release',
      'The results for this test will be released by your teacher later.',
    );
  }

  // Get rank & percentile from v_test_ranks view
  const rankRows = await db.$client.query<{
    rank: number;
    percentile: number;
  }>(
    'SELECT rank, percentile FROM v_test_ranks WHERE test_id = $1 AND student_id = $2 AND attempt_no = $3',
    [attempt.testId, attempt.studentId, attempt.attemptNo],
  );

  const rankInfo = rankRows.rows[0] ?? { rank: 1, percentile: 100 };

  const [totalParticipantsRow] = await db
    .select({ count: sql<number>`cast(count(distinct ${attempts.studentId}) as int)` })
    .from(attempts)
    .where(and(eq(attempts.testId, attempt.testId), sql`status <> 'in_progress'`));

  const allAttempts = await db
    .select({
      id: attempts.id,
      attemptNo: attempts.attemptNo,
      status: attempts.status,
      submittedAt: attempts.submittedAt,
      totalMarks: attempts.totalMarks,
      maxMarks: attempts.maxMarks,
    })
    .from(attempts)
    .where(
      and(
        eq(attempts.testId, attempt.testId),
        eq(attempts.studentId, attempt.studentId),
        sql`status <> 'in_progress'`,
      ),
    )
    .orderBy(asc(attempts.attemptNo));

  const [studentProfile] = await db
    .select({
      fullName: profiles.fullName,
      isProvisional: profiles.isProvisional,
      whatsappConsent: profiles.whatsappConsent,
      city: profiles.city,
      gender: profiles.gender,
      board: profiles.board,
      school: profiles.school,
      classLevel: profiles.classLevel,
    })
    .from(profiles)
    .where(eq(profiles.id, attempt.studentId));

  const hasUnlockedSolutions =
    session.role === 'teacher' ||
    Boolean(studentProfile?.whatsappConsent && studentProfile?.city);

  const qIds = attempt.questionOrder;
  const optionOrders = (attempt.optionOrders as Record<string, string[]>) ?? {};

  const fullQuestions = await db
    .select({
      id: questions.id,
      humanCode: questions.humanCode,
      body: questions.body,
      type: questions.type,
      options: questions.options,
      answer: questions.answer,
      solution: questions.solution,
      difficulty: questions.difficulty,
      expectedTimeS: questions.expectedTimeS,
      subject: questions.subject,
      chapter: questions.chapter,
      topic: questions.topic,
      metadata: questions.metadata,
      marksCorrect: testQuestions.marksCorrect,
      marksWrong: testQuestions.marksWrong,
      marksUnattempted: testQuestions.marksUnattempted,
      position: testQuestions.position,
    })
    .from(questions)
    .innerJoin(
      testQuestions,
      and(eq(testQuestions.questionId, questions.id), eq(testQuestions.testId, attempt.testId)),
    )
    .where(inArray(questions.id, qIds));

  const userAnswers = await db
    .select({
      questionId: attemptAnswers.questionId,
      response: attemptAnswers.response,
      state: attemptAnswers.state,
      isCorrect: attemptAnswers.isCorrect,
      marksAwarded: attemptAnswers.marksAwarded,
      timeSpentMs: attemptAnswers.timeSpentMs,
      visitCount: attemptAnswers.visitCount,
      solveOrder: attemptAnswers.solveOrder,
      firstActionTimeMs: attemptAnswers.firstActionTimeMs,
      firstActionType: attemptAnswers.firstActionType,
      visitTimesMs: attemptAnswers.visitTimesMs,
      answerModifications: attemptAnswers.answerModifications,
      modifiedAfter15s: attemptAnswers.modifiedAfter15s,
    })
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));


  const qMap = new Map(fullQuestions.map((q) => [q.id, q]));
  const ansMap = new Map(userAnswers.map((a) => [a.questionId, a]));

  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;

  const subjectScores: Record<string, { marks: number; maxMarks: number; correct: number; total: number }> = {
    physics: { marks: 0, maxMarks: 0, correct: 0, total: 0 },
    chemistry: { marks: 0, maxMarks: 0, correct: 0, total: 0 },
    maths: { marks: 0, maxMarks: 0, correct: 0, total: 0 },
    biology: { marks: 0, maxMarks: 0, correct: 0, total: 0 },
  };

  const reviewItems = qIds.map((qid, index) => {
    const q = qMap.get(qid);
    const ans = ansMap.get(qid);

    if (!q) {
      throw new HttpError(500, 'missing_question', `Question ${qid} not found`);
    }

    let options = q.options ?? [];
    if (q.type === 'mcq' && optionOrders[qid]) {
      const oMap = new Map(options.map((o) => [o.key, o]));
      const reordered: QuestionOption[] = [];
      for (const k of optionOrders[qid]) {
        const item = oMap.get(k);
        if (item) reordered.push(item);
      }
      for (const item of options) {
        if (!optionOrders[qid].includes(item.key)) reordered.push(item);
      }
      options = reordered;
    }

    const marksAwarded = ans?.marksAwarded ? Number(ans.marksAwarded) : 0;
    const isCorrect = ans?.isCorrect ?? null;
    // Shared with the grader so a non-numeric entry in a numerical box can't be
    // scored as unattempted while being summarised as wrong.
    const isAttempted = isGradeableResponse(q.type, ans?.response);
    const timeSpentMs = ans?.timeSpentMs ?? 0;
    const expectedTimeS = q.expectedTimeS ?? 120;
    const isOvertime = timeSpentMs > expectedTimeS * 1.5 * 1000;

    if (isAttempted && isCorrect === true) correctCount++;
    else if (isAttempted && isCorrect === false) wrongCount++;
    else unattemptedCount++;

    if (subjectScores[q.subject]) {
      subjectScores[q.subject].marks += marksAwarded;
      subjectScores[q.subject].maxMarks += Number(q.marksCorrect ?? 4);
      subjectScores[q.subject].total += 1;
      if (isCorrect) subjectScores[q.subject].correct += 1;
    }

    // The correct option key is disclosed so candidates can see green correct answers on the scorecard.
    // Worked step-by-step solutions are disclosed once the student unlocks their report via WhatsApp consent.
    const disclosure = {
      answer: q.answer,
      ...(hasUnlockedSolutions ? { solution: q.solution } : {}),
    };

    return {
      id: q.id,
      position: index + 1,
      humanCode: q.humanCode,
      body: q.body,
      type: q.type,
      options,
      ...disclosure,
      difficulty: q.difficulty,
      expectedTimeS: q.expectedTimeS,
      subject: q.subject,
      chapter: q.chapter,
      topic: q.topic,
      metadata: q.metadata,
      marks: {
        correct: Number(q.marksCorrect ?? 4),
        wrong: Number(q.marksWrong ?? -1),
        unattempted: Number(q.marksUnattempted ?? 0),
      },
      response: ans?.response ?? null,
      state: ans?.state ?? 'not_seen',
      isCorrect,
      isAttempted,
      marksAwarded,
      timeSpentMs,
      visitCount: ans?.visitCount ?? 1,
      solveOrder: ans?.solveOrder ?? null,
      firstActionTimeMs: ans?.firstActionTimeMs ?? null,
      firstActionType: ans?.firstActionType ?? null,
      visitTimesMs: (ans?.visitTimesMs as number[]) ?? [],
      answerModifications: (ans?.answerModifications as any) ?? null,
      modifiedAfter15s: Boolean(ans?.modifiedAfter15s),
      isOvertime,
    };
  });

  const totalQuestions = reviewItems.length;
  const accuracy = correctCount + wrongCount > 0 ? Math.round((correctCount / (correctCount + wrongCount)) * 100) : 0;

  return json({
    attemptId: attempt.id,
    studentId: attempt.studentId,
    studentName: studentProfile?.fullName,
    gender: studentProfile?.gender ?? null,
    testId: test.id,
    testTitle:
      !hasUnlockedSolutions && test.title.toLowerCase().includes('set a')
        ? 'Board Readiness Challenge'
        : test.title,
    attemptNo: attempt.attemptNo,
    status: attempt.status,
    startedAt: attempt.startedAt,
    submittedAt: attempt.submittedAt,
    totalTimeS: attempt.totalTimeS ?? 0,
    totalMarks: attempt.totalMarks ? Number(attempt.totalMarks) : 0,
    maxMarks: attempt.maxMarks ? Number(attempt.maxMarks) : 0,
    rank: Number(rankInfo.rank),
    percentile: Number(rankInfo.percentile),
    totalParticipants: totalParticipantsRow?.count ?? 1,
    solveOrder: attempt.solveOrder ?? [],
    summary: {
      totalQuestions,
      correctCount,
      wrongCount,
      unattemptedCount,
      accuracy,
      subjectScores,
    },
    isReportUnlocked: hasUnlockedSolutions,
    studentDetails: {
      board: studentProfile?.board ?? null,
      school: studentProfile?.school ?? null,
      city: studentProfile?.city ?? null,
      classLevel: studentProfile?.classLevel ?? 'X',
      gender: studentProfile?.gender ?? null,
      isFormFilled: Boolean(studentProfile?.whatsappConsent && studentProfile?.city),
    },
    allAttempts: allAttempts.map((a) => ({
      id: a.id,
      attemptNo: a.attemptNo,
      status: a.status,
      submittedAt: a.submittedAt,
      totalMarks: a.totalMarks !== null ? Number(a.totalMarks) : 0,
      maxMarks: a.maxMarks !== null ? Number(a.maxMarks) : 0,
    })),
    questions: reviewItems,
  });
});
