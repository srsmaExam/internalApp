'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Clock,
  Sparkles,
  FileText,
  CheckCircle2,
  ArrowRight,
  Check,
  X,
  Lock,
  Award,
  AlertTriangle,
  Calculator,
  Atom,
  BookOpen,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { Alert, Badge, buttonClass, Card, CardBody, Spinner, Button, Input, Label } from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { QuestionBody } from '@/components/Katex';
import { BoardReadinessReport } from '@/components/report/BoardReadinessReport';
import { DiagnosticFeedbackWidget } from '@/components/report/DiagnosticFeedbackWidget';
import {
  evaluateDiagnosticReport,
  getQuestionETS,
  evaluateQuestionTimeManagement,
  evaluateTimeManagement,
  type QuestionMetadataItem,
  type StudentQuestionResponse,
} from '@/lib/diagnostic-evaluator';

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
  gender?: 'Male' | 'Female' | string | null;
  isReportUnlocked?: boolean;
  studentDetails?: {
    board?: string | null;
    school?: string | null;
    city?: string | null;
    classLevel?: string | null;
    gender?: string | null;
    isFormFilled?: boolean;
  } | null;
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
  const searchParams = useSearchParams();
  const [data, setData] = useState<ResultData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [awaitingRelease, setAwaitingRelease] = useState(false);

  // Tab View state: 'report' or 'solutions' (Default to 'solutions' - report tab disabled for now)
  const initialTab = 'solutions';
  const [activeViewTab, setActiveViewTab] = useState<'solutions' | 'report'>('solutions');

  useEffect(() => {
    // Report tab is disabled for now (Maths-only tests)
    setActiveViewTab('solutions');
  }, [searchParams]);

  const handleTabChange = (tab: 'solutions' | 'report') => {
    // Report tab is disabled for now
    if (tab === 'report') return;
    setActiveViewTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('tab', tab);
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSwitchAttempt = (targetAttemptId: string) => {
    if (targetAttemptId === attemptId) return;
    if (userRole === 'teacher') {
      const base = data?.studentId
        ? `/teacher/students/${data.studentId}/attempts/${targetAttemptId}`
        : `/teacher/attempts/${targetAttemptId}/result`;
      router.push(`${base}?tab=${activeViewTab}`);
    } else {
      router.push(`/student/attempts/${targetAttemptId}/result?tab=${activeViewTab}`);
    }
  };

  // Filters
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all'); // all, correct, wrong, unattempted, overtime

  // Detailed Report Modal State
  const [showReportModal, setShowReportModal] = useState(false);
  const [city, setCity] = useState('');
  const [board, setBoard] = useState('CBSE Board');
  const [otherBoard, setOtherBoard] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [school, setSchool] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [submittingReport, setSubmittingReport] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  // Disabled as per user requirement (Maths-only tests, avoids division by 0 and unnecessary computation)
  // Preserved for when multi-subject board challenge tests are re-enabled
  const attemptDiagnosticReport = useMemo(() => {
    return null;
  }, [data, gender]);

  const timeManagementMetrics = useMemo(() => {
    if (!data?.questions || data.questions.length === 0) return null;
    return evaluateTimeManagement(
      data.questions.map((q, idx) => ({
        qno: q.position || idx + 1,
        attempted: Boolean(q.isAttempted),
        timeTakenSeconds: Math.round((q.timeSpentMs ?? 0) / 1000),
        expectedUpperBoundS: getQuestionETS(q.metadata?.expectedTime, q.expectedTimeS),
        benchmarkTimeS: getQuestionETS(q.metadata?.expectedTime, q.expectedTimeS),
        isCorrect: q.isCorrect,
      })),
      data.questions.length,
    );
  }, [data]);

  // Beginning Score Snapshot metrics: Maths & Science calculation
  const mathsStats = useMemo(() => {
    if (!data?.summary?.subjectScores) return { marks: 0, maxMarks: 0, total: 0, correct: 0 };
    const scores = data.summary.subjectScores;
    let marks = 0;
    let maxMarks = 0;
    let total = 0;
    let correct = 0;
    for (const [key, val] of Object.entries(scores)) {
      const lower = key.toLowerCase();
      if (lower === 'maths' || lower === 'mathematics') {
        marks += val.marks;
        maxMarks += val.maxMarks;
        total += val.total;
        correct += val.correct;
      }
    }
    return { marks, maxMarks, total, correct };
  }, [data]);

  const scienceStats = useMemo(() => {
    if (!data?.summary?.subjectScores) return { marks: 0, maxMarks: 0, total: 0, correct: 0 };
    const scores = data.summary.subjectScores;
    let marks = 0;
    let maxMarks = 0;
    let total = 0;
    let correct = 0;
    for (const [key, val] of Object.entries(scores)) {
      const lower = key.toLowerCase();
      if (['physics', 'chemistry', 'biology', 'science'].includes(lower)) {
        marks += val.marks;
        maxMarks += val.maxMarks;
        total += val.total;
        correct += val.correct;
      }
    }
    return { marks, maxMarks, total, correct };
  }, [data]);

  // Pre-fill student details if already available on profile
  useEffect(() => {
    if (data?.studentDetails) {
      if (data.studentDetails.city && !city) setCity(data.studentDetails.city);
      if (data.studentDetails.school && !school) setSchool(data.studentDetails.school);
      if (data.studentDetails.gender && !gender) {
        if (data.studentDetails.gender === 'Male' || data.studentDetails.gender === 'Female') {
          setGender(data.studentDetails.gender);
        }
      }
      if (data.studentDetails.board) {
        if (['State Board', 'CBSE Board', 'ICSE Board'].includes(data.studentDetails.board)) {
          setBoard(data.studentDetails.board);
        } else {
          setBoard('Other');
          setOtherBoard(data.studentDetails.board);
        }
      }
    } else if (data?.gender && !gender) {
      if (data.gender === 'Male' || data.gender === 'Female') {
        setGender(data.gender);
      }
    }
  }, [data]);

  useEffect(() => {
    if (data) {
      if (userRole === 'teacher' || data.isReportUnlocked) {
        setReportSubmitted(true);
        if (typeof window !== 'undefined') {
          localStorage.setItem('srsma_report_unlocked', 'true');
          localStorage.setItem(`srsma_report_${attemptId}`, 'true');
          window.dispatchEvent(new Event('srsma_report_unlocked'));
        }
      } else {
        setReportSubmitted(false);
      }
    }
  }, [data?.isReportUnlocked, attemptId, data, userRole]);

  useEffect(() => {
    if (userRole === 'teacher') return;
    const handleOpenModal = (e: Event) => {
      e.preventDefault();
      setShowReportModal(true);
    };
    window.addEventListener('srsma_open_report_modal', handleOpenModal);
    return () => {
      window.removeEventListener('srsma_open_report_modal', handleOpenModal);
    };
  }, [userRole]);

  async function handleReportSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gender) {
      setReportError('Please select your gender.');
      return;
    }
    if (!school.trim()) {
      setReportError('Please enter your school name.');
      return;
    }
    if (!city.trim()) {
      setReportError('Please enter your city.');
      return;
    }
    if (board === 'Other' && !otherBoard.trim()) {
      setReportError('Please enter your board name.');
      return;
    }
    if (!whatsappConsent) {
      setReportError(
        'I give permission to Shri Ram Smart Minds Academy to contact me on my WhatsApp number for sending the detailed report is required.',
      );
      return;
    }
    setSubmittingReport(true);
    setReportError(null);

    try {
      const res = await fetch('/api/student/report-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          city: city.trim(),
          board,
          otherBoard: board === 'Other' ? otherBoard.trim() : undefined,
          gender,
          school: school.trim(),
          whatsappConsent: true,
          attemptId,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to submit report details.');
      }

      setReportSubmitted(true);
      setSubmittedSuccess(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem('srsma_report_unlocked', 'true');
        localStorage.setItem(`srsma_report_${attemptId}`, 'true');
        window.dispatchEvent(new Event('srsma_report_unlocked'));
      }

      // If response includes solutions, update questions in state instantaneously
      if (json.solutions) {
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            isReportUnlocked: true,
            questions: prev.questions.map((q) => ({
              ...q,
              solution: json.solutions[q.id] !== undefined ? json.solutions[q.id] : q.solution,
            })),
          };
        });
      } else {
        // Fallback: re-fetch result to ensure solutions are populated
        const refreshRes = await fetch(`/api/attempts/${attemptId}/result`);
        if (refreshRes.ok) {
          const freshData = await refreshRes.json();
          setData(freshData);
        }
      }

      // Direct student to solutions Tab immediately after form submission
      handleTabChange('solutions');
    } catch (err: any) {
      setReportError(err.message || 'Could not unlock solutions and report.');
    } finally {
      setSubmittingReport(false);
    }
  }

  const [isFinalizing, setIsFinalizing] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const maxRetries = 4;

    async function loadResult() {
      try {
        setLoading(true);
        const res = await fetch(`/api/attempts/${attemptId}/result`);
        const json = await res.json();

        if (isCancelled) return;

        if (!res.ok) {
          if (res.status === 403 && json.error === 'awaiting_release') {
            setAwaitingRelease(true);
            setLoading(false);
            setIsFinalizing(false);
            return;
          }

          // If the attempt was just submitted and is still finalizing in the database, retry automatically
          if (res.status === 400 && json.error === 'attempt_in_progress' && retryCount < maxRetries) {
            retryCount++;
            setIsFinalizing(true);
            retryTimer = setTimeout(() => {
              if (!isCancelled) void loadResult();
            }, 1000 * retryCount);
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
      const qtm = evaluateQuestionTimeManagement(timeTakenSec, ets, q.isCorrect, Boolean(q.isAttempted));

      if (filterStatus === 'overtime' && timeTakenSec <= 1.5 * ets) return false;
      if (filterStatus === 'good_time' && (!q.isAttempted || (qtm.rating !== 'Good' && qtm.rating !== 'Optimal'))) return false;
      if (filterStatus === 'medium_time' && (!q.isAttempted || qtm.rating !== 'Moderate')) return false;
      if (filterStatus === 'poor_time' && (!q.isAttempted || qtm.rating !== 'Needs Intervention')) return false;
      if (filterStatus === 'guesswork' && (!q.isAttempted || timeTakenSec >= 8)) return false;
      if (filterStatus === 'revisited' && (!q.visitCount || q.visitCount <= 1) && (!q.visitTimesMs || q.visitTimesMs.length <= 1)) return false;
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
        <div className="flex items-center justify-center gap-2">
          {isInProgress ? (
            <Link
              href={`/student/attempts/${attemptId}`}
              className={buttonClass('primary', 'md', 'bg-brand-600 hover:bg-brand-700 text-white font-bold')}
            >
              Resume Exam
            </Link>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => {
                setError(null);
                setLoading(true);
                window.location.reload();
              }}
            >
              Retry Loading Results
            </Button>
          )}
          <Link href={userRole === 'teacher' ? '/teacher/tests' : '/student'} className={buttonClass('secondary', 'md')}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Dedicated Post-Test Report & Solution Unlocking View
  if (!reportSubmitted && userRole === 'student') {
    return (
      <div className="mx-auto max-w-3xl space-y-6 pb-16">
        {/* Top return link */}
        <div className="flex items-center justify-between">
          <Link
            href="/student"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition"
          >
            ← Return to My Tests
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-400/10 dark:text-amber-300 border border-amber-500/20">
            <Lock className="size-3.5" />
            Report &amp; Solutions Unlocking Form
          </span>
        </div>

        {/* 1. Beginning Score Snapshot */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <span className="inline-flex items-center rounded-full bg-brand-500/20 px-3 py-1 text-xs font-bold text-accent-300 border border-brand-500/30">
                <Sparkles className="mr-1.5 size-3.5" />
                Assessment Completed Successfully
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">
                {data.testTitle}
              </h1>
              <p className="mt-1 text-xs text-slate-300">
                Submitted on {new Date(data.submittedAt).toLocaleDateString()} at{' '}
                {new Date(data.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs uppercase tracking-wider text-slate-400 font-bold">Candidate</span>
              <span className="text-base font-bold text-slate-100">{data.studentName || 'Student'}</span>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Your Instant Score Summary
              </h2>
              <span className="text-[11px] text-amber-300 font-semibold">
                🔒 Full Solutions &amp; Analysis Locked Below
              </span>
            </div>

            {/* Score Cards: Total Marks, Maths Marks, and Science Marks (if present) */}
            <div className={`grid gap-2 sm:gap-3.5 ${scienceStats.total > 0 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {/* Total Marks */}
              <div className="rounded-xl bg-white/10 p-2.5 sm:p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1.5 sm:p-3 opacity-15 group-hover:opacity-25 transition">
                  <Award className="size-6 sm:size-10 text-white" />
                </div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-accent-300 tracking-wider truncate">Total Marks</p>
                <div className="mt-1 sm:mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-4xl font-black text-white">{data.totalMarks}</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">/ {data.maxMarks}</span>
                </div>
                <div className="mt-1 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-slate-300">
                  <span className="font-semibold text-emerald-400">
                    {data.maxMarks > 0 ? Math.round((data.totalMarks / data.maxMarks) * 100) : 0}%
                  </span>
                  <span className="hidden xs:inline truncate">overall score</span>
                </div>
              </div>

              {/* Maths Marks */}
              <div className="rounded-xl bg-white/10 p-2.5 sm:p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-1.5 sm:p-3 opacity-15 group-hover:opacity-25 transition">
                  <Calculator className="size-6 sm:size-10 text-blue-300" />
                </div>
                <p className="text-[10px] sm:text-xs uppercase font-bold text-blue-300 tracking-wider truncate">Maths</p>
                <div className="mt-1 sm:mt-1.5 flex items-baseline gap-1">
                  <span className="text-xl sm:text-4xl font-black text-white">{mathsStats.marks}</span>
                  <span className="text-xs sm:text-sm font-semibold text-slate-300">/ {mathsStats.maxMarks}</span>
                </div>
                <div className="mt-1 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-slate-300">
                  <span className="font-semibold text-blue-300">
                    {mathsStats.correct}/{mathsStats.total}
                  </span>
                  <span className="hidden xs:inline truncate">correct</span>
                </div>
              </div>

              {/* Science Marks (only shown if paper contains Science questions) */}
              {scienceStats.total > 0 && (
                <div className="rounded-xl bg-white/10 p-2.5 sm:p-4 border border-white/10 backdrop-blur-sm relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-1.5 sm:p-3 opacity-15 group-hover:opacity-25 transition">
                    <Atom className="size-6 sm:size-10 text-emerald-300" />
                  </div>
                  <p className="text-[10px] sm:text-xs uppercase font-bold text-emerald-300 tracking-wider truncate">Science</p>
                  <div className="mt-1 sm:mt-1.5 flex items-baseline gap-1">
                    <span className="text-xl sm:text-4xl font-black text-white">{scienceStats.marks}</span>
                    <span className="text-xs sm:text-sm font-semibold text-slate-300">/ {scienceStats.maxMarks}</span>
                  </div>
                  <div className="mt-1 sm:mt-2 flex items-center gap-1 text-[10px] sm:text-xs text-slate-300">
                    <span className="font-semibold text-emerald-300">
                      {scienceStats.correct}/{scienceStats.total}
                    </span>
                    <span className="hidden xs:inline truncate">correct</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Unlocking Form Card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-6 space-y-2 border-b border-slate-100 pb-5 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                <Lock className="size-4" />
              </span>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">
                Unlock Step-by-Step Solutions &amp; Detailed Analysis
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Provide your details below to instantly unlock step-by-step solutions, time management analytics, and your official 5-Page Board Readiness Diagnostic Report.
            </p>

            {/* Perks grid */}
            <div className="mt-3 grid grid-cols-2 gap-2 pt-1">
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Question Derivations</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">5-Page Board Report</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Pacing & Guesswork Audit</span>
              </div>
              <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 p-2 text-[11px] sm:text-xs font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate">Scorecard to WhatsApp</span>
              </div>
            </div>
          </div>

          <form id="report-unlock-page-form" onSubmit={handleReportSubmit} className="space-y-5">
            {reportError && (
              <Alert tone="red" className="text-sm">
                {reportError}
              </Alert>
            )}

            {/* Gender Field */}
            <div>
              <Label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3.5">
                <button
                  type="button"
                  onClick={() => setGender('Male')}
                  className={`group relative flex items-center justify-center gap-2.5 rounded-xl border py-3 px-4 text-sm font-bold transition-all shadow-xs ${
                    gender === 'Male'
                      ? 'border-blue-500 bg-blue-50/90 text-blue-800 ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-base dark:bg-blue-900/60">
                    👦
                  </span>
                  <span>Male</span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Female')}
                  className={`group relative flex items-center justify-center gap-2.5 rounded-xl border py-3 px-4 text-sm font-bold transition-all shadow-xs ${
                    gender === 'Female'
                      ? 'border-pink-500 bg-pink-50/90 text-pink-800 ring-2 ring-pink-500/30 dark:border-pink-400 dark:bg-pink-950/70 dark:text-pink-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50/40 hover:text-pink-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-base dark:bg-pink-900/60">
                    👧
                  </span>
                  <span>Female</span>
                </button>
              </div>
            </div>

            {/* School Name */}
            <div>
              <Label htmlFor="page-school-input" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                School Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="page-school-input"
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Delhi Public School"
                className="text-sm py-2.5"
              />
            </div>

            {/* City */}
            <div>
              <Label htmlFor="page-city-input" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="page-city-input"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="text-sm py-2.5"
              />
            </div>

            {/* Board */}
            <div>
              <Label htmlFor="page-board-select" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Your Board <span className="text-red-500">*</span>
              </Label>
              <select
                id="page-board-select"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="State Board">State Board</option>
                <option value="CBSE Board">CBSE Board</option>
                <option value="ICSE Board">ICSE Board</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {board === 'Other' && (
              <div>
                <Label htmlFor="page-other-board-input" className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Specify Your Board <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="page-other-board-input"
                  required
                  value={otherBoard}
                  onChange={(e) => setOtherBoard(e.target.value)}
                  placeholder="e.g. Cambridge, IB, etc."
                  className="text-sm py-2.5"
                />
              </div>
            )}

            {/* WhatsApp Consent */}
            <div className="flex items-start gap-3 rounded-xl border border-amber-300/80 bg-amber-50/70 p-4 dark:border-amber-900/60 dark:bg-amber-950/30">
              <input
                id="page-whatsapp-consent"
                type="checkbox"
                required
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="mt-1 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900 cursor-pointer"
              />
              <Label htmlFor="page-whatsapp-consent" className="cursor-pointer text-xs font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                <strong className="text-red-500 mr-1">*</strong>
                I give permission to Shri Ram Smart Minds Academy to contact me on my WhatsApp number for sending the detailed report.
              </Label>
            </div>

            {/* Submit CTA */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={submittingReport}
                className="w-full py-3.5 text-base font-bold bg-brand-700 hover:bg-brand-800 text-white shadow-lg transition flex items-center justify-center gap-2 rounded-xl dark:bg-brand-600 dark:hover:bg-brand-500 cursor-pointer"
              >
                {submittingReport ? (
                  <>
                    <Spinner className="size-5 text-white mr-1.5" />
                    Unlocking Solutions &amp; Report…
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    Unlock Solutions &amp; Comprehensive Report
                    <ArrowRight className="size-5 ml-1" />
                  </>
                )}
              </Button>
            </div>
          </form>
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

      {/* Test Attempt Switcher (Test-level attempt history) */}
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
                Switch between attempts to compare test scores, solutions, and reports:
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

      {/* Primary Tab Navigation: 5-Page Board Report vs Solutions */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 gap-2 min-w-0 max-w-full">
        <div className="flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-full">
          <button
            type="button"
            disabled
            className="shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 border-b-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold border-transparent text-slate-400 dark:text-slate-500 cursor-not-allowed opacity-60"
            title="5-Page Board Report is temporarily disabled for single-subject Maths tests"
          >
            <Award className="size-4" />
            5-Page Board Report
            <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
              Disabled
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('solutions')}
            className={`shrink-0 whitespace-nowrap flex items-center gap-1.5 sm:gap-2 border-b-2 px-3.5 sm:px-5 py-3 text-xs sm:text-sm font-bold transition-colors ${
              activeViewTab === 'solutions'
                ? 'border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <BookOpen className="size-4" />
            Solutions &amp; Review
          </button>
        </div>
      </div>

      {/* Tab 1: 5-Page Board Report Tab View */}
      {activeViewTab === 'report' && (
        <div className="space-y-6">
          {attemptDiagnosticReport ? (
            <>
              <BoardReadinessReport
                report={attemptDiagnosticReport}
                studentGender={data?.gender || gender}
                studentDetails={data?.studentDetails}
                attemptId={attemptId}
                isTeacherView={userRole === 'teacher'}
                onGoToSolutions={() => {
                  handleTabChange('solutions');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
              <DiagnosticFeedbackWidget
                attemptId={attemptId}
                testId={data?.testId}
                sourceTab="report"
                className="mt-6"
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <Spinner className="size-8 text-brand-600 mb-3" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                Generating Board Readiness Diagnostic Report…
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Solutions & Review Tab View */}
      {activeViewTab === 'solutions' && (
        <div className="space-y-6">
          {/* Front Page Guesswork Alert Banner */}
      {timeManagementMetrics && timeManagementMetrics.guessworkQuestions.length > 0 && (
        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-yellow-50/60 p-4 sm:p-5 shadow-xs dark:border-amber-500/30 dark:bg-gradient-to-r dark:from-slate-900/95 dark:via-amber-950/20 dark:to-slate-900/95 dark:shadow-[0_0_20px_-3px_rgba(245,158,11,0.12)]">
          <div className="flex items-start gap-3.5">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-slate-950 font-black shadow-sm ring-1 ring-amber-400/40">
              <AlertTriangle className="size-4.5 text-slate-950" />
            </div>
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:bg-amber-400/15 dark:text-amber-300 ring-1 ring-amber-500/20">
                  Rapid Response Alert
                </span>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  Attempt Time &lt; 8s
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                Possibility of Guesswork Detected
              </h4>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-relaxed">
                There is possibility of guesswork being done in answering{' '}
                <span className="inline-flex flex-wrap items-center gap-1 align-baseline my-0.5">
                  {timeManagementMetrics.guessworkQuestions.map((q) => (
                    <span
                      key={q}
                      className="inline-flex items-center rounded-md bg-amber-200/80 px-1.5 py-0.5 text-xs font-black text-amber-950 dark:bg-amber-400/20 dark:text-amber-200 dark:border dark:border-amber-400/30"
                    >
                      Q{q}
                    </span>
                  ))}
                </span>{' '}
                (responses submitted in less than 8 seconds).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 2. Subject Breakdown Cards */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* Only the subjects this paper actually contains. */}
        {(['maths', 'physics', 'chemistry', 'biology'] as const)
          .filter((s) => (data.summary.subjectScores[s]?.total ?? 0) > 0)
          .map((s) => {
            const stats = data.summary.subjectScores[s] ?? { marks: 0, maxMarks: 0, correct: 0, total: 0 };
            // Correct / attempted, matching the hero's definition. This used to
            // divide by `total` (including unattempted), so the same scorecard
            // reported two different accuracies for the same performance.
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
                      className={`h-full ${s === 'physics'
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

      {/* Toast Notification when unlocked in this session */}
      {submittedSuccess && (
        <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 p-4 sm:p-5 dark:border-emerald-500/30 dark:bg-emerald-950/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-emerald-600 text-white shrink-0 shadow-xs">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-emerald-900 dark:text-emerald-200">
                🎉 Solutions &amp; Analysis Report Successfully Unlocked!
              </h3>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                All step-by-step faculty derivations are now revealed below, and your personalized diagnostic report has been generated.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              size="sm"
              onClick={() => handleTabChange('report')}
              className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
            >
              <Award className="mr-1.5 size-4" />
              View 5-Page Board Report
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setSubmittedSuccess(false)}
            >
              Dismiss
            </Button>
          </div>
        </div>
      )}

      {/* Hero Unlocked Celebration Banner */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-brand-500/10 p-6 shadow-sm dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-brand-950/30">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
            <CheckCircle2 className="size-7" />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300">
                <Sparkles className="size-3" />
                Solutions &amp; Report Unlocked
              </span>
            </div>
            <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
              Detailed Report &amp; Step-by-Step Solutions Available!
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Review worked faculty derivations for all questions below. Your complete personalized diagnostic report is ready to view.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => handleTabChange('report')}
            className="shrink-0 rounded-xl border-emerald-500/40 bg-white px-4 py-2.5 font-bold text-emerald-800 shadow-sm hover:bg-emerald-50 dark:bg-slate-900 dark:text-emerald-300 dark:hover:bg-slate-800"
          >
            <Award className="mr-1.5 size-4 text-emerald-600 dark:text-emerald-400" />
            View 5-Page Board Report
          </Button>
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
                  className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 capitalize transition-colors ${filterSubject === s ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'hover:text-slate-900 dark:hover:text-slate-200'
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
                { id: 'good_time', label: 'Good Time' },
                { id: 'medium_time', label: 'Medium Time' },
                { id: 'poor_time', label: 'Poor Time (>2x ETS)' },
                { id: 'guesswork', label: 'Guesswork (<8s)' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setFilterStatus(st.id)}
                  className={`shrink-0 whitespace-nowrap rounded px-2.5 py-1 transition-colors ${filterStatus === st.id ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-slate-100' : 'hover:text-slate-900 dark:hover:text-slate-200'
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
                {/* 1. Solving Order */}
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
          {filteredQuestions.map((q, idx) => {
            const timeTakenSec = Math.round((q.timeSpentMs ?? 0) / 1000);
            const ets = getQuestionETS(q.metadata?.expectedTime, q.expectedTimeS);
            const qtm = evaluateQuestionTimeManagement(timeTakenSec, ets, q.isCorrect, Boolean(q.isAttempted));
            const isGuesswork = q.isAttempted && timeTakenSec > 0 && timeTakenSec < 8;
            const isEveryThird =
              (idx + 1) % 3 === 0 || (filteredQuestions.length < 3 && idx === filteredQuestions.length - 1);

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
                        {q.chapter && <span className="text-xs text-slate-500 dark:text-slate-400">• {q.chapter}{q.topic ? ` › ${q.topic}` : ''}</span>}
                        {q.metadata?.primarySkill && (
                          <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300" title={`Primary Skill: ${q.metadata.primarySkill}`}>
                            🎯 {q.metadata.primarySkill}
                          </span>
                        )}
                        {q.metadata?.cognitiveLevel && (
                          <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 dark:bg-sky-950/60 dark:text-sky-300" title={`Cognitive Level: ${q.metadata.cognitiveLevel}`}>
                            🧠 {q.metadata.cognitiveLevel}
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

                        {/* Time Management Evaluation Badge */}
                        {q.isAttempted && (
                          <Badge
                            tone={
                              qtm.category === 'EFFICIENT_MASTERY'
                                ? 'green'
                                : qtm.category === 'OVER_INVESTED_SUCCESS'
                                  ? 'brand'
                                  : qtm.category === 'DISCIPLINED_ATTEMPT'
                                    ? 'slate'
                                    : qtm.category === 'CARELESS_RUSHING'
                                      ? 'amber'
                                      : 'red'
                            }
                            className="text-xs font-semibold"
                          >
                            {qtm.label} (Q: {qtm.qi})
                          </Badge>
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

                      {/* 6. Time to First Action */}
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

                      {/* 5. Re-visits and Split Times */}
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

                      {/* 4. Answer Modifications */}
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
                                {/* Top-Right Badge matching user mockups */}
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

                                {/* Left & Middle: Letter Circle + Content */}
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

                                {/* Right End: Check or X Icon */}
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
                        /* Integer / Numerical Review */
                        <div className="flex flex-wrap items-center gap-6 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-[#0d1424]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-500 dark:text-slate-400">Your Response:</span>
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-sm font-bold ${!q.isAttempted
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

                    {/* Worked Solution (Visible once unlocked) */}
                    {reportSubmitted && (
                      q.solution ? (
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
                      )
                    )}
                  </CardBody>
                </Card>

                {/* Interstitial banner after every 3 questions */}
                {isEveryThird && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-brand-500/10 p-5 sm:p-6 shadow-md dark:border-emerald-500/30 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-brand-950/30">
                    <div className="flex items-center gap-3.5">
                      <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-md">
                        <CheckCircle2 className="size-6" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-400/20 dark:text-emerald-300">
                            <Sparkles className="size-3" />
                            Diagnostic Report Unlocked
                          </span>
                        </div>
                        <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white">
                          Personalized Diagnostic Report Ready
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          Deep dive into your chapter-wise mastery, time distribution, and accuracy trends.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleTabChange('report')}
                        className="bg-emerald-700 hover:bg-emerald-800 text-white font-bold"
                      >
                        <Award className="mr-1.5 size-4" />
                        View 5-Page Board Report
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredQuestions.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              No questions match these filters.
            </div>
          )}

          {/* Diagnostic Test & Report Student Feedback Widget on Solutions Tab */}
          <DiagnosticFeedbackWidget
            attemptId={attemptId}
            testId={data?.testId}
            sourceTab="solutions"
            className="mt-6"
          />
        </div>
      </div>

      {/* Detailed Report Request & Solution Unlock Modal */}
      <Dialog
        isOpen={showReportModal}
        onClose={() => !submittingReport && setShowReportModal(false)}
        size="md"
        title={submittedSuccess ? undefined : 'Unlock Solutions & Detailed Diagnostic Report'}
        description={
          submittedSuccess
            ? undefined
            : 'Enter your city and board to instantly reveal all step-by-step solutions and unlock your detailed report.'
        }
        footer={
          submittedSuccess ? null : (
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={submittingReport}
                onClick={() => setShowReportModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="report-details-form"
                size="sm"
                disabled={submittingReport}
                className="bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 font-bold"
              >
                {submittingReport ? 'Unlocking…' : 'Unlock Solutions & Report'}
              </Button>
            </div>
          )
        }
      >
        {submittedSuccess ? (
          <div className="space-y-4 p-4 text-center">
            <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Detailed Report &amp; Solutions Unlocked!
            </h3>
            <p className="mx-auto max-w-sm text-xs text-slate-600 dark:text-slate-300">
              Your detailed report has been sent to your WhatsApp number. All step-by-step solutions and the Report tab are now fully unlocked!
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <Link
                href="/student/analytics"
                className="inline-flex items-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-md transition"
              >
                <FileText className="mr-1.5 size-4" />
                Report Unlocked, View Now
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => {
                  setShowReportModal(false);
                  setSubmittedSuccess(false);
                }}
              >
                Review Solutions Below
              </Button>
            </div>
          </div>
        ) : (
          <form id="report-details-form" onSubmit={handleReportSubmit} className="space-y-4 py-2">
            {reportError && (
              <Alert tone="red" className="text-xs">
                {reportError}
              </Alert>
            )}

            <div>
              <Label className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Gender <span className="text-red-500">*</span>
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setGender('Male')}
                  className={`group relative flex items-center justify-center gap-2.5 rounded-xl border py-2.5 px-4 text-sm font-bold transition-all shadow-xs ${gender === 'Male'
                      ? 'border-blue-500 bg-blue-50/90 text-blue-800 ring-2 ring-blue-500/30 dark:border-blue-400 dark:bg-blue-950/70 dark:text-blue-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-700 dark:hover:bg-blue-950/30'
                    }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-base dark:bg-blue-900/60 shadow-xs">
                    👦
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    Male
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="10" cy="14" r="5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 5l-5.4 5.4M19 5h-4.5M19 5v4.5" />
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setGender('Female')}
                  className={`group relative flex items-center justify-center gap-2.5 rounded-xl border py-2.5 px-4 text-sm font-bold transition-all shadow-xs ${gender === 'Female'
                      ? 'border-pink-500 bg-pink-50/90 text-pink-800 ring-2 ring-pink-500/30 dark:border-pink-400 dark:bg-pink-950/70 dark:text-pink-200'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-pink-300 hover:bg-pink-50/40 hover:text-pink-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-pink-700 dark:hover:bg-pink-950/30'
                    }`}
                >
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-pink-100 text-base dark:bg-pink-900/60 shadow-xs">
                    👧
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold">
                    Female
                    <svg className="w-4 h-4 text-pink-600 dark:text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <circle cx="12" cy="9" r="5" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 14v7M9.5 18h5" />
                    </svg>
                  </span>
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="report-school-input" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                School <span className="text-red-500">*</span>
              </Label>
              <Input
                id="report-school-input"
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Delhi Public School"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="report-city-input" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="report-city-input"
                required
                autoFocus
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="report-board-select" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Board <span className="text-red-500">*</span>
              </Label>
              <select
                id="report-board-select"
                value={board}
                onChange={(e) => setBoard(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="State Board">State Board</option>
                <option value="CBSE Board">CBSE Board</option>
                <option value="ICSE Board">ICSE Board</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {board === 'Other' && (
              <div>
                <Label htmlFor="report-other-board-input" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Specify Your Board <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="report-other-board-input"
                  required
                  value={otherBoard}
                  onChange={(e) => setOtherBoard(e.target.value)}
                  placeholder="e.g. Cambridge, IB, etc."
                  className="text-sm"
                />
              </div>
            )}

            <div className="flex items-start gap-2.5 rounded-lg border border-amber-300/60 bg-amber-50/50 p-3.5 dark:border-amber-900/60 dark:bg-amber-950/20">
              <input
                id="report-whatsapp-consent"
                type="checkbox"
                required
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <Label htmlFor="report-whatsapp-consent" className="cursor-pointer text-xs font-medium leading-snug text-slate-700 dark:text-slate-200">
                <strong className="text-red-500 mr-0.5">*</strong>
                I give permission to Shri Ram Smart Minds Academy to contact me on my WhatsApp number for sending the detailed report.
              </Label>
            </div>
          </form>
        )}
      </Dialog>
        </div>
      )}
    </div>
  );
}
