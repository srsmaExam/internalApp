import { and, desc, eq, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { apiSession } from '@/lib/auth';
import { HttpError, json, withApi } from '@/lib/http';
import { getDb } from '@/db/client';
import { attemptAnswers, attempts, profiles, questions, tests } from '@/db/schema';

export const GET = withApi(async (req) => {
  const session = await apiSession();
  const db = await getDb();

  let targetUserId = session.userId;
  let targetStudentName = session.fullName || 'Student';
  let isReportUnlocked: boolean;

  let targetGender: string | null = null;

  const url = new URL(req.url);
  const queryStudentId = url.searchParams.get('studentId');

  let isFormFilled = false;
  let targetBoard: string | null = null;
  let targetSchool: string | null = null;
  let targetCity: string | null = null;
  let targetClassLevel: string | null = null;

  if (session.role === 'teacher') {
    if (queryStudentId) {
      const [targetStudent] = await db
        .select({
          id: profiles.id,
          fullName: profiles.fullName,
          role: profiles.role,
          gender: profiles.gender,
          board: profiles.board,
          school: profiles.school,
          city: profiles.city,
          classLevel: profiles.classLevel,
        })
        .from(profiles)
        .where(eq(profiles.id, queryStudentId));

      if (!targetStudent || targetStudent.role !== 'student') {
        throw new HttpError(404, 'not_found', 'Student profile not found.');
      }
      targetUserId = targetStudent.id;
      targetStudentName = targetStudent.fullName;
      targetGender = targetStudent.gender;
      isFormFilled = Boolean(targetStudent.city);
      targetBoard = targetStudent.board ?? null;
      targetSchool = targetStudent.school ?? null;
      targetCity = targetStudent.city ?? null;
      targetClassLevel = targetStudent.classLevel ?? 'X';
    }
    isReportUnlocked = true;
  } else if (session.role === 'student') {
    targetUserId = session.userId;
    targetStudentName = session.fullName || 'Student';
    const [profile] = await db
      .select({
        city: profiles.city,
        board: profiles.board,
        school: profiles.school,
        classLevel: profiles.classLevel,
        isProvisional: profiles.isProvisional,
        gender: profiles.gender,
      })
      .from(profiles)
      .where(eq(profiles.id, session.userId));

    isFormFilled = Boolean(profile && profile.city);
    isReportUnlocked = isFormFilled;
    targetGender = profile?.gender ?? null;
    targetBoard = profile?.board ?? null;
    targetSchool = profile?.school ?? null;
    targetCity = profile?.city ?? null;
    targetClassLevel = profile?.classLevel ?? 'X';
  } else {
    throw new HttpError(403, 'forbidden', 'Access denied.');
  }

  // Completed attempts by this student whose results are available.
  // For students, gated on results_policy: attempts for 'on_release' tests with released_at IS NULL
  // are excluded so scores/rankings are not leaked before teacher release.
  // For teachers, all submitted attempts are visible.
  const releaseCondition =
    session.role === 'teacher'
      ? undefined
      : or(eq(tests.resultsPolicy, 'immediate'), isNotNull(tests.releasedAt));

  const whereConditions = [
    eq(attempts.studentId, targetUserId),
    sql`${attempts.status} <> 'in_progress'`,
  ];
  if (releaseCondition) {
    whereConditions.push(releaseCondition);
  }

  const studentAttempts = await db
    .select({
      attemptId: attempts.id,
      testId: attempts.testId,
      testTitle: tests.title,
      attemptNo: attempts.attemptNo,
      startedAt: attempts.startedAt,
      submittedAt: attempts.submittedAt,
      totalMarks: attempts.totalMarks,
      maxMarks: attempts.maxMarks,
      totalTimeS: attempts.totalTimeS,
    })
    .from(attempts)
    .innerJoin(tests, eq(tests.id, attempts.testId))
    .where(and(...whereConditions))
    .orderBy(desc(attempts.submittedAt));

  if (studentAttempts.length === 0) {
    return json({
      studentId: targetUserId,
      studentName: targetStudentName,
      gender: targetGender,
      isReportUnlocked,
      studentDetails: {
        board: targetBoard,
        school: targetSchool,
        city: targetCity,
        classLevel: targetClassLevel,
        gender: targetGender,
        isFormFilled,
      },
      totalAttempts: 0,
      avgScore: 0,
      avgPercentile: 0,
      recentTests: [],
      subjectBreakdown: {
        physics: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
        chemistry: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
        maths: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
        biology: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
      },
      chapterBreakdown: [],
    });
  }

  // Fetch ranks and percentiles for these attempts from v_test_ranks
  const ranksRes = await db.$client.query<{
    test_id: string;
    student_id: string;
    attempt_no: number;
    rank: number;
    percentile: number;
  }>('SELECT test_id, student_id, attempt_no, rank, percentile FROM v_test_ranks WHERE student_id = $1', [
    targetUserId,
  ]);

  const ranksMap = new Map(ranksRes.rows.map((r) => [`${r.test_id}-${r.attempt_no}`, r]));

  const attemptIds = studentAttempts.map((a) => a.attemptId);

  // Load all question responses for chapter and subject accuracy
  const answers = await db
    .select({
      subject: questions.subject,
      chapter: questions.chapter,
      isCorrect: attemptAnswers.isCorrect,
      response: attemptAnswers.response,
    })
    .from(attemptAnswers)
    .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
    .where(inArray(attemptAnswers.attemptId, attemptIds));

  const subjects: Record<string, { correct: number; attempted: number; total: number; accuracy: number }> = {
    physics: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
    chemistry: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
    maths: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
    biology: { correct: 0, attempted: 0, total: 0, accuracy: 0 },
  };

  const chapterMap = new Map<string, { chapter: string; subject: string; correct: number; attempted: number; total: number }>();

  for (const a of answers) {
    const isAtt = a.response !== null && a.response !== undefined;
    const isCorr = Boolean(a.isCorrect);

    if (subjects[a.subject]) {
      subjects[a.subject].total += 1;
      if (isAtt) subjects[a.subject].attempted += 1;
      if (isCorr) subjects[a.subject].correct += 1;
    }

    const chap = a.chapter ?? 'General';
    const key = `${a.subject}-${chap}`;
    if (!chapterMap.has(key)) {
      chapterMap.set(key, { chapter: chap, subject: a.subject, correct: 0, attempted: 0, total: 0 });
    }
    const c = chapterMap.get(key)!;
    c.total += 1;
    if (isAtt) c.attempted += 1;
    if (isCorr) c.correct += 1;
  }

  for (const s of Object.values(subjects)) {
    s.accuracy = s.attempted > 0 ? Math.round((s.correct / s.attempted) * 100) : 0;
  }

  const chapterBreakdown = Array.from(chapterMap.values())
    .map((c) => ({
      ...c,
      accuracy: c.attempted > 0 ? Math.round((c.correct / c.attempted) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy); // Weakest chapters first

  let totalPercentile = 0;
  let percentileCount = 0;
  let totalScore = 0;

  const recentTests = studentAttempts.map((a) => {
    const rInfo = ranksMap.get(`${a.testId}-${a.attemptNo}`);
    const score = Number(a.totalMarks ?? 0);
    const pctl = rInfo && rInfo.percentile !== null ? Number(rInfo.percentile) : null;
    const rank = rInfo && rInfo.rank !== null ? Number(rInfo.rank) : null;

    totalScore += score;
    if (pctl !== null) {
      totalPercentile += pctl;
      percentileCount++;
    }

    return {
      attemptId: a.attemptId,
      testId: a.testId,
      testTitle: a.testTitle,
      attemptNo: a.attemptNo,
      score,
      maxMarks: Number(a.maxMarks ?? 0),
      rank,
      percentile: pctl,
      submittedAt: a.submittedAt,
      timeSpentMin: Math.round((a.totalTimeS ?? 0) / 60),
    };
  });

  return json({
    studentId: targetUserId,
    studentName: targetStudentName,
    gender: targetGender,
    isReportUnlocked,
    studentDetails: {
      board: targetBoard,
      school: targetSchool,
      city: targetCity,
      classLevel: targetClassLevel,
      gender: targetGender,
      isFormFilled,
    },
    totalAttempts: studentAttempts.length,
    avgScore: Math.round((totalScore / studentAttempts.length) * 10) / 10,
    avgPercentile:
      percentileCount > 0 ? Math.round((totalPercentile / percentileCount) * 10) / 10 : null,
    recentTests,
    subjectBreakdown: subjects,
    chapterBreakdown,
  });
});
