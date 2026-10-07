import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { apiStudentFast } from '@/lib/auth';
import { HttpError, json, withApi } from '@/lib/http';
import { getDb } from '@/db/client';
import { attempts } from '@/db/schema';
import { gradeAndCloseAttempt, saveAttemptAnswersBatch } from '@/lib/attempts';
import { withDbLock } from '@/lib/db-lock';

type Ctx = { params: Promise<{ id: string }> };

const patchAnswersSchema = z.object({
  answers: z.array(
    z.object({
      questionId: z.string().uuid(),
      response: z
        .object({
          key: z.string().optional(),
          value: z.union([z.number(), z.string()]).optional(),
        })
        .nullable()
        .optional(),
      state: z
        .enum(['not_seen', 'seen_unanswered', 'answered', 'answered_flagged', 'flagged_unanswered'])
        .optional(),
      timeSpentMs: z.number().int().min(0).optional(),
      visitCount: z.number().int().min(0).optional(),
      solveOrder: z.number().int().positive().nullable().optional(),
      firstActionTimeMs: z.number().int().min(0).nullable().optional(),
      firstActionType: z.string().nullable().optional(),
      visitTimesMs: z.array(z.number().int().min(0)).optional(),
      answerModifications: z
        .object({
          count: z.number().int().min(0),
          modifiedAfter15s: z.boolean(),
          after15sCount: z.number().int().min(0),
          history: z.array(z.any()),
        })
        .nullable()
        .optional(),
      modifiedAfter15s: z.boolean().optional(),
    }),
  ),
});

const handler = withApi<Ctx>(async (req, { params }) => {
  const session = await apiStudentFast();
  const { id: attemptId } = await params;
  const db = await getDb();

  const [attempt] = await db
    .select({
      id: attempts.id,
      studentId: attempts.studentId,
      status: attempts.status,
      deadlineAt: attempts.deadlineAt,
      timeExtensionsCount: attempts.timeExtensionsCount,
      questionOrder: attempts.questionOrder,
    })
    .from(attempts)
    .where(eq(attempts.id, attemptId));
  if (!attempt) throw new HttpError(404, 'not_found', 'Attempt not found');
  if (attempt.studentId !== session.userId) {
    throw new HttpError(403, 'forbidden', 'You cannot save answers for another student’s attempt.');
  }


  // Check status
  if (attempt.status !== 'in_progress') {
    throw new HttpError(403, 'attempt_closed', 'This attempt is no longer in progress.');
  }

  // Past the deadline: close AND grade.
  // If extensions remain (< 2), allow a 90s grace period so periodic autosaves
  // don't prematurely auto-submit while the student considers the 60s extension prompt.
  const currentExtensions = attempt.timeExtensionsCount ?? 0;
  const deadlineMs = new Date(attempt.deadlineAt).getTime();
  const gracePeriodMs = currentExtensions < 2 ? 90 * 1000 : 0;
  if (Date.now() > deadlineMs + gracePeriodMs) {
    await gradeAndCloseAttempt(db, attemptId, 'auto_submitted');
    throw new HttpError(403, 'attempt_expired', 'Your time is up. This attempt has been auto-submitted.');
  }

  // sendBeacon (used by the beforeunload flush) always sends
  // Content-Type: text/plain, so the body is read as text and parsed by hand
  // rather than relying on req.json()'s content-type sniffing.
  const rawBody = await req.text().catch(() => '');
  let body: unknown;
  try {
    body = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    throw new HttpError(400, 'invalid_request', 'Expected a JSON body.');
  }

  const parsed = patchAnswersSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(422, 'validation_failed', 'Invalid answers payload', {
      issues: parsed.error.issues,
    });
  }

  const { answers } = parsed.data;
  const now = new Date();

  // Only questions actually in this attempt may be written.
  const inAttempt = new Set(attempt.questionOrder);
  const accepted = answers.filter((a) => inAttempt.has(a.questionId));

  if (accepted.length === 0) {
    return json({ ok: true, count: 0, savedAt: now.toISOString() });
  }

  await withDbLock(async () => {
    await saveAttemptAnswersBatch(db, attemptId, accepted, now);
  });

  return json({ ok: true, count: accepted.length, savedAt: now.toISOString() });
});

export const PATCH = handler;

/**
 * navigator.sendBeacon can only issue POST, so the beforeunload flush hit a
 * PATCH-only route and 405'd on every unload — silently, because a beacon has
 * no response to inspect. Same handler, both verbs.
 */
export const POST = handler;
