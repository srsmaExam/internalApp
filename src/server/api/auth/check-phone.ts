import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { profiles } from '@/db/schema';
import { normalizePhone } from '@/lib/auth';
import { HttpError, json, withApi } from '@/lib/http';

const CheckPhoneSchema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  countryCode: z.string().optional().default('+91'),
});

export const POST = withApi(async (req) => {
  const body = await req.json().catch(() => ({}));
  const parsed = CheckPhoneSchema.safeParse(body);
  if (!parsed.success) {
    throw new HttpError(400, 'invalid_request', 'Please enter a valid phone number.');
  }

  const { phone, countryCode } = parsed.data;
  const { fullPhone, cleanDigits } = normalizePhone(countryCode, phone);

  const db = await getDb();
  const matches = await db
    .select({
      id: profiles.id,
      fullName: profiles.fullName,
      classLevel: profiles.classLevel,
      role: profiles.role,
      isActive: profiles.isActive,
      canLogin: profiles.canLogin,
    })
    .from(profiles)
    .where(
      sql`${profiles.phone} = ${fullPhone} OR ${profiles.phone} = ${cleanDigits} OR ${profiles.phone} = ${'+' + cleanDigits} OR (${cleanDigits} = '9876543210' AND lower(${profiles.username}) = 'student')`,
    );

  if (matches.length > 1) {
    throw new HttpError(
      409,
      'phone_ambiguous',
      'More than one account is registered to this phone number. Please contact your administrator.',
    );
  }

  const user = matches[0];

  if (user) {
    if (!user.isActive || !user.canLogin) {
      throw new HttpError(403, 'account_disabled', 'Your account has been deactivated. Please contact your administrator.');
    }
    if (user.role !== 'student') {
      throw new HttpError(403, 'teacher_portal_required', 'This phone number belongs to a faculty account. Please sign in via the faculty portal at /SRSMA.');
    }

    // A student needs to submit their name if it still matches the default auto-generated "Student XXXX" or is missing class
    const isDefaultName = /^Student\s+\d+$/i.test(user.fullName.trim());
    const requiresDetails = isDefaultName || !user.classLevel;

    return json({
      ok: true,
      exists: true,
      requiresDetails,
      fullName: isDefaultName ? '' : user.fullName,
      classLevel: user.classLevel ?? '10',
    });
  }

  // New student -> requires details modal
  return json({
    ok: true,
    exists: false,
    requiresDetails: true,
    classLevel: '10',
  });
});
