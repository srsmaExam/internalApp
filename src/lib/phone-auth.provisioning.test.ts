import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

/**
 * FBR-03 regression: phone login previously auto-provisioned a fully-entitled
 * student account for any 7-15 digit number, with zero credentials. This test
 * exercises the actual `loginWithPhone` provisioning path end to end and
 * asserts the resulting account/session is provisional and un-entitled.
 */

const ROOT = path.resolve(import.meta.dirname, '../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

let pg: PGlite;
let db: Db;

// A hermetic, in-memory cookie jar so issueSession()/getSession() (which call
// next/headers' cookies()) don't require a real Next.js request scope, and
// don't fall back to writing a secret file under the repo's real DATA_DIR.
const cookieStore = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => (cookieStore.has(name) ? { value: cookieStore.get(name) } : undefined),
    set: (name: string, value: string) => {
      cookieStore.set(name, value);
    },
    delete: (name: string) => {
      cookieStore.delete(name);
    },
  })),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

describe('loginWithPhone provisioning (FBR-03)', () => {
  const enrolledStudentId = '55555555-5555-4555-8555-555555555555';

  beforeAll(async () => {
    process.env.SESSION_SECRET = 'a'.repeat(32);

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

    // A real, teacher-enrolled student for the "existing account" path.
    await db.insert(schema.profiles).values({
      id: enrolledStudentId,
      username: 'enrolled_student',
      email: 'enrolled@example.com',
      fullName: 'Enrolled Student',
      role: 'student',
      phone: '+919999999999',
      batch: 'JEE-2027-A',
      passwordHash: 'x',
      isActive: true,
      canLogin: true,
      isProvisional: false,
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('auto-provisions a brand-new phone number as provisional, not a full student', async () => {
    const { loginWithPhone } = await import('./auth');
    const session = await loginWithPhone('+91', '5555500001');

    expect(session.isProvisional).toBe(true);

    const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, session.userId));
    expect(row.isProvisional).toBe(true);
    expect(row.batch).toBe('Prospective');
    expect(row.canLogin).toBe(true); // the frictionless funnel must still work
  });

  it('an existing enrolled student logging in by phone gets a non-provisional session', async () => {
    const { loginWithPhone } = await import('./auth');
    const session = await loginWithPhone('+91', '9999999999');

    expect(session.userId).toBe(enrolledStudentId);
    expect(session.isProvisional).toBe(false);
  });

  it('getSession() defaults isProvisional to false for a token issued before the field existed', async () => {
    const { SignJWT } = await import('jose');
    const { SESSION_COOKIE } = await import('./session');

    const key = new TextEncoder().encode(process.env.SESSION_SECRET);
    const legacyToken = await new SignJWT({ username: 'legacy', fullName: 'Legacy User', role: 'student' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(enrolledStudentId)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);

    cookieStore.set(SESSION_COOKIE, legacyToken);

    const { getSession } = await import('./session');
    const session = await getSession();
    expect(session?.isProvisional).toBe(false);
  });

  it('provisions student with custom fullName and classLevel when provided', async () => {
    const { loginWithPhone } = await import('./auth');
    const session = await loginWithPhone('+91', '9123456789', {
      fullName: 'Rahul Sharma',
      classLevel: '10',
    });

    expect(session.fullName).toBe('Rahul Sharma');
    const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, session.userId));
    expect(row.fullName).toBe('Rahul Sharma');
    expect(row.classLevel).toBe('10');
    expect(row.batch).toBe('Class 10');
    expect(row.isProvisional).toBe(true);
  });

  it('updates student city and board for detailed report', async () => {
    const { loginWithPhone } = await import('./auth');
    const session = await loginWithPhone('+91', '9123456780', {
      fullName: 'Pooja Reddy',
      classLevel: '12',
    });

    await db
      .update(schema.profiles)
      .set({
        city: 'Hyderabad',
        board: 'CBSE Board',
      })
      .where(eq(schema.profiles.id, session.userId));

    const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, session.userId));
    expect(row.city).toBe('Hyderabad');
    expect(row.board).toBe('CBSE Board');
  });
});
