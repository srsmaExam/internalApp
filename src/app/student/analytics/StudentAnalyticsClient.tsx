'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  RotateCw,
  Lock,
  FileText,
  Sparkles,
  ArrowRight,
  Zap,
} from 'lucide-react';
import {
  Alert,
  Button,
  buttonClass,
  EmptyState,
  Spinner,
  Input,
  Label,
} from '@/components/ui';
import { Dialog } from '@/components/Dialog';
import { BoardReadinessReport } from '@/components/report/BoardReadinessReport';
import { DiagnosticFeedbackWidget } from '@/components/report/DiagnosticFeedbackWidget';
import type { DiagnosticEvaluationResult } from '@/lib/diagnostic-evaluator';

interface StudentAnalyticsData {
  isReportUnlocked?: boolean;
  gender?: string | null;
  studentDetails?: {
    board?: string | null;
    school?: string | null;
    city?: string | null;
    classLevel?: string | null;
    gender?: string | null;
    isFormFilled?: boolean;
  } | null;
  totalAttempts: number;
  avgScore: number;
  avgPercentile: number | null;
  diagnosticReport?: DiagnosticEvaluationResult | null;
  sampleDiagnosticReport?: DiagnosticEvaluationResult | null;
  recentTests: Array<{
    attemptId: string;
    testTitle: string;
    submittedAt: string | null;
    score: number;
    maxMarks: number;
    percentile: number | null;
  }>;
  subjectBreakdown: {
    physics?: { attempted: number; correct: number; accuracy: number };
    chemistry?: { attempted: number; correct: number; accuracy: number };
    maths?: { attempted: number; correct: number; accuracy: number };
    biology?: { attempted: number; correct: number; accuracy: number };
  };
  chapterBreakdown: Array<{
    chapter: string;
    subject: string;
    attempted: number;
    correct: number;
    total: number;
    accuracy: number;
  }>;
}

export function StudentAnalyticsClient({
  studentName,
  studentId,
  isTeacherView = false,
}: {
  studentName?: string;
  studentId?: string;
  isTeacherView?: boolean;
}) {
  const searchParams = useSearchParams();
  const paramAttemptId = searchParams.get('attemptId');
  const [data, setData] = useState<StudentAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSamplePreview, setShowSamplePreview] = useState(false);

  // Unlock Modal State
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [city, setCity] = useState('');
  const [board, setBoard] = useState('CBSE Board');
  const [otherBoard, setOtherBoard] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | ''>('');
  const [school, setSchool] = useState('');
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  async function loadData() {
    try {
      setLoading(true);
      setError(null);
      const url = studentId
        ? `/api/analytics/student/me?studentId=${encodeURIComponent(studentId)}`
        : '/api/analytics/student/me';
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? 'Failed to load analytics');
      }
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Could not load student analytics');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [studentId]);

  useEffect(() => {
    if (isTeacherView) return;
    if (data && data.totalAttempts > 0 && data.isReportUnlocked === false) {
      setShowUnlockModal(true);
    }
  }, [data, isTeacherView]);

  useEffect(() => {
    if (isTeacherView) return;
    const handleOpenModal = (e: Event) => {
      e.preventDefault();
      if (data && data.totalAttempts > 0) {
        setShowUnlockModal(true);
      }
    };
    window.addEventListener('srsma_open_report_modal', handleOpenModal);
    return () => {
      window.removeEventListener('srsma_open_report_modal', handleOpenModal);
    };
  }, [isTeacherView, data]);

  async function handleUnlockSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!gender) {
      setUnlockError('Please select your gender.');
      return;
    }
    if (!school.trim()) {
      setUnlockError('Please enter your school name.');
      return;
    }
    if (!city.trim()) {
      setUnlockError('Please enter your city.');
      return;
    }
    if (board === 'Other' && !otherBoard.trim()) {
      setUnlockError('Please enter your board name.');
      return;
    }
    if (!whatsappConsent) {
      setUnlockError(
        'I give permission to Shri Ram Smart Minds Academy to contact me on my WhatsApp number for sending the detailed report is required.',
      );
      return;
    }

    setSubmitting(true);
    setUnlockError(null);

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
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message || 'Failed to unlock detailed report.');
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('srsma_report_unlocked', 'true');
        window.dispatchEvent(new Event('srsma_report_unlocked'));
      }

      setShowUnlockModal(false);
      loadData();
    } catch (err: any) {
      setUnlockError(err.message || 'Could not unlock report.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Spinner className="size-8 text-brand-700 dark:text-brand-400" />
        <p className="text-sm font-medium">Computing your performance trends...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Alert tone="red" title="Failed to load analytics">
          {error ?? 'Failed to load analytics'}
        </Alert>
        <Button variant="secondary" size="sm" onClick={loadData}>
          <RotateCw className="mr-1.5 size-3.5" />
          Retry
        </Button>
      </div>
    );
  }

  const isLocked = !isTeacherView && data.totalAttempts > 0 && data.isReportUnlocked === false;

  if (isLocked) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Performance &amp; Diagnostic Report
          </h1>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Personalized insights, percentile trends, and curriculum gap analysis.
          </p>
        </div>

        <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-br from-amber-500/15 via-brand-950/40 to-slate-900 p-8 text-center shadow-lg dark:border-amber-500/40">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-500 shadow-inner">
            <Lock className="size-8" />
          </div>
          <h2 className="mt-4 text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Your Detailed Diagnostic Report is Locked
          </h2>
          <p className="mx-auto mt-2 max-w-md text-xs text-slate-600 sm:text-sm dark:text-slate-300">
            Unlock your personalized 3-page diagnostic report with Board Readiness Index (BRI), cognitive skills breakdown, and priority gaps.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              onClick={() => setShowUnlockModal(true)}
              className="rounded-xl bg-amber-500 px-6 py-3 font-bold text-slate-950 shadow-md hover:bg-amber-400 dark:bg-amber-400 dark:hover:bg-amber-300"
            >
              <FileText className="mr-2 size-4" />
              Unlock Detailed Report
            </Button>
          </div>
        </div>

        {/* Modal */}
        <Dialog
          isOpen={showUnlockModal}
          onClose={() => !submitting && setShowUnlockModal(false)}
          size="md"
          title="Unlock Your Detailed Diagnostic Report"
          description="Enter your city and curriculum board so we can tailor your diagnostic report and send it to your WhatsApp."
          footer={
            <div className="flex w-full justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={() => setShowUnlockModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="unlock-report-form"
                size="sm"
                disabled={submitting}
                className="bg-brand-700 hover:bg-brand-800 dark:bg-brand-600 font-bold"
              >
                {submitting ? 'Unlocking…' : 'Unlock Detailed Report'}
              </Button>
            </div>
          }
        >
          <form id="unlock-report-form" onSubmit={handleUnlockSubmit} className="space-y-4 py-2">
            {unlockError && (
              <Alert tone="red" className="text-xs">
                {unlockError}
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
              <Label htmlFor="unlock-school" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                School <span className="text-red-500">*</span>
              </Label>
              <Input
                id="unlock-school"
                required
                value={school}
                onChange={(e) => setSchool(e.target.value)}
                placeholder="e.g. Delhi Public School"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="unlock-city" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                City <span className="text-red-500">*</span>
              </Label>
              <Input
                id="unlock-city"
                required
                autoFocus
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Hyderabad"
                className="text-sm"
              />
            </div>

            <div>
              <Label htmlFor="unlock-board" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Your Board <span className="text-red-500">*</span>
              </Label>
              <select
                id="unlock-board"
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
                <Label htmlFor="unlock-other-board" className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Specify Your Board <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="unlock-other-board"
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
                id="unlock-whatsapp-consent"
                type="checkbox"
                required
                checked={whatsappConsent}
                onChange={(e) => setWhatsappConsent(e.target.checked)}
                className="mt-0.5 size-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-900"
              />
              <Label htmlFor="unlock-whatsapp-consent" className="cursor-pointer text-xs font-medium leading-snug text-slate-700 dark:text-slate-200">
                <strong className="text-red-500 mr-0.5">*</strong>
                I give permission to Shri Ram Smart Minds Academy to contact me on my WhatsApp number for sending the detailed report.
              </Label>
            </div>
          </form>
        </Dialog>
      </div>
    );
  }

  const sampleParam = searchParams.get('sample');
  const isSampleMode = data.totalAttempts === 0 || showSamplePreview || sampleParam === 'true';
  const activeReport = isSampleMode
    ? (data.sampleDiagnosticReport ?? data.diagnosticReport)
    : data.diagnosticReport;

  if (data.totalAttempts === 0 && !activeReport) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            BOARD READINESS CHALLENGE REPORT
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Personalized diagnostic evaluation, cognitive skills profile, and actionable Class X Board recommendations.
          </p>
        </div>

        <EmptyState
          title="No completed tests yet"
          hint={
            isTeacherView
              ? "This student has not completed or submitted any tests yet."
              : "Take and submit your first Board Readiness Challenge test to unlock your personalized 3-page diagnostic report with Board Readiness Index (BRI), cognitive skills breakdown, and priority gaps."
          }
          action={
            <div className="flex flex-wrap items-center justify-center gap-3">
              {!isTeacherView && (
                <Link href="/student" className={buttonClass('primary', 'md')}>
                  Browse Available Tests
                </Link>
              )}
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      {/* Sample Preview Banner */}
      {isSampleMode && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-amber-300 bg-amber-50/90 p-4 text-xs shadow-sm dark:border-amber-800/80 dark:bg-amber-950/40">
          <div className="flex items-center gap-2.5">
            <div className="flex size-7 items-center justify-center rounded-lg bg-amber-500 text-white font-bold">
              ★
            </div>
            <div>
              <p className="font-bold text-amber-950 dark:text-amber-200">
                Sample Diagnostic Report Preview
              </p>
              <p className="text-amber-800 dark:text-amber-300/80 text-[11px]">
                {data.totalAttempts === 0
                  ? 'You have not written the test yet. Below is a sample 5-page Board Readiness Challenge Report demonstrating the personalized evaluation.'
                  : 'Viewing the 5-page Board Readiness Challenge Report with sample Class X student attempt responses.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!isTeacherView && data.totalAttempts === 0 && (
              <Link
                href="/student"
                className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 shadow-xs hover:bg-amber-400 transition"
              >
                <Zap className="size-3.5" />
                Take Test to Get Your Real Report
              </Link>
            )}
            {data.totalAttempts > 0 && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setShowSamplePreview(false)}
                className="shrink-0 font-bold"
              >
                Exit Sample Preview
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Board Readiness Report View */}
      {activeReport ? (
        <>
          <BoardReadinessReport
            report={activeReport}
            studentGender={data.gender || gender}
            studentDetails={data.studentDetails}
            attemptId={paramAttemptId || data.recentTests?.[0]?.attemptId}
            isTeacherView={isTeacherView}
          />

          {/* Direct to Solutions CTA at the end of the reports tab */}
          {(paramAttemptId || data.recentTests?.[0]?.attemptId) && (
            <div className="mt-8 rounded-2xl border border-brand-200 bg-gradient-to-r from-brand-50/90 via-indigo-50/70 to-blue-50/90 p-5 sm:p-7 shadow-sm dark:border-brand-800/60 dark:bg-gradient-to-r dark:from-slate-900/90 dark:via-brand-950/40 dark:to-slate-900/90">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-800 dark:bg-brand-900/60 dark:text-brand-300">
                    <Sparkles className="size-3.5" />
                    <span>Question-by-Question Solutions</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                    Ready to Review Your Worked Solutions?
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                    Check detailed faculty step-by-step derivations, question breakdowns, and pacing recommendations.
                  </p>
                </div>
                <Link
                  href={`/student/attempts/${paramAttemptId || data.recentTests?.[0]?.attemptId}/result?tab=solutions`}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-800 transition dark:bg-brand-600 dark:hover:bg-brand-500 shrink-0"
                >
                  <span>Proceed to Solutions</span>
                  <ArrowRight className="size-4" />
                </Link>
              </div>
            </div>
          )}

          {/* Student Feedback on Diagnostic Test & Report */}
          {(paramAttemptId || data.recentTests?.[0]?.attemptId) && (
            <DiagnosticFeedbackWidget
              attemptId={paramAttemptId || data.recentTests?.[0]?.attemptId}
              sourceTab="report"
              className="mt-6"
            />
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            title="No diagnostic reports available yet"
            hint="Take and submit your first test to unlock your personalized diagnostic report."
          />
        </div>
      )}
    </div>
  );
}
