import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { profiles, studentLeadActions } from '@/db/schema';
import { getSession } from '@/lib/auth';
import { HttpError, json, withApi } from '@/lib/http';

const LeadActionSchema = z.object({
  action: z.enum(['whatsapp_contact_us', 'whatsapp_enroll_now']),
  attemptId: z.string().uuid().optional().nullable(),
  source: z.string().max(100).optional(),
});

export const POST = withApi(async (req) => {
  const session = await getSession();
  if (!session || !session.userId) {
    throw new HttpError(401, 'unauthorized', 'Please sign in to track action.');
  }

  const body = await req.json().catch(() => ({}));
  const parsed = LeadActionSchema.safeParse(body);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? 'Invalid lead action payload.';
    throw new HttpError(400, 'invalid_request', issue);
  }

  const { action, attemptId, source = 'report_page_5' } = parsed.data;
  const db = await getDb();

  // 1. Record lead action log
  await db.insert(studentLeadActions).values({
    studentId: session.userId,
    attemptId: attemptId || null,
    action,
    source,
  });


  return json({
    ok: true,
    action,
    recorded: true,
  });
});
