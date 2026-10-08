import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
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
const teacherId = '99999999-9999-4999-8999-999999999999';

let pg: PGlite;
let db: Db;

const currentSession = {
  userId: student1Id,
  username: 'student1',
  fullName: 'Student One',
  role: 'student',
  isProvisional: false,
};

vi.mock('@/lib/session', () => ({
  getSession: vi.fn(async () => currentSession),
}));

vi.mock('@/db/client', () => ({
  getDb: vi.fn(async () => db),
}));

// Mock StudentChrome to inspect children
vi.mock('../StudentChrome', () => ({
  StudentChrome: ({ children }: { children: React.ReactNode }) => children,
}));

describe('StudentDashboardView - Pre-Unlock vs Unlocked Diagnostic Tests', () => {
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

    // Seed student 1 (report NOT unlocked initially: no whatsappConsent or city)
    await db.insert(schema.profiles).values({
      id: student1Id,
      username: 'student1',
      fullName: 'Student One',
      email: 'student1@srsma.local',
      role: 'student',
      isActive: true,
      canLogin: true,
      whatsappConsent: false,
      city: null,
    });

    // Seed teacher
    await db.insert(schema.profiles).values({
      id: teacherId,
      username: 'teacher',
      fullName: 'Teacher',
      email: 'teacher@srsma.local',
      role: 'teacher',
      isActive: true,
      canLogin: true,
    });

    // Seed Test Set A & Test Set B
    await db.insert(schema.tests).values([
      {
        id: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        title: 'JEE Online Test Set A',
        description: 'A Diagnostic Test for Class 10 Students.',
        durationS: 1200,
        audience: 'public',
        isPublished: true,
        createdBy: teacherId,
      },
      {
        id: 'bbbbbbb2-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        title: 'JEE Online Test Set B',
        description: 'A Diagnostic Test for Class 10 Students.',
        durationS: 1200,
        audience: 'public',
        isPublished: true,
        createdBy: teacherId,
      },
    ]);
  });

  afterAll(async () => {
    await pg.close();
  });

  it('displays all published tests with their actual database titles', async () => {
    const { StudentDashboardView } = await import('./StudentDashboardView');
    const jsx = await StudentDashboardView();

    // Render JSX tree to HTML string to assert rendering
    const html = renderToStaticMarkup(jsx!);

    // Header count must indicate 2 total
    expect(html).toContain('2 total');

    // Both tests shown with their actual titles
    expect(html).toContain('JEE Online Test Set A');
    expect(html).toContain('JEE Online Test Set B');

    // Welcome banner indicates JEE Online Test Preparation
    expect(html).toContain('JEE Online Test Preparation');

    // Without any completed tests, button must say "View Sample Report"
    expect(html).toContain('View Sample Report');
    expect(html).not.toContain('View My Report');
  });

  it('after completing a test: button displays "View My Report"', async () => {
    // Insert a completed attempt for student 1
    await db.insert(schema.attempts).values({
      id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      studentId: student1Id,
      testId: 'aaaaaaa1-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      attemptNo: 1,
      status: 'submitted',
      startedAt: new Date(Date.now() - 3600_000),
      deadlineAt: new Date(Date.now() - 1800_000),
      submittedAt: new Date(),
      questionOrder: [],
      totalMarks: '18',
      maxMarks: '20',
      totalTimeS: 1100,
    });

    const { StudentDashboardView } = await import('./StudentDashboardView');
    const jsx = await StudentDashboardView();

    const html = renderToStaticMarkup(jsx!);

    // With a completed test, button must say "View My Report"
    expect(html).toContain('View My Report');
    expect(html).not.toContain('View Sample Report');
  });
});

