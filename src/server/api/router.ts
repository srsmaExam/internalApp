import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

/**
 * ============================================================================
 * UNIFIED API ROUTER — ARCHITECTURE & PURPOSE
 * ============================================================================
 *
 * WHY THIS EXISTS:
 * 1. Vercel Hobby Plan Limit:
 *    On Vercel's free Hobby plan, deployments are strictly capped at 12
 *    Serverless Functions. Next.js App Router packages every `route.ts` as an
 *    independent Lambda bundle. With 39 API routes, the platform breached this
 *    limit (39 > 12) and failed builds with:
 *    "No more than 12 Serverless Functions can be added to a Deployment on the Hobby plan."
 *
 * 2. 100% Free Forever ($0.00/mo):
 *    Rather than requiring a paid Vercel Pro plan ($20/month/seat), this router
 *    consolidates all 39 API endpoints into a SINGLE Serverless Function:
 *    `/api/[[...slug]]/route.ts`.
 *
 * 3. Cold Start & Performance Advantage:
 *    In a 39-lambda architecture, each endpoint experiences independent cold
 *    starts. With a unified router, the shared runtime container (db pool, auth,
 *    zod schemas) stays warm across user flows (login -> fetch questions ->
 *    submit answer -> view results), drastically improving real-world latency.
 *
 * 4. Zero API Contract Changes:
 *    All URLs (/api/auth/login, /api/papers/[id]/pdf, /api/cron/sweep-expired, etc.)
 *    remain 100% identical. Frontend components, mobile app, and external cron
 *    services require zero modifications.
 * ============================================================================
 */

// 1. Auth Handlers
import * as authLogin from './auth/login';
import * as authLogout from './auth/logout';
import * as authCheckPhone from './auth/check-phone';
import * as studentLeadAction from './student/lead-action';
import * as studentFeedback from './student/feedback';

// 2. Cron Handlers
import * as cronSweep from './cron/sweep-expired';

// 3. Batches Handlers
import * as batches from './batches/index';

// 4. Student Management Handlers
import * as students from './students/index';
import * as studentsById from './students/by-id';
import * as studentsBulkBatch from './students/bulk-batch';
import * as studentsBulkDelete from './students/bulk-delete';
import * as studentsBulkImport from './students/bulk-import';

// 5. Question Bank Handlers
import * as questions from './questions/index';
import * as questionsBulk from './questions/bulk';
import * as questionsIngest from './questions/ingest';
import * as questionsTaxonomy from './questions/taxonomy';
import * as questionsById from './questions/by-id';
import * as questionsVerify from './questions/verify';
import * as questionsVerifySolution from './questions/verify-solution';
import * as questionsImages from './questions/images';
import * as questionsImageById from './questions/image-by-id';

// 6. Paper Archive Handlers
import * as papers from './papers/index';
import * as papersById from './papers/by-id';
import * as papersIngest from './papers/ingest';
import * as papersPdf from './papers/pdf';
import * as papersMetadata from './papers/metadata';

// 7. Exam & Test Handlers
import * as tests from './tests/index';
import * as testsById from './tests/by-id';
import * as testsAttempts from './tests/attempts';
import * as testsClone from './tests/clone';
import * as testsPublish from './tests/publish';
import * as testsQuestions from './tests/questions';
import * as testsMetadata from './tests/metadata';
import * as testsReleaseResults from './tests/release-results';

// 8. Attempt Session Handlers
import * as attemptsById from './attempts/by-id';
import * as attemptsAnswers from './attempts/answers';
import * as attemptsExtendTime from './attempts/extend-time';
import * as attemptsQuestions from './attempts/questions';
import * as attemptsResult from './attempts/result';
import * as attemptsSubmit from './attempts/submit';

// 9. Analytics Handlers
import * as analyticsCohort from './analytics/cohort';
import * as analyticsStudentMe from './analytics/student-me';
import * as analyticsTestById from './analytics/test-by-id';
import * as analyticsTestExport from './analytics/test-export';
import * as analyticsTestExportQuestions from './analytics/test-export-questions';

// 10. File & Media Handlers
import * as filesImage from './files/image';

export type RouteMatch = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: Record<string, any>;
  params: Record<string, string>;
  pattern: string;
};

/**
 * Matches an incoming slug array to its corresponding API handler.
 * Performs deterministic O(1) matching with parameter extraction.
 */
export function matchRoute(slug: string[]): RouteMatch | null {
  const len = slug.length;
  const s0 = slug[0];
  const s1 = slug[1];
  const s2 = slug[2];
  const s3 = slug[3];

  if (len === 1) {
    if (s0 === 'batches') return { handler: batches, params: {}, pattern: '/api/batches' };
    if (s0 === 'students') return { handler: students, params: {}, pattern: '/api/students' };
    if (s0 === 'questions') return { handler: questions, params: {}, pattern: '/api/questions' };
    if (s0 === 'papers') return { handler: papers, params: {}, pattern: '/api/papers' };
    if (s0 === 'tests') return { handler: tests, params: {}, pattern: '/api/tests' };
  }

  if (len === 2) {
    // /api/auth/*
    if (s0 === 'auth') {
      if (s1 === 'login') return { handler: authLogin, params: {}, pattern: '/api/auth/login' };
      if (s1 === 'logout') return { handler: authLogout, params: {}, pattern: '/api/auth/logout' };
      if (s1 === 'check-phone') return { handler: authCheckPhone, params: {}, pattern: '/api/auth/check-phone' };
    }
    // /api/student/*
    if (s0 === 'student') {
      if (s1 === 'lead-action') return { handler: studentLeadAction, params: {}, pattern: '/api/student/lead-action' };
      if (s1 === 'feedback') return { handler: studentFeedback, params: {}, pattern: '/api/student/feedback' };
    }
    // /api/cron/*
    if (s0 === 'cron' && s1 === 'sweep-expired') {
      return { handler: cronSweep, params: {}, pattern: '/api/cron/sweep-expired' };
    }
    // /api/analytics/*
    if (s0 === 'analytics' && s1 === 'cohort') {
      return { handler: analyticsCohort, params: {}, pattern: '/api/analytics/cohort' };
    }
    // /api/students/*
    if (s0 === 'students') {
      if (s1 === 'bulk-batch') return { handler: studentsBulkBatch, params: {}, pattern: '/api/students/bulk-batch' };
      if (s1 === 'bulk-delete') return { handler: studentsBulkDelete, params: {}, pattern: '/api/students/bulk-delete' };
      if (s1 === 'bulk-import') return { handler: studentsBulkImport, params: {}, pattern: '/api/students/bulk-import' };
      return { handler: studentsById, params: { id: s1 }, pattern: '/api/students/[id]' };
    }
    // /api/questions/*
    if (s0 === 'questions') {
      if (s1 === 'bulk') return { handler: questionsBulk, params: {}, pattern: '/api/questions/bulk' };
      if (s1 === 'ingest') return { handler: questionsIngest, params: {}, pattern: '/api/questions/ingest' };
      if (s1 === 'taxonomy') return { handler: questionsTaxonomy, params: {}, pattern: '/api/questions/taxonomy' };
      return { handler: questionsById, params: { id: s1 }, pattern: '/api/questions/[id]' };
    }
    // /api/papers/*
    if (s0 === 'papers') {
      return { handler: papersById, params: { id: s1 }, pattern: '/api/papers/[id]' };
    }
    // /api/tests/*
    if (s0 === 'tests') {
      return { handler: testsById, params: { id: s1 }, pattern: '/api/tests/[id]' };
    }
    // /api/attempts/*
    if (s0 === 'attempts') {
      return { handler: attemptsById, params: { id: s1 }, pattern: '/api/attempts/[id]' };
    }
  }

  if (len === 3) {
    // /api/analytics/student/me
    if (s0 === 'analytics' && s1 === 'student' && s2 === 'me') {
      return { handler: analyticsStudentMe, params: {}, pattern: '/api/analytics/student/me' };
    }
    // /api/analytics/tests/[id]
    if (s0 === 'analytics' && s1 === 'tests') {
      return { handler: analyticsTestById, params: { id: s2 }, pattern: '/api/analytics/tests/[id]' };
    }
    // /api/questions/[id]/*
    if (s0 === 'questions') {
      if (s2 === 'verify') return { handler: questionsVerify, params: { id: s1 }, pattern: '/api/questions/[id]/verify' };
      if (s2 === 'verify-solution') return { handler: questionsVerifySolution, params: { id: s1 }, pattern: '/api/questions/[id]/verify-solution' };
      if (s2 === 'images') return { handler: questionsImages, params: { id: s1 }, pattern: '/api/questions/[id]/images' };
    }
    // /api/papers/[id]/*
    if (s0 === 'papers') {
      if (s2 === 'ingest') return { handler: papersIngest, params: { id: s1 }, pattern: '/api/papers/[id]/ingest' };
      if (s2 === 'pdf') return { handler: papersPdf, params: { id: s1 }, pattern: '/api/papers/[id]/pdf' };
      if (s2 === 'metadata') return { handler: papersMetadata, params: { id: s1 }, pattern: '/api/papers/[id]/metadata' };
    }
    // /api/tests/[id]/*
    if (s0 === 'tests') {
      if (s2 === 'attempts') return { handler: testsAttempts, params: { id: s1 }, pattern: '/api/tests/[id]/attempts' };
      if (s2 === 'clone') return { handler: testsClone, params: { id: s1 }, pattern: '/api/tests/[id]/clone' };
      if (s2 === 'publish') return { handler: testsPublish, params: { id: s1 }, pattern: '/api/tests/[id]/publish' };
      if (s2 === 'questions') return { handler: testsQuestions, params: { id: s1 }, pattern: '/api/tests/[id]/questions' };
      if (s2 === 'metadata') return { handler: testsMetadata, params: { id: s1 }, pattern: '/api/tests/[id]/metadata' };
      if (s2 === 'release-results') return { handler: testsReleaseResults, params: { id: s1 }, pattern: '/api/tests/[id]/release-results' };
    }
    // /api/attempts/[id]/*
    if (s0 === 'attempts') {
      if (s2 === 'answers') return { handler: attemptsAnswers, params: { id: s1 }, pattern: '/api/attempts/[id]/answers' };
      if (s2 === 'extend-time') return { handler: attemptsExtendTime, params: { id: s1 }, pattern: '/api/attempts/[id]/extend-time' };
      if (s2 === 'questions') return { handler: attemptsQuestions, params: { id: s1 }, pattern: '/api/attempts/[id]/questions' };
      if (s2 === 'result') return { handler: attemptsResult, params: { id: s1 }, pattern: '/api/attempts/[id]/result' };
      if (s2 === 'submit') return { handler: attemptsSubmit, params: { id: s1 }, pattern: '/api/attempts/[id]/submit' };
    }
  }

  if (len === 4) {
    // /api/analytics/tests/[id]/export.csv
    if (s0 === 'analytics' && s1 === 'tests' && s3 === 'export.csv') {
      return { handler: analyticsTestExport, params: { id: s2 }, pattern: '/api/analytics/tests/[id]/export.csv' };
    }
    // /api/analytics/tests/[id]/export-questions.csv
    if (s0 === 'analytics' && s1 === 'tests' && s3 === 'export-questions.csv') {
      return { handler: analyticsTestExportQuestions, params: { id: s2 }, pattern: '/api/analytics/tests/[id]/export-questions.csv' };
    }
    // /api/questions/[id]/images/[imageId]
    if (s0 === 'questions' && s2 === 'images') {
      return { handler: questionsImageById, params: { id: s1, imageId: s3 }, pattern: '/api/questions/[id]/images/[imageId]' };
    }
    // /api/files/images/[questionId]/[placeholder]
    if (s0 === 'files' && s1 === 'images') {
      return { handler: filesImage, params: { questionId: s2, placeholder: s3 }, pattern: '/api/files/images/[questionId]/[placeholder]' };
    }
  }

  return null;
}

/**
 * Dispatches an incoming request to the matching API handler.
 */
export async function dispatchApiRequest(req: NextRequest | Request, slug: string[] = []): Promise<Response> {
  const match = matchRoute(slug);
  if (!match) {
    return NextResponse.json(
      { error: 'not_found', message: `API endpoint /api/${slug.join('/')} not found` },
      { status: 404 },
    );
  }

  const method = req.method.toUpperCase();
  const endpointFn = match.handler[method];

  if (typeof endpointFn !== 'function') {
    const supportedMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].filter(
      (m) => typeof match.handler[m] === 'function',
    );
    return new Response(`Method ${method} Not Allowed`, {
      status: 405,
      headers: {
        Allow: supportedMethods.join(', '),
      },
    });
  }

  // Next.js 15 route handlers expect context: { params: Promise<Record<string, string>> }
  const ctx = {
    params: Promise.resolve(match.params),
  };

  return endpointFn(req, ctx);
}

/**
 * Route metadata list used for static verification and tests.
 */
export const ALL_REGISTERED_ROUTES: { pattern: string; verbs: string[] }[] = [
  { pattern: '/api/auth/login', verbs: ['POST'] },
  { pattern: '/api/auth/logout', verbs: ['POST'] },
  { pattern: '/api/auth/check-phone', verbs: ['POST'] },
  { pattern: '/api/student/lead-action', verbs: ['POST'] },
  { pattern: '/api/student/feedback', verbs: ['DELETE', 'GET', 'POST'] },
  { pattern: '/api/cron/sweep-expired', verbs: ['GET', 'POST'] },
  { pattern: '/api/batches', verbs: ['GET'] },
  { pattern: '/api/students', verbs: ['GET', 'POST'] },
  { pattern: '/api/students/[id]', verbs: ['DELETE', 'GET', 'PATCH'] },
  { pattern: '/api/students/bulk-batch', verbs: ['POST'] },
  { pattern: '/api/students/bulk-delete', verbs: ['POST'] },
  { pattern: '/api/students/bulk-import', verbs: ['POST'] },
  { pattern: '/api/questions', verbs: ['GET'] },
  { pattern: '/api/questions/[id]', verbs: ['DELETE', 'GET', 'PATCH'] },
  { pattern: '/api/questions/bulk', verbs: ['POST'] },
  { pattern: '/api/questions/ingest', verbs: ['POST'] },
  { pattern: '/api/questions/taxonomy', verbs: ['GET'] },
  { pattern: '/api/questions/[id]/verify', verbs: ['POST'] },
  { pattern: '/api/questions/[id]/verify-solution', verbs: ['POST'] },
  { pattern: '/api/questions/[id]/images', verbs: ['GET', 'POST'] },
  { pattern: '/api/questions/[id]/images/[imageId]', verbs: ['DELETE'] },
  { pattern: '/api/papers', verbs: ['GET', 'POST'] },
  { pattern: '/api/papers/[id]', verbs: ['DELETE', 'GET'] },
  { pattern: '/api/papers/[id]/ingest', verbs: ['POST'] },
  { pattern: '/api/papers/[id]/pdf', verbs: ['GET'] },
  { pattern: '/api/papers/[id]/metadata', verbs: ['GET', 'PUT'] },
  { pattern: '/api/tests', verbs: ['GET', 'POST'] },
  { pattern: '/api/tests/[id]', verbs: ['DELETE', 'GET', 'PATCH'] },
  { pattern: '/api/tests/[id]/attempts', verbs: ['POST'] },
  { pattern: '/api/tests/[id]/clone', verbs: ['POST'] },
  { pattern: '/api/tests/[id]/publish', verbs: ['DELETE', 'POST'] },
  { pattern: '/api/tests/[id]/questions', verbs: ['PUT'] },
  { pattern: '/api/tests/[id]/metadata', verbs: ['PUT'] },
  { pattern: '/api/tests/[id]/release-results', verbs: ['POST'] },
  { pattern: '/api/attempts/[id]', verbs: ['GET'] },
  { pattern: '/api/attempts/[id]/answers', verbs: ['PATCH', 'POST'] },
  { pattern: '/api/attempts/[id]/extend-time', verbs: ['POST'] },
  { pattern: '/api/attempts/[id]/questions', verbs: ['GET'] },
  { pattern: '/api/attempts/[id]/result', verbs: ['GET'] },
  { pattern: '/api/attempts/[id]/submit', verbs: ['POST'] },
  { pattern: '/api/analytics/cohort', verbs: ['GET'] },
  { pattern: '/api/analytics/student/me', verbs: ['GET'] },
  { pattern: '/api/analytics/tests/[id]', verbs: ['GET'] },
  { pattern: '/api/analytics/tests/[id]/export.csv', verbs: ['GET'] },
  { pattern: '/api/analytics/tests/[id]/export-questions.csv', verbs: ['GET'] },
  { pattern: '/api/files/images/[questionId]/[placeholder]', verbs: ['GET'] },
];
