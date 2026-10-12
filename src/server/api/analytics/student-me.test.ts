import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

const student1Id = '11111111-1111-4111-8111-111111111111';
const student2Id = '22222222-2222-4222-8222-222222222222';
const teacherId = '99999999-9999-4999-8999-999999999999';

let pg: PGlite;
let db: Db;

let currentSession = {
  userId: student1Id,
  username: 'student1',
  fullName: 'Student One',
  role: 'student',
  isProvisional: false,
};

vi.mock('@/lib/auth', () => ({
  apiSession: vi.fn(async () => currentSession),
  getSession: vi.fn(async () => currentSession),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

describe('GET /api/analytics/student/me - Teacher & Student Access', () => {
  beforeAll(async () => {
    pg = await PGlite.create();
    const files = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.sql'))
      .map((e) => e.name)
      .sort();

    for (const file of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await pg.exec(sql);
    }

    db = drizzle(pg, { schema }) as Db;

    // Seed student 1
    await db.insert(schema.profiles).values({
      id: student1Id,
      username: 'student1',
      fullName: 'Student One',
      email: 'student1@srsma.local',
      role: 'student',
      isActive: true,
      canLogin: true,
      city: null,
    });

    // Seed student 2
    await db.insert(schema.profiles).values({
      id: student2Id,
      username: 'student2',
      fullName: 'Student Two',
      email: 'student2@srsma.local',
      role: 'student',
      isActive: true,
      canLogin: true,
      city: 'Delhi',
    });

    // Seed teacher
    await db.insert(schema.profiles).values({
      id: teacherId,
      username: 'teacher1',
      fullName: 'Faculty One',
      email: 'teacher1@srsma.local',
      role: 'teacher',
      isActive: true,
      canLogin: true,
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('student gets their own analytics and respects whatsapp consent unlock state', async () => {
    currentSession = {
      userId: student1Id,
      username: 'student1',
      fullName: 'Student One',
      role: 'student',
      isProvisional: false,
    };

    const { GET } = await import('./student-me');
    const req = new Request('http://localhost/api/analytics/student/me');
    const res = await GET(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.studentId).toBe(student1Id);
    expect(body.studentName).toBe('Student One');
    expect(body.isReportUnlocked).toBe(false);
  });

  it('student passing studentId param cannot view another student data', async () => {
    currentSession = {
      userId: student1Id,
      username: 'student1',
      fullName: 'Student One',
      role: 'student',
      isProvisional: false,
    };

    const { GET } = await import('./student-me');
    const req = new Request(`http://localhost/api/analytics/student/me?studentId=${student2Id}`);
    const res = await GET(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    // Must still return student1 data, NOT student2!
    expect(body.studentId).toBe(student1Id);
    expect(body.studentName).toBe('Student One');
  });

  it('teacher can view student2 analytics with auto-unlocked report', async () => {
    currentSession = {
      userId: teacherId,
      username: 'teacher1',
      fullName: 'Faculty One',
      role: 'teacher',
      isProvisional: false,
    };

    const { GET } = await import('./student-me');
    const req = new Request(`http://localhost/api/analytics/student/me?studentId=${student2Id}`);
    const res = await GET(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.studentId).toBe(student2Id);
    expect(body.studentName).toBe('Student Two');
    expect(body.isReportUnlocked).toBe(true);
  });

  it('teacher can view student1 analytics with auto-unlocked report even if student has not consented', async () => {
    currentSession = {
      userId: teacherId,
      username: 'teacher1',
      fullName: 'Faculty One',
      role: 'teacher',
      isProvisional: false,
    };

    const { GET } = await import('./student-me');
    const req = new Request(`http://localhost/api/analytics/student/me?studentId=${student1Id}`);
    const res = await GET(req as any, {} as any);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.studentId).toBe(student1Id);
    expect(body.studentName).toBe('Student One');
    expect(body.isReportUnlocked).toBe(true);
  });

  it('teacher requesting non-existent student returns 404', async () => {
    currentSession = {
      userId: teacherId,
      username: 'teacher1',
      fullName: 'Faculty One',
      role: 'teacher',
      isProvisional: false,
    };

    const { GET } = await import('./student-me');
    const req = new Request('http://localhost/api/analytics/student/me?studentId=00000000-0000-0000-0000-000000000000');
    const res = await GET(req as any, {} as any);
    expect(res.status).toBe(404);
  });
});
