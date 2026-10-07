'use client';

import React, { useEffect, useState } from 'react';
import { Star, CheckCircle2, MessageSquareHeart, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui';

interface DiagnosticFeedbackWidgetProps {
  attemptId?: string;
  testId?: string;
  sourceTab: 'report' | 'solutions';
  className?: string;
}

export function DiagnosticFeedbackWidget({
  attemptId,
  testId,
  sourceTab,
  className = '',
}: DiagnosticFeedbackWidgetProps) {
  const [testRating, setTestRating] = useState<number | null>(null);
  const [testHover, setTestHover] = useState<number | null>(null);

  const [reportRating, setReportRating] = useState<number | null>(null);
  const [reportHover, setReportHover] = useState<number | null>(null);

  const [feedbackText, setFeedbackText] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch existing feedback if any
  useEffect(() => {
    let isMounted = true;
    if (!attemptId) return;

    setLoading(true);
    fetch(`/api/student/feedback?attemptId=${encodeURIComponent(attemptId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isMounted || !data?.feedback) return;
        if (data.feedback.testRating) setTestRating(data.feedback.testRating);
        if (data.feedback.reportRating) setReportRating(data.feedback.reportRating);
        if (data.feedback.feedbackText) setFeedbackText(data.feedback.feedbackText);
        setSubmitted(true);
      })
      .catch((err) => {
        console.warn('[feedback] failed to fetch existing feedback', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [attemptId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testRating && !reportRating && !feedbackText.trim()) {
      setErrorMsg('Please select a rating or enter your comments.');
      return;
    }

    setErrorMsg(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/student/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attemptId: attemptId || null,
          testId: testId || null,
          testRating: testRating || null,
          reportRating: reportRating || null,
          feedbackText: feedbackText.trim() || null,
          sourceTab,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to submit feedback.');
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to submit feedback.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const RATING_LABELS = ['', 'Needs Work', 'Fair', 'Good', 'Very Good', 'Excellent'];

  return (
    <div
      id="feedback-section"
      className={`mx-auto max-w-5xl w-full rounded-3xl border-2 border-amber-400/90 bg-gradient-to-br from-amber-50/95 via-amber-50/40 to-yellow-50/70 p-5 sm:p-7 md:p-8 shadow-lg shadow-amber-500/10 transition dark:border-amber-500/70 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-amber-950/40 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 via-amber-500 to-orange-500 text-slate-950 shadow-md shadow-amber-500/30 ring-4 ring-amber-200/90 dark:ring-amber-900/60 shrink-0">
            <MessageSquareHeart className="size-6 text-slate-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shadow-2xs dark:bg-amber-400">
                ⭐ Feedback Section
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300">
                Your Voice Matters
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white mt-1">
              Student Feedback on Diagnostic Test &amp; Report
            </h3>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Your feedback helps our faculty refine diagnostic evaluations and make learning more impactful!
            </p>
          </div>
        </div>

        {submitted && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 dark:bg-emerald-950/80 px-3 py-1 text-xs font-bold text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800 shrink-0">
            <CheckCircle2 className="size-4 text-emerald-600 dark:text-emerald-400" />
            Feedback Saved
          </span>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
          <Loader2 className="size-4 animate-spin text-indigo-600" />
          <span>Loading feedback…</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {errorMsg && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/90 p-3 text-xs font-semibold text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/50 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. Diagnostic Test Rating */}
            <div className="rounded-2xl border-2 border-amber-200/90 bg-white/95 p-4 dark:border-amber-800/60 dark:bg-slate-900/90 space-y-2 shadow-xs transition hover:border-amber-400 dark:hover:border-amber-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-amber-500" />
                  Diagnostic Test Experience
                </span>
                <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 min-h-[16px]">
                  {RATING_LABELS[testHover ?? testRating ?? 0]}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Question quality, exam interface, and testing balance
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (testHover ?? testRating ?? 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setTestRating(star)}
                      onMouseEnter={() => setTestHover(star)}
                      onMouseLeave={() => setTestHover(null)}
                      className="p-1 rounded-lg transition-transform hover:scale-125 active:scale-95 focus:outline-hidden"
                      aria-label={`Rate test ${star} stars`}
                    >
                      <Star
                        className={`size-6 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'text-slate-300 hover:text-amber-400 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. Diagnostic Report Rating */}
            <div className="rounded-2xl border-2 border-amber-200/90 bg-white/95 p-4 dark:border-amber-800/60 dark:bg-slate-900/90 space-y-2 shadow-xs transition hover:border-amber-400 dark:hover:border-amber-600">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-orange-500" />
                  Diagnostic Report Clarity &amp; Value
                </span>
                <span className="text-[11px] font-extrabold text-amber-700 dark:text-amber-300 min-h-[16px]">
                  {RATING_LABELS[reportHover ?? reportRating ?? 0]}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                Strength analysis, priority gaps, and actionable recommendations
              </p>
              <div className="flex items-center gap-1.5 pt-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = (reportHover ?? reportRating ?? 0) >= star;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setReportRating(star)}
                      onMouseEnter={() => setReportHover(star)}
                      onMouseLeave={() => setReportHover(null)}
                      className="p-1 rounded-lg transition-transform hover:scale-125 active:scale-95 focus:outline-hidden"
                      aria-label={`Rate report ${star} stars`}
                    >
                      <Star
                        className={`size-6 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-500 drop-shadow-xs'
                            : 'text-slate-300 hover:text-amber-400 dark:text-slate-700'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Feedback Text Comment Box */}
          <div className="space-y-1.5">
            <label
              htmlFor={`diagnostic-feedback-${sourceTab}`}
              className="block text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              Any suggestions or thoughts on the test and report? (Optional)
            </label>
            <textarea
              id={`diagnostic-feedback-${sourceTab}`}
              rows={3}
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Tell us what you liked or how we can make our Board diagnostic tests even better…"
              className="w-full rounded-2xl border-2 border-amber-300/80 bg-white/95 p-3.5 text-xs text-slate-900 placeholder:text-slate-400 shadow-2xs transition focus:border-amber-500 focus:outline-hidden focus:ring-4 focus:ring-amber-500/20 dark:border-amber-800/70 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-600 dark:text-slate-400">
              {submitted
                ? 'Your feedback has been registered. You can modify it and re-submit anytime.'
                : 'Takes just 10 seconds to help us build a better student experience.'}
            </p>
            <Button
              type="submit"
              disabled={submitting}
              size="sm"
              className="rounded-xl bg-gradient-to-r from-amber-500 via-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs px-5 py-2.5 shadow-md shadow-amber-500/25 transition flex items-center justify-center gap-1.5 shrink-0"
            >
              {submitting ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Submitting…</span>
                </>
              ) : (
                <>
                  <Send className="size-3.5" />
                  <span>{submitted ? 'Update Feedback' : 'Submit Feedback'}</span>
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
