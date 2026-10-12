import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

const teacherId = '99999999-9999-4999-8999-999999999999';
const enrolledStudentId = '11111111-1111-4111-8111-111111111111';
const prospectiveStudentId = '22222222-2222-4222-8222-222222222222';
const testId = '33333333-3333-4333-8333-333333333333';
const qId = '44444444-4444-4444-8444-444444444444';

let pg: PGlite;
let db: Db;

const teacherSession = {
  userId: teacherId,
  username: 'teacher1',
  fullName: 'Teacher One',
  role: 'teacher',
  isProvisional: false,
};

vi.mock('@/lib/auth', () => ({
  apiTeacher: vi.fn(async () => teacherSession),
  apiSession: vi.fn(async () => teacherSession),
  getSession: vi.fn(async () => teacherSession),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

describe('GET /api/analytics/cohort - Enrollment Filtering & Prospective Leads', () => {
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

    // Seed teacher
    await db.insert(schema.profiles).values({
      id: teacherId,
      username: 'teacher1',
      fullName: 'Teacher One',
      email: 'teacher1@srsma.local',
      role: 'teacher',
      isActive: true,
      canLogin: true,
    });

    // Seed enrolled student
    await db.insert(schema.profiles).values({
      id: enrolledStudentId,
      username: 'enrolled_student',
      fullName: 'Enrolled Student',
      email: 'enrolled@srsma.local',
      phone: '+919876543210',
      role: 'student',
      batch: 'Batch Alpha',
      isActive: true,
      canLogin: true,
      isProvisional: false,
    });

    // Seed prospective lead student
    await db.insert(schema.profiles).values({
      id: prospectiveStudentId,
      username: 'prospective_lead',
      fullName: 'Prospective Student',
      email: 'prospective@student.srsma.local',
      phone: '+919123456789',
      role: 'student',
      batch: 'Prospective',
      classLevel: '10',
      city: 'Pune',
      school: 'DAV Public School',
      board: 'CBSE',
      isActive: true,
      canLogin: true,
      isProvisional: true,
    });

    // Seed a test
    await db.insert(schema.tests).values({
      id: testId,
      title: 'Board Readiness Diagnostic Test',
      durationS: 3600,
      maxAttempts: 1,
      isPublished: true,
      audience: 'public',
      createdBy: teacherId,
    });

    // Seed a question
    await db.insert(schema.questions).values({
      id: qId,
      humanCode: 'Q-DIAG-01',
      subject: 'physics',
      chapter: 'Light and Optics',
      type: 'mcq',
      body: 'What is the speed of light?',
      options: [
        { key: 'A', body: '3x10^8 m/s' },
        { key: 'B', body: '4x10^8 m/s' },
      ],
      answer: { key: 'A' },
      status: 'verified',
      createdBy: teacherId,
      lastEditedBy: teacherId,
    });

    await db.insert(schema.testQuestions).values({
      testId,
      questionId: qId,
      position: 1,
      marksCorrect: '4',
      marksWrong: '-1',
      marksUnattempted: '0',
    });

    // Seed attempt for prospective lead student
    const [proAttempt] = await db
      .insert(schema.attempts)
      .values({
        testId,
        studentId: prospectiveStudentId,
        attemptNo: 1,
        status: 'submitted',
        totalMarks: '4',
        maxMarks: '4',
        startedAt: new Date(),
        submittedAt: new Date(),
        deadlineAt: new Date(),
        questionOrder: [qId],
      })
      .returning();

    await db.insert(schema.attemptAnswers).values({
      attemptId: proAttempt.id,
      questionId: qId,
      isCorrect: true,
      response: { key: 'A' },
      timeSpentMs: 45000,
    });

    // Seed attempt for enrolled student
    const [enAttempt] = await db
      .insert(schema.attempts)
      .values({
        testId,
        studentId: enrolledStudentId,
        attemptNo: 1,
        status: 'submitted',
        totalMarks: '0',
        maxMarks: '4',
        startedAt: new Date(),
        submittedAt: new Date(),
        deadlineAt: new Date(),
        questionOrder: [qId],
      })
      .returning();

    await db.insert(schema.attemptAnswers).values({
      attemptId: enAttempt.id,
      questionId: qId,
      isCorrect: false,
      response: { key: 'B' },
      timeSpentMs: 30000,
    });
  });

  afterAll(async () => {
    await pg.close();
  });

  it('defaults to prospective leads and returns prospective lead reporting and details', async () => {
    const { GET } = await import('./cohort');
    const req = new Request('http://localhost/api/analytics/cohort');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enrollment).toBe('provisional');
    expect(body.metrics.totalStudents).toBe(1);
    expect(body.metrics.totalAttemptsSubmitted).toBe(1);
    expect(body.metrics.avgScore).toBe(4);

    // Assert student rankings contains prospective student details
    expect(body.studentRankings).toHaveLength(1);
    const prospective = body.studentRankings[0];
    expect(prospective.studentId).toBe(prospectiveStudentId);
    expect(prospective.fullName).toBe('Prospective Student');
    expect(prospective.phone).toBe('+919123456789');
    expect(prospective.classLevel).toBe('10');
    expect(prospective.city).toBe('Pune');
    expect(prospective.school).toBe('DAV Public School');
    expect(prospective.board).toBe('CBSE');
    expect(prospective.isProvisional).toBe(true);
    expect(prospective.testsTaken).toBe(1);
    expect(prospective.avgScore).toBe(4);
    expect(prospective.avgPercentile).toBe(0); // Only 1 attempt in cohort partition

    // Batch summaries
    expect(body.batchSummaries).toHaveLength(1);
    expect(body.batchSummaries[0].batch).toBe('Prospective');
    expect(body.batchSummaries[0].studentCount).toBe(1);
  });

  it('filters by enrollment=enrolled and returns enrolled student reporting only', async () => {
    const { GET } = await import('./cohort');
    const req = new Request('http://localhost/api/analytics/cohort?enrollment=enrolled');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enrollment).toBe('enrolled');
    expect(body.metrics.totalStudents).toBe(1);
    expect(body.metrics.totalAttemptsSubmitted).toBe(1);
    expect(body.metrics.avgScore).toBe(0);

    expect(body.studentRankings).toHaveLength(1);
    expect(body.studentRankings[0].studentId).toBe(enrolledStudentId);
    expect(body.studentRankings[0].fullName).toBe('Enrolled Student');
    expect(body.studentRankings[0].isProvisional).toBe(false);

    expect(body.batchSummaries).toHaveLength(1);
    expect(body.batchSummaries[0].batch).toBe('Batch Alpha');
  });

  it('filters by enrollment=all and aggregates both categories', async () => {
    const { GET } = await import('./cohort');
    const req = new Request('http://localhost/api/analytics/cohort?enrollment=all');
    const res = await GET(req, { params: Promise.resolve({}) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.enrollment).toBe('all');
    expect(body.metrics.totalStudents).toBe(2);
    expect(body.metrics.totalAttemptsSubmitted).toBe(2);
    expect(body.metrics.avgScore).toBe(2); // (4 + 0) / 2

    expect(body.studentRankings).toHaveLength(2);
    // Highest score first
    expect(body.studentRankings[0].studentId).toBe(prospectiveStudentId);
    expect(body.studentRankings[1].studentId).toBe(enrolledStudentId);
  });
});
