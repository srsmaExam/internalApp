'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Clock,
  Sparkles,
  CheckCircle2,
  Check,
  X,
  Award,
  Calculator,
  Atom,
  Layers,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { Alert, Badge, buttonClass, Card, CardBody, Spinner, Button } from '@/components/ui';
import { QuestionBody } from '@/components/Katex';

type ReviewQuestion = {
  id: string;
  position: number;
  humanCode: string | null;
  body: string;
  type: 'mcq' | 'integer';
  options: any[];
  answer: any;
  solution: string | null;
  difficulty: number | null;
  expectedTimeS: number | null;
  subject: 'physics' | 'chemistry' | 'maths' | 'biology';
  chapter: string | null;
  topic: string | null;
  metadata?: any;
  marks: {
    correct: number;
    wrong: number;
    unattempted: number;
  };
  response: { key?: string; value?: number | string } | null;
  state: string;
  isCorrect: boolean | null;
  isAttempted: boolean;
  marksAwarded: number;
  timeSpentMs: number;
  visitCount?: number;
  solveOrder?: number | null;
  firstActionTimeMs?: number | null;
  firstActionType?: string | null;
  visitTimesMs?: number[];
  answerModifications?: {
    count: number;
    modifiedAfter15s: boolean;
    after15sCount: number;
    history: Array<{
      from?: { key?: string; value?: number | string } | null;
      to?: { key?: string; value?: number | string } | null;
      elapsedMs: number;
      isAfter15s: boolean;
      timestamp: string;
    }>;
  } | null;
  modifiedAfter15s?: boolean;
  isOvertime: boolean;
};

type ResultData = {
  attemptId: string;
  testId: string;
  testTitle: string;
  attemptNo: number;
  status: string;
  startedAt: string;
  submittedAt: string;
  totalTimeS: number;
  totalMarks: number;
  maxMarks: number;
  rank: number;
  percentile: number;
  totalParticipants: number;
  solveOrder?: string[];
  studentId?: string;
  studentName?: string;
  allAttempts?: Array<{
    id: string;
    attemptNo: number;
    status: string;
    submittedAt: string | null;
    totalMarks: number;
    maxMarks: number;
  }>;
  summary: {
    totalQuestions: number;
    correctCount: number;
    wrongCount: number;
    unattemptedCount: number;
    accuracy: number;
    subjectScores: Record<
      string,
      { marks: number; maxMarks: number; correct: number; total: number }
    >;
  };
  questions: ReviewQuestion[];
};

function getQuestionETS(raw?: any, expectedTimeS?: number | null): number {
  if (typeof raw === 'number' && raw > 0) return raw;
  if (typeof raw === 'string') {
    const match = raw.match(/(\d+)/);
    if (match) return Number(match[1]);
  }
  if (expectedTimeS && expectedTimeS > 0) return expectedTimeS;
  return 60;
}

export function ResultReviewClient({
  attemptId,
  userRole,
  backUrl,
}: {
  attemptId: string;
  userRole: 'student' | 'teacher';
  backUrl?: string;
}) {
  const router = useRouter();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awaitingRelease, setAwaitingRelease] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const handleSwitchAttempt = (targetAttemptId: string) => {
    if (targetAttemptId === attemptId) return;
    if (userRole === 'teacher') {
      const base = data?.studentId
        ? `/teacher/students/${data.studentId}/attempts/${targetAttemptId}`
        : `/teacher/attempts/${targetAttemptId}/result`;
      router.push(base);
    } else {
      router.push(`/student/attempts/${targetAttemptId}/result`);
    }
  };

  useEffect(() => {
    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 6;

    async function loadResult() {
      try {
        setLoading(true);
        const res = await fetch(`/api/attempts/${attemptId}/result?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache',
            Pragma: 'no-cache',
          },
        });
        const json = await res.json();

        if (isCancelled) return;

        if (!res.ok) {
          if (res.status === 403 && json.error === 'awaiting_release') {
            setAwaitingRelease(true);
            setLoading(false);
            setIsFinalizing(false);
            return;
          }

          if (res.status === 400 && json.error === 'attempt_in_progress' && retryCount < maxRetries) {
            retryCount++;
            setIsFinalizing(true);
            retryTimer = setTimeout(() => {
              if (!isCancelled) void loadResult();
            }, 1200);
            return;
          }

          throw new Error(json.message || 'Failed to load test results');
        }

        setIsFinalizing(false);
        setData(json);
        setError(null);
        setLoading(false);
      } catch (err: any) {
        if (!isCancelled) {
          setError(err.message);
          setIsFinalizing(false);
          setLoading(false);
        }
      }
    }

    loadResult();

    return () => {
      isCancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [attemptId]);

  const filteredQuestions = useMemo(() => {
    if (!data) return [];
    return data.questions.filter((q) => {
      if (filterSubject !== 'all' && q.subject !== filterSubject) return false;
      if (filterStatus === 'correct' && q.isCorrect !== true) return false;
      if (filterStatus === 'wrong' && (q.isCorrect !== false || !q.isAttempted)) return false;
      if (filterStatus === 'unattempted' && q.isAttempted) return false;

      const timeTakenSec = Math.round((q.timeSpentMs ?? 0) / 1000);
      const ets = getQuestionETS(q.metadata?.expectedTime, q.expectedTimeS);

      if (filterStatus === 'overtime' && timeTakenSec <= 1.5 * ets) return false;
      if (filterStatus === 'guesswork' && (!q.isAttempted || timeTakenSec >= 8)) return false;
      if (
        filterStatus === 'revisited' &&
        (!q.visitCount || q.visitCount <= 1) &&
        (!q.visitTimesMs || q.visitTimesMs.length <= 1)
      ) {
        return false;
      }
      if (filterStatus === 'modified' && !q.modifiedAfter15s) return false;

      return true;
    });
  }, [data, filterSubject, filterStatus]);

  if (loading || isFinalizing) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Spinner className="size-8 text-brand-700 dark:text-brand-400" />
        <p className="text-sm font-medium">
          {isFinalizing ? 'Finalizing and grading test results…' : 'Loading scorecard and worked solutions…'}
        </p>
      </div>
    );
  }

  if (awaitingRelease) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <Card className="p-8">
          <Clock className="mx-auto size-12 text-brand-600 dark:text-brand-400" />
          <h2 className="mt-3 text-lg font-bold text-slate-900 dark:text-slate-100">Results Pending Release</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Your attempt was successfully submitted! The results and step-by-step solutions for this test will be released by your teacher once all candidates have finished.
          </p>
          <Link href="/student" className={buttonClass('primary', 'md', 'mt-5')}>
            ← Return to My Tests
          </Link>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    const isInProgress = error?.toLowerCase().includes('not been submitted yet');
    return (
      <div className="mx-auto max-w-md p-6 text-center space-y-4">
        <Alert tone={isInProgress ? 'amber' : 'red'} title={isInProgress ? 'Exam In Progress' : 'Could not load results'}>
          <p>{isInProgress ? 'This exam attempt has not been submitted yet.' : (error ?? 'Result not found')}</p>
        </Alert>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
          {isInProgress ? (
            <>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  window.location.reload();
                }}
                className="w-full sm:w-auto font-bold"
              >
                Check Results Again
              </Button>
              <Link
                href={`/student/attempts/${attemptId}`}
                className={buttonClass('secondary', 'md', 'w-full sm:w-auto font-bold')}
              >
                Resume Exam
              </Link>
            </>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
              className="w-full sm:w-auto font-bold"
            >
              Retry Loading Results
            </Button>
          )}
          <Link href={userRole === 'teacher' ? '/teacher/tests' : '/student'} className={buttonClass('secondary', 'md', 'w-full sm:w-auto')}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Navigation breadcrumb */}
      {userRole === 'teacher' ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/90 px-4 py-3 text-xs font-semibold text-brand-900 shadow-sm dark:border-brand-800/80 dark:bg-brand-950/60 dark:text-brand-200">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-brand-600 font-bold text-white text-xs">
              👨‍🏫
            </span>
            <span>
              Faculty View: <strong className="font-bold">{data.studentName || 'Student'}</strong>’s Test Response &amp; Solutions
            </span>
          </div>
          <div className="flex items-center gap-2">
            {data.studentId && (
              <Link
                href={`/teacher/students/${data.studentId}`}
                className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 font-bold text-brand-700 shadow-xs hover:bg-brand-50 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300"
              >
                ← {data.studentName ? `${data.studentName}’s Profile` : 'Student Profile'}
              </Link>
            )}
            <Link
              href={backUrl || (data.testId ? `/teacher/tests/${data.testId}/analytics` : '/teacher/students')}
              className="rounded-lg border border-brand-300 bg-white px-3 py-1.5 font-bold text-brand-700 shadow-xs hover:bg-brand-50 dark:border-brand-700 dark:bg-slate-900 dark:text-brand-300"
            >
              ← Back
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/student"
            className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ← Back to tests
          </Link>
        </div>
      )}

      {/* Test Attempt Switcher */}
      {data.allAttempts && data.allAttempts.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Attempt History ({data.allAttempts.length} total)
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Switch between attempts to review scores and solutions:
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {data.allAttempts.map((att) => {
              const isCurrent = att.id === attemptId;
              return (
                <button
                  key={att.id}
                  type="button"
                  onClick={() => handleSwitchAttempt(att.id)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                    isCurrent
                      ? 'bg-brand-600 text-white shadow-xs font-black ring-2 ring-brand-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                  title={
                    att.submittedAt
                      ? `Attempt #${att.attemptNo} submitted ${new Date(att.submittedAt).toLocaleDateString()}`
                      : `Attempt #${att.attemptNo}`
                  }
                >
                  <span>Attempt #{att.attemptNo}</span>
                  <span className="opacity-80 text-[11px]">
                    ({att.totalMarks}/{att.maxMarks}M)
                  </span>
                  {isCurrent && (
                    <span className="ml-0.5 rounded-md bg-white/20 px-1 py-0.2 text-[9px] uppercase tracking-wider font-extrabold">
                      Viewing
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 1. Scorecard Hero Banner */}
      <div className="rounded-xl bg-gradient-to-br from-slate-900 via-brand-950 to-brand-900 p-6 text-white shadow-md sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="inline-flex items-center rounded-full bg-brand-800/90 px-2.5 py-0.5 text-xs font-semibold text-accent-400">
              <Sparkles className="mr-1 size-3" />
              Scorecard & Solutions
            </span>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white">{data.testTitle}</h1>
            <p className="mt-0.5 text-xs text-slate-300">
              Submitted on {new Date(data.submittedAt).toLocaleDateString()} at{' '}
              {new Date(data.submittedAt).toLocaleTimeString()}
            </p>
          </div>

          <div className="flex items-baseline gap-2 rounded-xl bg-white/10 px-5 py-3 backdrop-blur-sm">
            <span className="text-3xl font-black text-white">{data.totalMarks}</span>
            <span className="text-sm font-semibold text-slate-300">/ {data.maxMarks} Marks</span>
          </div>
        </div>

        {/* Hero KPI metrics grid */}
        <div className="mt-6 grid grid-cols-1 gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
          <div className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Accuracy</p>
            <p className="tnum mt-0.5 text-xl font-bold text-emerald-400">{data.summary.accuracy}%</p>
            <p className="text-xs text-slate-400">of attempted</p>
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Time Spent</p>
            <p className="mt-0.5 text-xl font-bold text-white">{Math.round(data.totalTimeS / 60)} min</p>
          </div>

          <div className="rounded-lg bg-white/5 p-3 text-center flex flex-col justify-center">
            <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1.5">Responses</p>
            <div className="flex items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-400 border border-emerald-500/30">
                <span className="text-base font-extrabold">{data.summary.correctCount}</span> Correct
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-2.5 py-1 text-sm font-bold text-rose-400 border border-rose-500/30">
                <span className="text-base font-extrabold">{data.summary.wrongCount}</span> Wrong
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Subject Breakdown Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {(['maths', 'physics', 'chemistry', 'biology'] as const)
          .filter((s) => (data.summary.subjectScores[s]?.total ?? 0) > 0)
          .map((s) => {
            const stats = data.summary.subjectScores[s] ?? { marks: 0, maxMarks: 0, correct: 0, total: 0 };
            const attempted = data.questions.filter((q) => q.subject === s && q.isAttempted).length;
            const acc = attempted > 0 ? Math.round((stats.correct / attempted) * 100) : 0;
            return (
              <Card key={s}>
                <CardBody className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {s}
                    </span>
                    <Badge tone={s === 'physics' ? 'brand' : s === 'chemistry' ? 'green' : s === 'maths' ? 'amber' : 'purple'}>
                      {stats.marks} / {stats.maxMarks} M
                    </Badge>
                  </div>
                  <div className="mt-2 flex items-baseline justify-between">
                    <span className="tnum text-xl font-black text-slate-900 dark:text-slate-100">
                      {stats.marks} Marks
                    </span>
                    <span className="tnum text-xs font-medium text-slate-500 dark:text-slate-400">
                      {acc}% of attempted
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full ${
                        s === 'physics'
                          ? 'bg-brand-600'
                          : s === 'chemistry'
                            ? 'bg-emerald-600'
                            : s === 'maths'
                              ? 'bg-amber-500'
                              : 'bg-purple-600'
                      }`}
                      style={{
                        width: `${Math.max(0, Math.min(100, (stats.marks / Math.max(1, stats.maxMarks)) * 100))}%`,
                      }}
                    />
                  </div>
                </CardBody>
              </Card>
            );
          })}
      </div>

      {/* Solutions Header Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-brand-500/10 p-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-brand-950/30">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="size-7" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300">
                <Sparkles className="size-3" />
                Solutions Available
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Step-by-Step Solutions &amp; Analysis
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Review worked faculty derivations and time analysis for all questions below.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Detailed Question Solutions Section */}
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Question-by-Question Solutions</h2>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 max-w-full">
            {/* Subject Filters */}
            <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-md bg-slate-100 p-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {(['all', 'maths', 'physics', 'chemistry', 'biology'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilterSubject(s)}
                  className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 capitalize transition-colors ${
                    filterSubject === s
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Status Filters */}
            <div className="flex items-center overflow-x-auto sm:flex-wrap no-scrollbar max-w-full rounded-md bg-slate-100 p-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
              {[
                { id: 'all', label: 'All' },
                { id: 'correct', label: 'Correct' },
                { id: 'wrong', label: 'Wrong' },
                { id: 'unattempted', label: 'Unattempted' },
                { id: 'revisited', label: '🔄 Revisited' },
                { id: 'modified', label: '⚠️ Modified (>15s)' },
                { id: 'overtime', label: 'Overtime (>1.5× ETS)' },
                { id: 'guesswork', label: 'Guesswork (<8s)' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 transition-colors ${
                    filterStatus === st.id
                      ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100'
                      : 'hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Attempt Behavioral Telemetry & Solving Strategy Section */}
        {(() => {
          const solvedList = [...(data?.questions || [])]
            .filter((q) => q.solveOrder !== null && q.solveOrder !== undefined)
            .sort((a, b) => (a.solveOrder ?? 0) - (b.solveOrder ?? 0));
          const revisitedList = (data?.questions || []).filter(
            (q) => (q.visitCount && q.visitCount > 1) || (q.visitTimesMs && q.visitTimesMs.length > 1),
          );
          const modifiedAfter15sList = (data?.questions || []).filter((q) => q.modifiedAfter15s);
          const withFirstAction = (data?.questions || []).filter(
            (q) => q.firstActionTimeMs !== null && q.firstActionTimeMs !== undefined,
          );
          const avgFirstActionS =
            withFirstAction.length > 0
              ? Math.round(
                  withFirstAction.reduce((sum, q) => sum + (q.firstActionTimeMs ?? 0), 0) /
                    withFirstAction.length /
                    1000,
                )
              : 0;

          return (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                    <Layers className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      Student Attempt Telemetry & Solving Strategy
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Detailed chronological telemetry captured during this student’s paper attempt
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    Solved: <span className="text-slate-900 dark:text-slate-100 font-bold">{solvedList.length}</span> / {data.questions.length} Qs
                  </span>
                </div>
              </div>

              {/* 4 Summary Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {/* 1. Solving Sequence */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    1. Solving Sequence
                  </span>
                  <div className="mt-1 text-lg font-black text-violet-600 dark:text-violet-400">
                    {solvedList.length} Solved
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {solvedList.length > 0 ? `Started with Q${solvedList[0].position}` : 'No answers logged'}
                  </p>
                </div>

                {/* 2. Re-visits & Split Time */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    2. Re-visits & Splits
                  </span>
                  <div className="mt-1 text-lg font-black text-sky-600 dark:text-sky-400">
                    {revisitedList.length} Questions
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Revisited in multiple passes
                  </p>
                </div>

                {/* 3. Modifications (>15s) */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    3. Modified (&gt;15s)
                  </span>
                  <div className={`mt-1 text-lg font-black ${modifiedAfter15sList.length > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                    {modifiedAfter15sList.length} Questions
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    {modifiedAfter15sList.length > 0 ? 'Confidence / doubt shifts' : 'Direct decision confidence'}
                  </p>
                </div>

                {/* 4. Time to First Action */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-800/40">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    4. First Action Pacing
                  </span>
                  <div className="mt-1 text-lg font-black text-indigo-600 dark:text-indigo-400">
                    {avgFirstActionS}s Avg
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                    Decision before answer/skip
                  </p>
                </div>
              </div>

              {/* Order of Solving Questions Visual Chain */}
              {solvedList.length > 0 && (
                <div className="space-y-2 pt-1">
                  <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <span>Chronological Solving Flow:</span>
                    <span className="text-[11px] font-normal text-slate-500">
                      (in exact sequence attempted)
                    </span>
                  </div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                    {solvedList.map((sq, sIdx) => {
                      const isCorrect = sq.isCorrect === true;
                      const isWrong = sq.isCorrect === false;
                      return (
                        <div
                          key={sq.id}
                          className="flex items-center shrink-0 gap-1.5"
                        >
                          <div
                            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium shadow-2xs ${
                              isCorrect
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                                : isWrong
                                  ? 'border-red-300 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-950/50 dark:text-red-200'
                                  : 'border-slate-200 bg-slate-50 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                            }`}
                            title={`Solved #${sq.solveOrder} • Q${sq.position} (${sq.subject}) • ${Math.round((sq.timeSpentMs || 0) / 1000)}s`}
                          >
                            <span className="font-extrabold text-[10px] opacity-75">#{sq.solveOrder}</span>
                            <span className="font-bold">Q{sq.position}</span>
                            <span>{isCorrect ? '✓' : isWrong ? '✗' : '—'}</span>
                            <span className="text-[11px] opacity-75">{Math.round((sq.timeSpentMs || 0) / 1000)}s</span>
                          </div>
                          {sIdx < solvedList.length - 1 && (
                            <ChevronRight className="size-3 text-slate-400 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const timeTakenSec = Math.round((q.timeSpentMs ?? 0) / 1000);
            const ets = getQuestionETS(q.metadata?.expectedTime, q.expectedTimeS);
            const isGuesswork = Boolean(q.isAttempted) && timeTakenSec > 0 && timeTakenSec < 8;
            const isOvertime = Boolean(q.isAttempted) && timeTakenSec > 1.5 * ets;

            let cardBorder = '';
            if (q.isAttempted) {
              if (q.isCorrect) cardBorder = 'ring-1 ring-emerald-300 dark:ring-emerald-800';
              else cardBorder = 'ring-1 ring-red-300 dark:ring-red-800';
            }

            return (
              <div key={q.id} className="space-y-4">
                <Card className={`${cardBorder} transition-shadow hover:shadow-sm`}>
                  <CardBody className="space-y-4 p-5">
                    {/* Question Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="tnum rounded bg-slate-900 px-2 py-0.5 text-xs font-bold text-white dark:bg-slate-700">
                          Q{q.position}
                        </span>
                        <Badge
                          tone={
                            q.subject === 'physics'
                              ? 'brand'
                              : q.subject === 'chemistry'
                                ? 'green'
                                : q.subject === 'maths'
                                  ? 'amber'
                                  : 'purple'
                          }
                        >
                          {q.subject.toUpperCase()}
                        </Badge>
                        <Badge tone="slate">{q.type.toUpperCase()}</Badge>
                        {(q.topic || q.chapter) && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            • {q.topic || q.chapter}
                            {(q.metadata as any)?.subTopic ? ` › ${(q.metadata as any).subTopic}` : ''}
                          </span>
                        )}
                        {(q.metadata as any)?.phase && (
                          <span
                            className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            title={`Phase ${(q.metadata as any).phase}`}
                          >
                            Phase {(q.metadata as any).phase}
                          </span>
                        )}
                        {(q.metadata as any)?.difficultyCategorical && (
                          <Badge
                            tone={
                              (q.metadata as any).difficultyCategorical === 'Hard'
                                ? 'red'
                                : (q.metadata as any).difficultyCategorical === 'Easy'
                                  ? 'green'
                                  : 'amber'
                            }
                          >
                            {(q.metadata as any).difficultyCategorical}
                            {(q.metadata as any).difficultyGranular ? ` (${(q.metadata as any).difficultyGranular}/10)` : ''}
                          </Badge>
                        )}
                        {(q.metadata as any)?.primarySkill && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" title={`Primary Skill: ${(q.metadata as any).primarySkill}`}>
                            🎯 {(q.metadata as any).primarySkill}
                          </span>
                        )}
                      </div>

                      {/* Score & Time Badges */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Marks Badge */}
                        {q.isAttempted ? (
                          q.isCorrect ? (
                            <Badge tone="green">+{q.marksAwarded} Marks (Correct)</Badge>
                          ) : (
                            <Badge tone="red">{q.marksAwarded} Marks (Wrong)</Badge>
                          )
                        ) : (
                          <Badge tone="slate">0 Marks (Unattempted)</Badge>
                        )}

                        {/* ETS & Time taken */}
                        <span className="tnum flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Clock className="size-3.5 text-slate-500" />
                          <span>{timeTakenSec}s</span>
                          <span className="text-slate-400 dark:text-slate-500 font-normal">
                            (ETS: {ets}s)
                          </span>
                        </span>

                        {/* Pacing Flag */}
                        {q.isAttempted && (
                          isOvertime ? (
                            <Badge tone="amber" className="text-xs font-semibold">
                              Overtime ({timeTakenSec}s &gt; {Math.round(1.5 * ets)}s)
                            </Badge>
                          ) : (
                            <Badge tone="green" className="text-xs font-semibold">
                              Paced Well
                            </Badge>
                          )
                        )}

                        {/* Guesswork flag */}
                        {isGuesswork && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/80 bg-amber-100 px-2 py-0.5 text-xs font-extrabold text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/80 dark:text-amber-200">
                            ⚡ Possible Guesswork (&lt;8s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Student Attempt Telemetry Strip */}
                    <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50/90 px-3 py-2 text-xs border border-slate-200/70 dark:border-slate-800 dark:bg-slate-900/60">
                      {/* 1. Solve Order */}
                      {q.solveOrder ? (
                        <span className="inline-flex items-center gap-1 font-bold text-violet-700 dark:text-violet-300 bg-violet-100/80 dark:bg-violet-950/80 px-2 py-0.5 rounded-md">
                          ⚡ Solved #{q.solveOrder}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          Not Solved
                        </span>
                      )}

                      {/* Time to First Action */}
                      {q.firstActionTimeMs !== null && q.firstActionTimeMs !== undefined && (
                        <span
                          className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs"
                          title="Reading / decision time elapsed before taking first action on this question"
                        >
                          ⏱️ First Action:{' '}
                          <span className="font-semibold">{Math.round(q.firstActionTimeMs / 1000)}s</span>
                          <span className="text-slate-500 dark:text-slate-400 capitalize">
                            ({q.firstActionType === 'answered' ? 'Answered' : q.firstActionType === 'skipped' ? 'Skipped' : 'Flagged'})
                          </span>
                        </span>
                      )}

                      {/* Re-visits and Split Times */}
                      {((q.visitTimesMs && q.visitTimesMs.length > 1) || (q.visitCount && q.visitCount > 1)) ? (
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-md">
                            🔄 {q.visitTimesMs?.length || q.visitCount} Visits:
                          </span>
                          {(q.visitTimesMs && q.visitTimesMs.length > 0
                            ? q.visitTimesMs
                            : [q.timeSpentMs || 0]
                          ).map((vMs, vIdx) => (
                            <span
                              key={vIdx}
                              className="rounded bg-sky-100/70 dark:bg-sky-900/40 px-1.5 py-0.5 text-[11px] font-medium text-sky-800 dark:text-sky-200"
                            >
                              Visit {vIdx + 1}: {Math.round(vMs / 1000)}s
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                          1 Visit ({timeTakenSec}s)
                        </span>
                      )}

                      {/* Answer Modifications */}
                      {q.answerModifications && q.answerModifications.count > 0 && (
                        q.modifiedAfter15s ? (
                          <span
                            className="inline-flex items-center gap-1 font-semibold text-amber-800 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md"
                            title={`Answer was changed >15s after initial selection (${q.answerModifications.count} modifications, indicates hesitation/confidence adjustment)`}
                          >
                            ⚠️ Modified after &gt;15s ({q.answerModifications.count}× edit)
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md"
                            title="Answer was edited within 15 seconds (likely typo/misclick)"
                          >
                            ✏️ Quick Edit (&lt;15s)
                          </span>
                        )
                      )}
                    </div>

                    {/* Diagnostic Concept Info */}
                    {q.metadata?.conceptTested && (
                      <div className="rounded-md bg-slate-50 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Concept Tested:</span>{' '}
                        {q.metadata.conceptTested}
                        {q.metadata.prerequisiteConcept && (
                          <span className="ml-2 text-slate-500 dark:text-slate-400">
                            (Prerequisite: {q.metadata.prerequisiteConcept})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Question Body */}
                    <div className="text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                      <QuestionBody
                        body={q.body}
                        renderImage={(placeholderId) => (
                          <div className="my-2 overflow-hidden rounded border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                            <img
                              src={`/api/files/images/${q.id}/${placeholderId}`}
                              alt="Figure"
                              className="max-h-60 object-contain"
                            />
                          </div>
                        )}
                      />
                    </div>

                    {/* Option / Answer Review */}
                    <div className="space-y-3 pt-3">
                      {q.type === 'mcq' ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                          {q.options.map((opt) => {
                            const isStudentPick = q.response?.key === opt.key;
                            const isCorrectKey =
                              q.answer && 'key' in q.answer && q.answer.key === opt.key;

                            const isBoth = isStudentPick && isCorrectKey;
                            const isWrongPick = isStudentPick && !isCorrectKey;

                            let cardClass =
                              'border border-slate-700/80 bg-slate-50/50 text-slate-800 dark:border-slate-800 dark:bg-[#0c1220] dark:text-slate-200';
                            let circleClass =
                              'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400';

                            if (isBoth || isCorrectKey) {
                              cardClass =
                                'border-2 border-emerald-500 bg-emerald-50/70 text-slate-900 ring-1 ring-emerald-500/50 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-slate-100';
                              circleClass = 'bg-[#00c950] text-white font-bold shadow-xs';
                            } else if (isWrongPick) {
                              cardClass =
                                'border-2 border-red-500 bg-red-50/70 text-slate-900 ring-1 ring-red-500/50 dark:border-red-500 dark:bg-red-950/30 dark:text-slate-100';
                              circleClass = 'bg-[#ff334b] text-white font-bold shadow-xs';
                            }

                            return (
                              <div
                                key={opt.key}
                                className={`relative flex min-h-[58px] items-center justify-between rounded-xl p-4 transition-all ${cardClass}`}
                              >
                                {isBoth ? (
                                  <span className="absolute -top-2.5 right-3 inline-flex items-center rounded-full bg-[#00c950] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                                    YOUR ANSWER | CORRECT ANSWER
                                  </span>
                                ) : isWrongPick ? (
                                  <span className="absolute -top-2.5 right-3 inline-flex items-center rounded-full bg-[#ff334b] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                                    YOUR ANSWER
                                  </span>
                                ) : isCorrectKey ? (
                                  <span className="absolute -top-2.5 right-3 inline-flex items-center rounded-full bg-[#00c950] px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-white shadow-sm">
                                    CORRECT ANSWER
                                  </span>
                                ) : null}

                                <div className="flex flex-1 items-center gap-3 pr-2 min-w-0">
                                  <span
                                    className={`flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${circleClass}`}
                                  >
                                    {opt.key}
                                  </span>
                                  <div className="flex-1 min-w-0 text-sm font-medium leading-relaxed">
                                    <QuestionBody
                                      body={opt.body}
                                      renderImage={(imgId) => (
                                        <img
                                          src={`/api/files/images/${q.id}/${imgId}`}
                                          alt="Option figure"
                                          className="my-1 max-h-24 object-contain"
                                        />
                                      )}
                                    />
                                  </div>
                                </div>

                                {isBoth || isCorrectKey ? (
                                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#00c950] text-white shadow-xs">
                                    <Check className="size-4 stroke-[3]" />
                                  </div>
                                ) : isWrongPick ? (
                                  <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[#ff334b] text-white shadow-xs">
                                    <X className="size-4 stroke-[3]" />
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-[#0d1424]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Your Response:</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-sm font-bold ${
                                !q.isAttempted
                                  ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                  : q.isCorrect
                                    ? 'border border-emerald-500 bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                                    : 'border border-red-500 bg-red-500/20 text-red-700 dark:text-red-400'
                              }`}
                            >
                              {q.isAttempted && q.response?.value !== undefined ? String(q.response.value) : 'None (Unattempted)'}
                              {q.isAttempted && (q.isCorrect ? <Check className="size-3.5" /> : <X className="size-3.5" />)}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Correct Answer:</span>
                            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500 bg-emerald-500/20 px-2.5 py-1 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-400">
                              {q.answer && 'value' in q.answer
                                ? q.answer.value
                                : q.answer && 'min' in q.answer
                                  ? `${q.answer.min} to ${q.answer.max}`
                                  : '-'}
                              <Check className="size-3.5" />
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Worked Solution */}
                    {q.solution ? (
                      <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-4 text-xs text-slate-800 dark:border-brand-900/60 dark:bg-brand-950/40 dark:text-slate-200 overflow-x-auto max-w-full">
                        <div className="mb-2 flex items-center gap-1.5 font-bold text-brand-900 dark:text-brand-300">
                          <Sparkles className="size-4 text-accent-500" />
                          Step-by-Step Solution:
                        </div>
                        <QuestionBody
                          body={q.solution}
                          renderImage={(imgId) => (
                            <img
                              src={`/api/files/images/${q.id}/${imgId}`}
                              alt="Solution figure"
                              className="my-2 max-h-48 object-contain"
                            />
                          )}
                        />
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                        No step-by-step solution provided for this question.
                      </div>
                    )}
                  </CardBody>
                </Card>
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No questions match these filters.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
