import fs from 'node:fs';
import path from 'node:path';

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath) && typeof process.loadEnvFile === 'function') {
  try {
    process.loadEnvFile(envPath);
  } catch {}
}

import { sql } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client';
import { profiles } from '../src/db/schema';

async function main() {
  const phone = '+918277487290';
  const cleanDigits = '8277487290';
  const fullName = 'Student';
  const classLevel = '10';
  const username = `student_${cleanDigits}`;
  const email = `${cleanDigits}@student.srsma.local`;

  console.log(`[seed-student] provisioning student account for phone: ${phone}...`);
  const db = await getDb();

  const [existing] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      sql`${profiles.phone} = ${phone} OR ${profiles.phone} = ${cleanDigits} OR ${profiles.phone} = ${'+' + cleanDigits} OR lower(${profiles.username}) = lower(${username})`
    )
    .limit(1);

  if (existing) {
    await db
      .update(profiles)
      .set({
        phone,
        fullName,
        role: 'student',
        classLevel,
        batch: `Class ${classLevel}`,
        phoneVerified: true,
        isActive: true,
        canLogin: true,
      })
      .where(sql`${profiles.id} = ${existing.id}`);
    console.log(`[seed-student] updated existing student profile: ${existing.id}`);
  } else {
    const [inserted] = await db
      .insert(profiles)
      .values({
        username,
        email,
        phone,
        fullName,
        role: 'student',
        classLevel,
        batch: `Class ${classLevel}`,
        phoneVerified: true,
        isActive: true,
        canLogin: true,
      })
      .returning({ id: profiles.id });
    console.log(`[seed-student] created new student profile: ${inserted.id}`);
  }

  console.log('[seed-student] student profile ready for phone login!');
}

main()
  .catch((err) => {
    console.error('[seed-student] error:', err);
    process.exitCode = 1;
  })
  .finally(() => closeDb());
