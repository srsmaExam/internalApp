import { and, eq, inArray } from 'drizzle-orm';
import { HttpError } from '@/lib/http';
import type { Db } from '@/db/client';
import { attemptAnswers, questions, testQuestions, type AnswerModificationMeta } from '@/db/schema';
import { toStudentQuestion, type StudentQuestionDto } from '@/lib/dto';

export type AttemptQuestionDto = StudentQuestionDto & {
  state: string;
  response: unknown;
  timeSpentMs: number;
  visitCount: number;
  solveOrder?: number | null;
  firstActionTimeMs?: number | null;
  firstActionType?: string | null;
  visitTimesMs?: number[];
  answerModifications?: AnswerModificationMeta | null;
  modifiedAfter15s?: boolean;
};

/**
 * Loads an attempt's questions (in materialized order) merged with the saved
 * answer state. Shared by the questions API route and the SSR test-runner view
 * so the student never needs a second request on mount. Callers must have
 * already verified the attempt belongs to the requester.
 */
export async function loadAttemptQuestions(
  db: Db,
  attemptId: string,
  attempt: { testId: string; questionOrder: string[] | null; optionOrders: unknown },
): Promise<AttemptQuestionDto[]> {
  const qIds = attempt.questionOrder;
  if (!qIds || qIds.length === 0) {
    return [];
  }

  const rawQuestions = await db
    .select({
      id: questions.id,
      body: questions.body,
      type: questions.type,
      options: questions.options,
      subject: questions.subject,
      chapter: questions.chapter,
      topic: questions.topic,
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

  const answers = await db
    .select({
      questionId: attemptAnswers.questionId,
      response: attemptAnswers.response,
      state: attemptAnswers.state,
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

  const questionsMap = new Map(rawQuestions.map((q) => [q.id, q]));
  const answersMap = new Map(answers.map((a) => [a.questionId, a]));
  const optionOrders = (attempt.optionOrders as Record<string, string[]>) ?? {};

  // Preserve the exact materialized questionOrder
  const result = qIds.map((qid, index) => {
    const rawQ = questionsMap.get(qid);
    if (!rawQ) {
      throw new HttpError(500, 'missing_question', `Question ${qid} not found in database`);
    }

    const marks = {
      correct: Number(rawQ.marksCorrect ?? 4),
      wrong: Number(rawQ.marksWrong ?? -1),
      unattempted: Number(rawQ.marksUnattempted ?? 0),
    };

    const studentQ = toStudentQuestion(rawQ, index + 1, marks, optionOrders[qid]);
    const savedAnswer = answersMap.get(qid);

    return {
      ...studentQ,
      state: savedAnswer?.state ?? 'not_seen',
      response: savedAnswer?.response ?? null,
      timeSpentMs: savedAnswer?.timeSpentMs ?? 0,
      visitCount: savedAnswer?.visitCount ?? 0,
      solveOrder: savedAnswer?.solveOrder ?? null,
      firstActionTimeMs: savedAnswer?.firstActionTimeMs ?? null,
      firstActionType: savedAnswer?.firstActionType ?? null,
      visitTimesMs: (savedAnswer?.visitTimesMs as number[]) ?? [],
      answerModifications: (savedAnswer?.answerModifications as AnswerModificationMeta) ?? null,
      modifiedAfter15s: Boolean(savedAnswer?.modifiedAfter15s),
    };
  });

  return result as AttemptQuestionDto[];
}
