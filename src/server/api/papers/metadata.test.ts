import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, beforeAll, afterAll, vi } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import * as schema from '@/db/schema';
import type { Db } from '@/db/client';

const ROOT = path.resolve(import.meta.dirname, '../../../..');
const MIGRATIONS_DIR = path.join(ROOT, 'drizzle');

let pg: PGlite;
let db: Db;

const teacherId = '11111111-1111-4111-8111-111111111111';
const currentSession: { userId: string; role: string; fullName: string } | null = {
  userId: teacherId,
  role: 'teacher',
  fullName: 'Teacher One',
};

vi.mock('@/lib/auth', () => ({
  apiTeacher: vi.fn(async () => {
    if (!currentSession || currentSession.role !== 'teacher') {
      const { HttpError } = await import('@/lib/http');
      throw new HttpError(403, 'forbidden', 'Teacher only');
    }
    return currentSession;
  }),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

async function getMetadata(paperId: string) {
  const { GET } = await import('./metadata');
  const req = new Request(`http://localhost/api/papers/${paperId}/metadata`, {
    method: 'GET',
  });
  return GET(req, { params: Promise.resolve({ id: paperId }) });
}

async function putMetadata(paperId: string, payload: Record<string, unknown>) {
  const { PUT } = await import('./metadata');
  const req = new Request(`http://localhost/api/papers/${paperId}/metadata`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return PUT(req, { params: Promise.resolve({ id: paperId }) });
}

describe('Paper Metadata API: GET and PUT /api/papers/:id/metadata', () => {
  const paperId = '33333333-3333-4333-8333-333333333333';
  const qId1 = '44444444-4444-4444-8444-444444444441';
  const qId2 = '44444444-4444-4444-8444-444444444442';
  const foreignQid = '55555555-5555-4555-8555-555555555555';

  beforeAll(async () => {
    pg = await PGlite.create();
    db = drizzle(pg, { schema }) as unknown as Db;

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    for (const f of files) {
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), 'utf-8');
      await pg.exec(sql);
    }

    // Seed teacher
    await db.insert(schema.profiles).values({
      id: teacherId,
      fullName: 'Teacher One',
      email: 'teacher@test.local',
      username: 'teacher1',
      role: 'teacher',
    });

    // Seed paper
    await db.insert(schema.papers).values({
      id: paperId,
      title: 'Class 10 JEE Test Paper',
      code: 'CLASS10-JEE-SET-A',
      registeredBy: teacherId,
      filePath: 'dummy.pdf',
      originalFilename: 'dummy.pdf',
      fileSizeBytes: 1024,
      sha256: 'abc123sha',
    });

    // Seed questions
    await db.insert(schema.questions).values([
      {
        id: qId1,
        paperId,
        sourceQno: 1,
        subject: 'maths',
        type: 'mcq',
        body: 'Find x',
        options: [
          { key: 'A', body: '1' },
          { key: 'B', body: '2' },
        ],
        answer: { key: 'A' },
        difficulty: 1,
        expectedTimeS: 60,
        chapter: 'Algebra',
        topic: 'Polynomials',
        metadata: { primarySkill: 'Calculation' },
      },
      {
        id: qId2,
        paperId,
        sourceQno: 2,
        subject: 'physics',
        type: 'mcq',
        body: 'Find Force',
        options: [
          { key: 'A', body: '10N' },
          { key: 'B', body: '20N' },
        ],
        answer: { key: 'A' },
        difficulty: 2,
        expectedTimeS: 90,
        chapter: 'Mechanics',
        topic: 'Laws of Motion',
      },
      {
        id: foreignQid,
        paperId: null, // Not in this paper
        sourceQno: 1,
        subject: 'chemistry',
        type: 'mcq',
        body: 'Find pH',
        options: [
          { key: 'A', body: '7' },
          { key: 'B', body: '8' },
        ],
        answer: { key: 'A' },
      },
    ]);
  });

  afterAll(async () => {
    await pg.close();
  });

  it('GET returns all questions belonging to the paper with their metadata', async () => {
    const res = await getMetadata(paperId);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.paper.title).toBe('Class 10 JEE Test Paper');
    expect(body.questions).toHaveLength(2);
    expect(body.questions[0].id).toBe(qId1);
    expect(body.questions[0].chapter).toBe('Algebra');
    expect(body.questions[0].metadata?.primarySkill).toBe('Calculation');
    expect(body.questions[1].id).toBe(qId2);
  });

  it('PUT updates metadata, chapters, and profiling across paper questions', async () => {
    const payload = {
      questions: [
        {
          questionId: qId1,
          chapter: 'Real Numbers',
          topic: 'Euclid Division',
          difficulty: 2,
          expectedTimeS: 75,
          metadata: {
            primarySkill: 'Concept Application',
            diagnosticWeight: 3,
            cognitiveLevel: 'Application',
          },
        },
      ],
    };

    const res = await putMetadata(paperId, payload);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.count).toBe(1);

    const [updatedQ1] = await db
      .select()
      .from(schema.questions)
      .where(eq(schema.questions.id, qId1));
    expect(updatedQ1.chapter).toBe('Real Numbers');
    expect(updatedQ1.topic).toBe('Euclid Division');
    expect(updatedQ1.difficulty).toBe(2);
    expect(updatedQ1.expectedTimeS).toBe(75);
    expect(updatedQ1.metadata?.primarySkill).toBe('Concept Application');
    expect(updatedQ1.metadata?.diagnosticWeight).toBe(3);
  });

  it('PUT rejects if questions do not belong to this paper', async () => {
    const payload = {
      questions: [{ questionId: foreignQid, metadata: { primarySkill: 'Test' } }],
    };

    const res = await putMetadata(paperId, payload);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('unassigned_questions');
  });
});
