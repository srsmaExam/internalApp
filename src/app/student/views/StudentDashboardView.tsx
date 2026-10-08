import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import { Award, Clock, Eye, FileText, HelpCircle, Play, PlayCircle, Sparkles, BookOpen, ArrowRight, Info } from 'lucide-react';
import { getDb } from '@/db/client';
import { attempts, profiles, testQuestions, tests } from '@/db/schema';
import { getSession } from '@/lib/session';
import { Badge, buttonClass, Card, CardBody, EmptyState } from '@/components/ui';
import { StudentChrome } from '../StudentChrome';

export async function StudentDashboardView() {
  const session = await getSession();
  if (!session) return null;
  if (session.role === 'teacher') redirect('/teacher');

  const db = await getDb();
  const now = new Date();


  // 1. Fetch published tests with question count
  //
  // FBR-03: a provisional (self-service phone-login) account only ever sees
  // audience = 'public' tests. This is a display filter, not the security
  // boundary on its own — POST /api/tests/:id/attempts enforces the same
  // predicate server-side, because a dashboard filter alone is not an
  // authorisation control.
  const visibilityConditions = [eq(tests.isPublished, true)];
  if (session.isProvisional) {
    visibilityConditions.push(eq(tests.audience, 'public'));
  }

  const publishedTests = await db
    .select({
      id: tests.id,
      title: tests.title,
      description: tests.description,
      durationS: tests.durationS,
      opensAt: tests.opensAt,
      closesAt: tests.closesAt,
      maxAttempts: tests.maxAttempts,
      resultsPolicy: tests.resultsPolicy,
      releasedAt: tests.releasedAt,
      questionCount: sql<number>`cast(count(${testQuestions.questionId}) as int)`,
    })
    .from(tests)
    .leftJoin(testQuestions, eq(testQuestions.testId, tests.id))
    .where(and(...visibilityConditions))
    .groupBy(tests.id)
    .orderBy(asc(tests.title), desc(tests.createdAt));

  // 2. Fetch all attempts by this student
  const studentAttempts = await db
    .select()
    .from(attempts)
    .where(eq(attempts.studentId, session.userId))
    .orderBy(desc(attempts.startedAt));

  // 3. Map tests with student attempt state
  const availableList = publishedTests.map((t) => {
    const attemptsForTest = studentAttempts.filter((a) => a.testId === t.id);
    const activeAttempt = attemptsForTest.find((a) => a.status === 'in_progress');
    const completedCount = attemptsForTest.filter(
      (a) => a.status === 'submitted' || a.status === 'auto_submitted',
    ).length;

    const isOpen = (!t.opensAt || new Date(t.opensAt) <= now) && (!t.closesAt || new Date(t.closesAt) >= now);
    const canAttempt = isOpen && (t.maxAttempts === 0 || completedCount < t.maxAttempts);

    return {
      ...t,
      isOpen,
      canAttempt,
      activeAttempt,
      completedCount,
      attemptsRemaining: t.maxAttempts === 0 ? 'Unlimited' : Math.max(0, t.maxAttempts - completedCount),
    };
  });

  // Show all available tests with actual titles
  const displayList = availableList;

  // 4. Completed attempts for history review
  const completedList = studentAttempts
    .filter((a) => a.status === 'submitted' || a.status === 'auto_submitted')
    .map((a) => {
      const test = publishedTests.find((t) => t.id === a.testId);
      const resultsAvailable = test?.resultsPolicy === 'immediate' || Boolean(test?.releasedAt);
      return {
        ...a,
        testTitle: test?.title ?? 'JEE Online Test',
        resultsAvailable,
      };
    });

  const hasCompletedTests = completedList.length > 0;

  return (
    <StudentChrome session={session}>
      <div className="space-y-8 min-w-0 max-w-full">
        {/* Welcome Banner */}
        <div className="rounded-xl bg-gradient-to-r from-brand-900 to-brand-700 p-6 text-white shadow-sm dark:from-brand-950 dark:to-brand-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between min-w-0">
            <div className="min-w-0">
              <span className="inline-flex items-center rounded-full bg-brand-800/80 px-2.5 py-0.5 text-xs font-semibold text-accent-400 dark:bg-brand-900/90">
                <Sparkles className="mr-1 size-3" />
                JEE Online Test Preparation
              </span>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black tracking-tight text-white truncate sm:text-wrap">
                Welcome, {session.fullName}!
              </h1>
              
            </div>

            {hasCompletedTests ? (
              <Link href="/student/analytics" className={buttonClass('accent', 'md')}>
                <Award className="mr-1.5 size-4" />
                View My Report
              </Link>
            ) : (
              <Link href="/student/analytics?sample=true" className={buttonClass('accent', 'md')}>
                <FileText className="mr-1.5 size-4" />
                View Sample Report
              </Link>
            )}
          </div>
        </div>

        {/* Available Tests */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Available Tests</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{displayList.length} total</span>
          </div>

          {displayList.length === 0 ? (
            <EmptyState
              title="No tests published yet"
              hint="Check back soon! Your teacher will publish practice and mock tests here."
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {displayList.map((t) => (
                <Card key={t.id} className="transition-all hover:border-brand-300 hover:shadow-sm dark:hover:border-brand-700">
                  <CardBody className="flex h-full flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-snug">
                          {t.title}
                        </h3>
                        {t.activeAttempt ? (
                          <Badge tone="amber">In Progress</Badge>
                        ) : t.isOpen ? (
                          <Badge tone="green">Open</Badge>
                        ) : (
                          <Badge tone="slate">Closed</Badge>
                        )}
                      </div>

                      {t.description && (
                        <p className="line-clamp-2 text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                          {t.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3.5 pt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <Clock className="size-4 text-brand-600 dark:text-brand-400" />
                          {Math.round(t.durationS / 60)} mins
                        </span>
                        <span className="flex items-center gap-1.5">
                          <HelpCircle className="size-4 text-brand-600 dark:text-brand-400" />
                          {t.questionCount} Questions
                        </span>
                        <span>
                          {t.maxAttempts === 0 ? (
                            <span className="font-semibold text-emerald-700 dark:text-emerald-400">Unlimited Attempts</span>
                          ) : (
                            <>Attempts Left: <strong>{t.attemptsRemaining}</strong> / {t.maxAttempts}</>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
                      {t.activeAttempt ? (
                        <Link
                          href={`/student/attempts/${t.activeAttempt.id}`}
                          className={buttonClass('accent', 'md', 'w-full text-sm sm:text-base font-bold')}
                        >
                          <Play className="mr-1.5 size-4" />
                          Resume Test
                        </Link>
                      ) : t.canAttempt ? (
                        <Link
                          href={`/student/tests/${t.id}`}
                          className={buttonClass('primary', 'md', 'w-full text-sm sm:text-base font-bold')}
                        >
                          <PlayCircle className="mr-1.5 size-4" />
                          Take Test
                        </Link>
                      ) : (
                        <button
                          disabled
                          className="inline-flex w-full cursor-not-allowed items-center justify-center rounded-md bg-slate-100 py-2.5 text-xs sm:text-sm font-semibold text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                        >
                          {t.attemptsRemaining === 0 ? 'All Attempts Completed' : 'Window Closed'}
                        </button>
                      )}
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Completed Tests History */}
        {completedList.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">Completed Attempts</h2>
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Test Name</th>
                      <th className="px-4 py-3 font-semibold">Score</th>
                      <th className="px-4 py-3 font-semibold">Time Spent</th>
                      <th className="px-4 py-3 font-semibold">Submitted On</th>
                      <th className="px-4 py-3 text-right font-semibold">Review</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {completedList.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">{a.testTitle}</td>
                        <td className="px-4 py-3 font-bold text-brand-700 dark:text-brand-400">
                          {a.totalMarks ? Number(a.totalMarks) : 0} / {a.maxMarks ? Number(a.maxMarks) : 0}
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {Math.round((a.totalTimeS ?? 0) / 60)} mins
                        </td>
                        <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {a.resultsAvailable ? (
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/student/attempts/${a.id}/result?tab=solutions`}
                                className={buttonClass('secondary', 'sm')}
                                title="View Question-by-Question Solutions"
                              >
                                <Eye className="mr-1 size-3" />
                                Solutions
                              </Link>
                              <Link
                                href={`/student/attempts/${a.id}/result?tab=report`}
                                className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-2.5 py-1 text-xs font-bold text-white shadow-xs hover:bg-brand-500 transition"
                                title="View 5-Page Board Readiness Diagnostic Report"
                              >
                                <Award className="size-3" />
                                <span>5-Page Report</span>
                              </Link>
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic dark:text-slate-500">Results Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* Section: About Shri Ram Smart Minds Academy */}
        <div className="rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-500/10 via-white to-blue-900/10 p-5 sm:p-7 dark:border-amber-400/30 dark:bg-gradient-to-r dark:from-slate-900 dark:via-slate-900 dark:to-slate-950">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 border border-amber-400/30 px-2.5 py-0.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                  <Sparkles className="size-3" />
                  <span>Founded by Top IIT Alumni</span>
                </span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                  HIgh Selection Ratio in JEE Mains · 1 in 2 Students Qualified
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                About Shri Ram Smart Minds Academy (SRSMA)
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Founded by IIT alumni, SRSMA delivers stress-free, personalized coaching in focused batches of 25–30 students. Backed by smart AI Powered AC classrooms and safe residential care, our very first batch achieved a 99.48 percentile in JEE Main, JEE Advanced selections, and 98% in board exams. Admissions are open for class 11 JEE and NEET batches.
              </p>
            </div>
            <Link
              href="/student/about"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300 transition shrink-0"
            >
              <span>Explore SRSMA</span>
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </StudentChrome>
  );
}
