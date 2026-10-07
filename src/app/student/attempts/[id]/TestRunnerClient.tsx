'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { get, set } from 'idb-keyval';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Flag,
  Layers,
  Maximize2,
  Minimize2,
  WifiOff,
  X,
} from 'lucide-react';
import { Alert, Button, Card, CardBody, Spinner } from '@/components/ui';
import { QuestionBody } from '@/components/Katex';
import type { StudentQuestionDto } from '@/lib/dto';

export type AnswerState =
  | 'not_seen'
  | 'seen_unanswered'
  | 'answered'
  | 'answered_flagged'
  | 'flagged_unanswered';

export type AnswerModificationItem = {
  from?: { key?: string; value?: number | string } | null;
  to?: { key?: string; value?: number | string } | null;
  elapsedMs: number;
  isAfter15s: boolean;
  timestamp: string;
};

export type AnswerModificationMeta = {
  count: number;
  modifiedAfter15s: boolean;
  after15sCount: number;
  history: AnswerModificationItem[];
};

export type QuestionRuntimeState = StudentQuestionDto & {
  state: AnswerState;
  response: { key?: string; value?: number | string } | null;
  timeSpentMs: number;
  visitCount: number;
  solveOrder?: number | null;
  firstActionTimeMs?: number | null;
  firstActionType?: 'answered' | 'skipped' | 'flagged' | null;
  visitTimesMs?: number[];
  answerModifications?: AnswerModificationMeta | null;
  modifiedAfter15s?: boolean;
  /**
   * Local-only text for a numerical box mid-typing ("-", "3."), so a partially
   * entered number stays editable without being stored as a response. Never
   * sent to the server.
   */
  draftValue?: string;
};

/**
 * One cell of the question palette.
 *
 * Was duplicated between the desktop aside and the mobile sheet, which had
 * already drifted apart in sizing and hover states. State was conveyed by
 * background colour alone — indistinguishable for a red/green colour-blind
 * student, and unreadable to a screen reader — so each cell now also carries a
 * glyph and a spoken label.
 */
const STATE_LABEL: Record<AnswerState, string> = {
  not_seen: 'not visited',
  seen_unanswered: 'not answered',
  answered: 'answered',
  answered_flagged: 'answered and marked for review',
  flagged_unanswered: 'marked for review',
};

function PaletteButton({
  question,
  isCurrent,
  onClick,
}: {
  question: QuestionRuntimeState;
  isCurrent: boolean;
  onClick: () => void;
}) {
  const styles: Record<AnswerState, string> = {
    not_seen: 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
    seen_unanswered: 'bg-red-600 text-white hover:bg-red-700',
    answered: 'bg-emerald-600 text-white hover:bg-emerald-700',
    flagged_unanswered: 'bg-purple-700 text-white hover:bg-purple-800',
    answered_flagged: 'bg-purple-700 text-white hover:bg-purple-800',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Question ${question.position}, ${STATE_LABEL[question.state]}`}
      aria-current={isCurrent ? 'true' : undefined}
      className={`tnum relative flex size-9 items-center justify-center rounded-md text-xs font-bold transition-all ${
        styles[question.state]
      } ${isCurrent ? 'scale-105 ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
    >
      {question.position}

      {/* Non-colour state cues */}
      {question.state === 'answered' && (
        <Check className="absolute -right-1 -top-1 size-3 rounded-full bg-white p-px text-emerald-700" aria-hidden />
      )}
      {(question.state === 'answered_flagged' || question.state === 'flagged_unanswered') && (
        <Flag className="absolute -left-1 -top-1 size-3 rounded-full bg-white p-px text-purple-700" aria-hidden />
      )}
      {question.state === 'answered_flagged' && (
        <span
          className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-white bg-emerald-500"
          aria-hidden
        />
      )}
    </button>
  );
}

/** Debounce for answer-driven saves: rapid re-selections collapse into one request. */
const ANSWER_SAVE_DEBOUNCE_MS = 5000;
/** Idle heartbeat. It only sends when something changed since the last save. */
const HEARTBEAT_MS = 120_000;

export function TestRunnerClient({
  attemptId,
  testTitle,
  deadlineAt,
  studentName,
  serverTime,
  initialExtensionsCount = 0,
  initialQuestions,
}: {
  attemptId: string;
  testTitle: string;
  deadlineAt: string;
  studentName: string;
  serverTime: string;
  initialExtensionsCount?: number;
  initialQuestions?: QuestionRuntimeState[];
}) {
  const router = useRouter();
  const [questions, setQuestions] = useState<QuestionRuntimeState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Online / Offline & Sync status.
  // Initialised from navigator so a student who loads the page already offline
  // sees the indicator immediately rather than a false "online".
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Time Extension Popup States
  const [currentDeadline, setCurrentDeadline] = useState(deadlineAt);
  const [extensionCount, setExtensionCount] = useState(initialExtensionsCount);
  const [timeExtensionModalOpen, setTimeExtensionModalOpen] = useState(false);
  const [popupTimer, setPopupTimer] = useState(60);
  const [extendingTime, setExtendingTime] = useState(false);
  const [extensionError, setExtensionError] = useState<string | null>(null);

  // Timer state
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const clockOffsetRef = useRef<number>(Date.now() - new Date(serverTime).getTime());

  // Active question timing tracking
  const activeSinceRef = useRef<number>(performance.now());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** True while there are changes the server has not seen. Gates every autosave. */
  const dirtyRef = useRef(false);
  /** Tracks IDs of questions with unsaved changes for delta syncing. */
  const dirtyQuestionIdsRef = useRef<Set<string>>(new Set());
  /** Behavioral telemetry tracking refs */
  const maxSolveOrderRef = useRef<number>(0);
  const lastAnsweredAtRef = useRef<Record<string, number>>({});
  const firstVisitStartRef = useRef<Record<string, number>>({});
  /** In-memory Blob URL cache for question/option diagrams to eliminate re-fetching on navigation. */
  const imageBlobCacheRef = useRef<Map<string, string>>(new Map());
  const [, setImageCacheTick] = useState(0);

  const getImageSrc = useCallback((questionId: string, placeholderId: string) => {
    const key = `${questionId}:${placeholderId}`;
    return imageBlobCacheRef.current.get(key) || `/api/files/images/${questionId}/${placeholderId}`;
  }, []);

  const initialQuestionsRef = useRef(initialQuestions);

  /**
   * A live mirror of `questions` for callbacks that must not be re-created when
   * it changes.
   *
   * Two separate bugs came from reading `questions` out of a closure:
   *   - the 1s countdown effect captured the FIRST render's auto-submit, whose
   *     `questions` was `[]` and whose `submitting` was permanently `false`, so
   *     on expiry it re-fired every second and flushed an empty answer array;
   *   - `syncWithServer` changed identity on every keystroke, which tore down
   *     and restarted the 15s heartbeat effect each time — for a student who
   *     was actively working, the heartbeat never actually fired.
   */
  const questionsRef = useRef<QuestionRuntimeState[]>([]);
  useEffect(() => {
    questionsRef.current = questions;
  }, [questions]);

  /** Guards auto-submit against re-entry. A ref, because the countdown callback
   *  cannot see state updates. */
  const submitStartedRef = useRef(false);

  const currentQ = questions[currentIndex];
  const allQuestionsVisited =
    questions.length > 0 &&
    questions.every((q, idx) => idx === currentIndex || q.state !== 'not_seen');

  // Subject tabs are derived from the paper, not hardcoded — a Physics-only
  // sectional test used to render two dead tabs reading 0/0.
  const subjects = useMemo(() => {
    const order = ['maths', 'physics', 'chemistry', 'biology'] as const;
    const present = new Set(questions.map((q) => q.subject));
    return order.filter((s) => present.has(s));
  }, [questions]);

  const currentSubject = currentQ?.subject ?? subjects[0] ?? 'maths';

  // IDB Storage key for offline mirror
  const idbKey = `vtp_attempt_${attemptId}`;

  // 1. Initial Load: Fetch questions & reconcile with IDB mirror
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        setLoading(true);
        // Questions normally arrive pre-loaded from the server component;
        // fetch only as a fallback.
        let serverData: QuestionRuntimeState[];
        if (initialQuestionsRef.current) {
          serverData = initialQuestionsRef.current;
        } else {
          const res = await fetch(`/api/attempts/${attemptId}/questions`);
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.message || 'Failed to load test questions');
          }
          serverData = await res.json();
        }

        // Check IndexedDB for newer offline unsaved answers
        const idbSaved = (await get(idbKey)) as Record<string, Partial<QuestionRuntimeState>> | undefined;

        const reconciled = serverData.map((q, idx) => {
          const offline = idbSaved?.[q.id];
          const merged: QuestionRuntimeState = {
            ...q,
            state: offline?.state ?? q.state,
            response: offline?.response !== undefined ? offline.response : q.response,
            timeSpentMs: Math.max(q.timeSpentMs, offline?.timeSpentMs ?? 0),
            visitCount: Math.max(q.visitCount ?? 0, offline?.visitCount ?? 0),
            solveOrder: offline?.solveOrder !== undefined ? offline.solveOrder : q.solveOrder ?? null,
            firstActionTimeMs: offline?.firstActionTimeMs !== undefined ? offline.firstActionTimeMs : q.firstActionTimeMs ?? null,
            firstActionType: offline?.firstActionType !== undefined ? offline.firstActionType : q.firstActionType ?? null,
            visitTimesMs: offline?.visitTimesMs ?? (q.visitTimesMs && q.visitTimesMs.length > 0 ? q.visitTimesMs : []),
            answerModifications: offline?.answerModifications ?? q.answerModifications ?? null,
            modifiedAfter15s: offline?.modifiedAfter15s ?? q.modifiedAfter15s ?? false,
          };

          // Mark first question as seen and initialize its visit if fresh
          if (idx === 0) {
            if (merged.state === 'not_seen') {
              merged.state = 'seen_unanswered';
            }
            if (merged.visitCount === 0) {
              merged.visitCount = 1;
            }
            if (!merged.visitTimesMs || merged.visitTimesMs.length === 0) {
              merged.visitTimesMs = [0];
            }
          }
          return merged;
        });

        // Initialize telemetry tracking refs
        maxSolveOrderRef.current = Math.max(0, ...reconciled.map((q) => q.solveOrder ?? 0));
        if (reconciled[0] && !firstVisitStartRef.current[reconciled[0].id]) {
          firstVisitStartRef.current[reconciled[0].id] = performance.now();
        }

        // Offline answers may be newer than the server's — push them on the next sync.
        if (idbSaved) {
          dirtyRef.current = true;
          for (const qId of Object.keys(idbSaved)) {
            dirtyQuestionIdsRef.current.add(qId);
          }
        }

        if (mounted) {
          setQuestions(reconciled);
          setLoading(false);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [attemptId, idbKey]);

  // Pre-load all question diagrams into browser memory Blob URLs.
  // Eliminates all serverless invocations for images as the student navigates back and forth.
  useEffect(() => {
    if (questions.length === 0) return;
    let active = true;

    const targets: Array<{ qId: string; pId: string }> = [];
    const imgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

    for (const q of questions) {
      let match: RegExpExecArray | null;
      const bodyStr = q.body || '';
      imgRegex.lastIndex = 0;
      while ((match = imgRegex.exec(bodyStr)) !== null) {
        if (match[2]) targets.push({ qId: q.id, pId: match[2] });
      }
      if (Array.isArray(q.options)) {
        for (const opt of q.options) {
          const optBody = opt.body || '';
          imgRegex.lastIndex = 0;
          while ((match = imgRegex.exec(optBody)) !== null) {
            if (match[2]) targets.push({ qId: q.id, pId: match[2] });
          }
        }
      }
    }

    async function preloadAll() {
      for (const { qId, pId } of targets) {
        if (!active) break;
        const key = `${qId}:${pId}`;
        if (imageBlobCacheRef.current.has(key)) continue;

        try {
          const res = await fetch(`/api/files/images/${qId}/${pId}`);
          if (!res.ok) continue;
          const blob = await res.blob();
          if (!active) break;
          const blobUrl = URL.createObjectURL(blob);
          imageBlobCacheRef.current.set(key, blobUrl);
          setImageCacheTick((t) => t + 1);
        } catch {
          // Graceful fallback to network URL on error
        }
      }
    }

    void preloadAll();

    return () => {
      active = false;
      for (const url of imageBlobCacheRef.current.values()) {
        URL.revokeObjectURL(url);
      }
      imageBlobCacheRef.current.clear();
    };
  }, [questions]);

  // 3. Precision timing per question accumulation
  const currentIndexRef = useRef(0);
  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  const flushTimeSpent = useCallback(() => {
    const idx = currentIndexRef.current;
    if (!questionsRef.current[idx]) return;
    const now = performance.now();
    const delta = Math.round(now - activeSinceRef.current);
    activeSinceRef.current = now;

    if (delta > 0) {
      setQuestions((prev) => {
        const copy = [...prev];
        const q = copy[idx];
        if (q) {
          const currentVisits = Array.isArray(q.visitTimesMs) && q.visitTimesMs.length > 0
            ? [...q.visitTimesMs]
            : [0];
          const lastVisitIdx = currentVisits.length - 1;
          currentVisits[lastVisitIdx] = (currentVisits[lastVisitIdx] || 0) + delta;

          copy[idx] = {
            ...q,
            timeSpentMs: (q.timeSpentMs ?? 0) + delta,
            visitTimesMs: currentVisits,
          };
        }
        return copy;
      });
    }
  }, []);

  // 4. Mirror to IndexedDB whenever questions state changes
  useEffect(() => {
    if (questions.length === 0) return;
    const cacheMap: Record<string, Partial<QuestionRuntimeState>> = {};
    for (const q of questions) {
      cacheMap[q.id] = {
        state: q.state,
        response: q.response,
        timeSpentMs: q.timeSpentMs,
        visitCount: q.visitCount,
        solveOrder: q.solveOrder,
        firstActionTimeMs: q.firstActionTimeMs,
        firstActionType: q.firstActionType,
        visitTimesMs: q.visitTimesMs,
        answerModifications: q.answerModifications,
        modifiedAfter15s: q.modifiedAfter15s,
      };
    }
    set(idbKey, cacheMap).catch(() => {});
  }, [questions, idbKey]);

  /** The wire payload, always read from the ref so it is never stale. */
  const buildAnswersPayload = useCallback(
    (forceAll = false) => {
      const dirtyIds = dirtyQuestionIdsRef.current;
      const targetQuestions =
        forceAll || dirtyIds.size === 0
          ? questionsRef.current
          : questionsRef.current.filter((q) => dirtyIds.has(q.id));

      return {
        answers: targetQuestions.map((q) => ({
          questionId: q.id,
          response: q.response,
          state: q.state,
          timeSpentMs: q.timeSpentMs,
          visitCount: q.visitCount,
          solveOrder: q.solveOrder ?? null,
          firstActionTimeMs: q.firstActionTimeMs ?? null,
          firstActionType: q.firstActionType ?? null,
          visitTimesMs: q.visitTimesMs ?? [],
          answerModifications: q.answerModifications ?? null,
          modifiedAfter15s: Boolean(q.modifiedAfter15s),
        })),
      };
    },
    [],
  );

  // 5. Server Autosave Dispatcher.
  // Stable identity (no `questions` dependency) so the heartbeat and listener
  // effects below mount exactly once.
  const syncWithServer = useCallback(async () => {
    if (questionsRef.current.length === 0 || !navigator.onLine || !dirtyRef.current) return;
    setIsSyncing(true);

    flushTimeSpent();

    // Snapshot in-flight dirty question IDs
    const inFlightDirtyIds = new Set(dirtyQuestionIdsRef.current);
    const payload = buildAnswersPayload(false);

    if (payload.answers.length === 0) {
      dirtyRef.current = false;
      setIsSyncing(false);
      return;
    }

    try {
      const res = await fetch(`/api/attempts/${attemptId}/answers`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 403 && data.error === 'attempt_expired') {
          window.location.replace(`/student/attempts/${attemptId}/result?tab=solutions`);
          return;
        }
        dirtyRef.current = true;
        if (res.status === 401) {
          setSyncError('Signed out — your answers are saved on this device. Sign in again in another tab.');
          return;
        }
        throw new Error(data?.message || 'Sync failed');
      }

      // Clear only the IDs that were successfully sent in this request
      for (const id of inFlightDirtyIds) {
        dirtyQuestionIdsRef.current.delete(id);
      }
      if (dirtyQuestionIdsRef.current.size === 0) {
        dirtyRef.current = false;
      }

      setSyncError(null);
      setLastSavedAt(Date.now());
    } catch {
      dirtyRef.current = true;
      setSyncError('Not saved to the server — your answers are safe on this device and will re-sync.');
    } finally {
      setIsSyncing(false);
    }
  }, [attemptId, buildAnswersPayload, flushTimeSpent, router]);

  // Debounced auto-sync when questions state updates
  const scheduleSync = useCallback(() => {
    dirtyRef.current = true;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      syncWithServer();
    }, ANSWER_SAVE_DEBOUNCE_MS);
  }, [syncWithServer]);

  // 6. Periodic Heartbeat Sync (every 120s, only when something changed).
  // Mounts once, because syncWithServer's identity is stable.
  useEffect(() => {
    const heartbeat = setInterval(() => {
      syncWithServer();
    }, HEARTBEAT_MS);
    return () => clearInterval(heartbeat);
  }, [syncWithServer]);

  // 7. Network Listeners, Tab Blur, Visibility & BeforeUnload
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncWithServer();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    // FBR-12: `sendBeacon` is explicitly guaranteed to survive page teardown;
    // a `fetch` (what `syncWithServer` issues) is not — the browser may cancel
    // it mid-flight as the page freezes. sendBeacon can only issue POST, and
    // always labels the body text/plain — the route also exports POST and
    // parses the body as text for exactly this.
    const flushBeacon = () => {
      if (submitStartedRef.current || !dirtyRef.current) return;
      flushTimeSpent();
      const blob = new Blob([JSON.stringify(buildAnswersPayload(true))], { type: 'text/plain;charset=UTF-8' });
      const queued = navigator.sendBeacon(`/api/attempts/${attemptId}/answers`, blob);
      if (queued) {
        dirtyRef.current = false;
        dirtyQuestionIdsRef.current.clear();
        // The beacon carried everything; drop the pending debounced PATCH.
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // One beacon, and only if there are unsaved changes. On mobile this is
        // often the last event before the OS kills the tab, so it must be a
        // beacon (survives teardown) rather than a fetch.
        flushBeacon();
      } else {
        activeSinceRef.current = performance.now();
      }
    };

    // FBR-12: `pagehide` — not `beforeunload` — is the authoritative flush.
    // `beforeunload` does not fire at all on iOS Safari, and registering it
    // unconditionally disqualifies the page from the back/forward cache on
    // every browser that has one, turning every in-app back gesture into a
    // full reload. `pagehide` fires reliably on both platforms and doesn't
    // carry that cost. `beforeunload` is kept only for the desktop
    // "are you sure you want to leave" confirm dialog, which has no
    // equivalent on `pagehide`.
    const handlePageHide = () => {
      flushBeacon();
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // An accidental Ctrl+W used to end the attempt with no warning.
      if (!submitStartedRef.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // Esc leaves fullscreen without going through our toggle, which left the
    // button showing the wrong icon.
    const handleFullscreenChange = () => setIsFullscreen(Boolean(document.fullscreenElement));

    // FBR-04: On mobile, fullscreen is disabled. If any browser opened fullscreen, exit it.
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (isMobile && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }

    setIsFullscreen(Boolean(document.fullscreenElement));

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [attemptId, buildAnswersPayload, flushTimeSpent, syncWithServer]);

  // Toggle Fullscreen (Desktop only). `isFullscreen` is driven by the fullscreenchange
  // listener above rather than set optimistically here.
  const toggleFullscreen = () => {
    const isMobile =
      typeof window !== 'undefined' &&
      (window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent));
    if (isMobile) return;

    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Navigating to question index
  const goToQuestion = (targetIndex: number) => {
    if (targetIndex < 0 || targetIndex >= questions.length || targetIndex === currentIndex) return;

    flushTimeSpent();

    setQuestions((prev) => {
      const copy = [...prev];
      const current = copy[currentIndex];
      // 6. Time for first action (reading vs decision): record 'skipped' if leaving without answering
      if (current) {
        if (current.firstActionTimeMs === null || current.firstActionTimeMs === undefined) {
          const hasResponse = current.response?.key || current.response?.value !== undefined;
          if (!hasResponse) {
            const start = firstVisitStartRef.current[current.id] || activeSinceRef.current;
            copy[currentIndex] = {
              ...current,
              firstActionTimeMs: Math.max(0, Math.round(performance.now() - start)),
              firstActionType: 'skipped',
            };
            dirtyQuestionIdsRef.current.add(current.id);
            dirtyRef.current = true;
          }
        }
      }

      const target = copy[targetIndex];
      if (target) {
        const prevCount = target.visitCount ?? 0;
        const nextCount = prevCount + 1;
        const currentVisits =
          Array.isArray(target.visitTimesMs) && target.visitTimesMs.length > 0
            ? [...target.visitTimesMs]
            : prevCount > 0
              ? [target.timeSpentMs ?? 0]
              : [];

        // 5. Re-visits and Split Time: record time taken per visit
        const nextVisits = prevCount > 0 ? [...currentVisits, 0] : [0];

        // 6. Record start of visit 1 for target question
        if (prevCount === 0 && !firstVisitStartRef.current[target.id]) {
          firstVisitStartRef.current[target.id] = performance.now();
        }

        copy[targetIndex] = {
          ...target,
          visitCount: nextCount,
          visitTimesMs: nextVisits,
          state: target.state === 'not_seen' ? 'seen_unanswered' : target.state,
        };
      }
      return copy;
    });

    setCurrentIndex(targetIndex);
    activeSinceRef.current = performance.now();
  };

  // Action: Select MCQ Option
  const handleSelectOption = (key: string) => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        // 6. Time for first action (reading vs solving decision time)
        let firstActionTimeMs = q.firstActionTimeMs;
        let firstActionType = q.firstActionType;
        if (firstActionTimeMs === null || firstActionTimeMs === undefined) {
          const start = firstVisitStartRef.current[q.id] || activeSinceRef.current;
          firstActionTimeMs = Math.max(0, Math.round(performance.now() - start));
          firstActionType = 'answered';
        }

        // 1. Order of solving questions
        let solveOrder = q.solveOrder;
        if (solveOrder === null || solveOrder === undefined) {
          maxSolveOrderRef.current += 1;
          solveOrder = maxSolveOrderRef.current;
        }

        // 4. Answer Modifications (>15 seconds check)
        const prevResp = q.response;
        let answerModifications = q.answerModifications || {
          count: 0,
          modifiedAfter15s: false,
          after15sCount: 0,
          history: [],
        };
        let modifiedAfter15s = q.modifiedAfter15s || false;

        if (prevResp && prevResp.key && prevResp.key !== key) {
          const lastAnsTime = lastAnsweredAtRef.current[q.id] || Date.now();
          const elapsedMs = Math.max(0, Date.now() - lastAnsTime);
          const isAfter15s = elapsedMs > 15_000;
          const modItem: AnswerModificationItem = {
            from: prevResp,
            to: { key },
            elapsedMs,
            isAfter15s,
            timestamp: new Date().toISOString(),
          };
          answerModifications = {
            count: answerModifications.count + 1,
            modifiedAfter15s: answerModifications.modifiedAfter15s || isAfter15s,
            after15sCount: answerModifications.after15sCount + (isAfter15s ? 1 : 0),
            history: [...answerModifications.history, modItem],
          };
          modifiedAfter15s = answerModifications.modifiedAfter15s;
        }
        lastAnsweredAtRef.current[q.id] = Date.now();

        copy[currentIndex] = {
          ...q,
          response: { key },
          solveOrder,
          firstActionTimeMs,
          firstActionType,
          answerModifications,
          modifiedAfter15s,
          state: q.state === 'flagged_unanswered' || q.state === 'answered_flagged' ? 'answered_flagged' : 'answered',
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });
    scheduleSync();
  };

  /**
   * Accepts numerical input with validation and records telemetry.
   */
  const handleSetIntegerValue = (val: string) => {
    const trimmed = val.trim();
    if (trimmed !== '' && !/^-?\d*\.?\d*$/.test(trimmed)) return;

    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        const num = Number(trimmed);
        const complete = trimmed !== '' && Number.isFinite(num);
        const wasFlagged = q.state === 'flagged_unanswered' || q.state === 'answered_flagged';

        let firstActionTimeMs = q.firstActionTimeMs;
        let firstActionType = q.firstActionType;
        let solveOrder = q.solveOrder;
        let answerModifications = q.answerModifications || {
          count: 0,
          modifiedAfter15s: false,
          after15sCount: 0,
          history: [],
        };
        let modifiedAfter15s = q.modifiedAfter15s || false;

        if (complete) {
          // 6. Time for first action
          if (firstActionTimeMs === null || firstActionTimeMs === undefined) {
            const start = firstVisitStartRef.current[q.id] || activeSinceRef.current;
            firstActionTimeMs = Math.max(0, Math.round(performance.now() - start));
            firstActionType = 'answered';
          }

          // 1. Order of solving
          if (solveOrder === null || solveOrder === undefined) {
            maxSolveOrderRef.current += 1;
            solveOrder = maxSolveOrderRef.current;
          }

          // 4. Answer Modifications (>15s check)
          const prevResp = q.response;
          if (prevResp && prevResp.value !== undefined && prevResp.value !== num) {
            const lastAnsTime = lastAnsweredAtRef.current[q.id] || Date.now();
            const elapsedMs = Math.max(0, Date.now() - lastAnsTime);
            const isAfter15s = elapsedMs > 15_000;
            const modItem: AnswerModificationItem = {
              from: prevResp,
              to: { value: num },
              elapsedMs,
              isAfter15s,
              timestamp: new Date().toISOString(),
            };
            answerModifications = {
              count: answerModifications.count + 1,
              modifiedAfter15s: answerModifications.modifiedAfter15s || isAfter15s,
              after15sCount: answerModifications.after15sCount + (isAfter15s ? 1 : 0),
              history: [...answerModifications.history, modItem],
            };
            modifiedAfter15s = answerModifications.modifiedAfter15s;
          }
          lastAnsweredAtRef.current[q.id] = Date.now();
        }

        copy[currentIndex] = {
          ...q,
          response: complete ? { value: num } : null,
          draftValue: trimmed,
          solveOrder: complete ? solveOrder : q.solveOrder,
          firstActionTimeMs,
          firstActionType,
          answerModifications,
          modifiedAfter15s,
          state: complete ? (wasFlagged ? 'answered_flagged' : 'answered') : wasFlagged ? 'flagged_unanswered' : 'seen_unanswered',
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });
    scheduleSync();
  };

  // Action: Save & Submit (when all questions are visited)
  const handleSaveAndSubmit = () => {
    flushTimeSpent();
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        const hasResponse = q.response?.key || q.response?.value !== undefined;
        const wasFlagged = q.state === 'flagged_unanswered' || q.state === 'answered_flagged';

        let firstActionTimeMs = q.firstActionTimeMs;
        let firstActionType = q.firstActionType;
        if (firstActionTimeMs === null || firstActionTimeMs === undefined) {
          const start = firstVisitStartRef.current[q.id] || activeSinceRef.current;
          firstActionTimeMs = Math.max(0, Math.round(performance.now() - start));
          firstActionType = hasResponse ? 'answered' : 'skipped';
        }

        copy[currentIndex] = {
          ...q,
          firstActionTimeMs,
          firstActionType,
          state: hasResponse ? (wasFlagged ? 'answered_flagged' : 'answered') : wasFlagged ? 'flagged_unanswered' : 'seen_unanswered',
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });
    scheduleSync();
    setSubmitModalOpen(true);
  };

  // Action: Save & Next
  const handleSaveAndNext = () => {
    flushTimeSpent();
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        const hasResponse = q.response?.key || q.response?.value !== undefined;
        const wasFlagged = q.state === 'flagged_unanswered' || q.state === 'answered_flagged';

        let firstActionTimeMs = q.firstActionTimeMs;
        let firstActionType = q.firstActionType;
        if (firstActionTimeMs === null || firstActionTimeMs === undefined) {
          const start = firstVisitStartRef.current[q.id] || activeSinceRef.current;
          firstActionTimeMs = Math.max(0, Math.round(performance.now() - start));
          firstActionType = hasResponse ? 'answered' : 'skipped';
        }

        copy[currentIndex] = {
          ...q,
          firstActionTimeMs,
          firstActionType,
          state: hasResponse ? (wasFlagged ? 'answered_flagged' : 'answered') : wasFlagged ? 'flagged_unanswered' : 'seen_unanswered',
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });

    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      // At last question: if some earlier questions are not visited yet, jump to the first unvisited question
      const firstUnvisitedIdx = questions.findIndex(
        (q, idx) => idx !== currentIndex && q.state === 'not_seen',
      );
      if (firstUnvisitedIdx !== -1) {
        goToQuestion(firstUnvisitedIdx);
      } else {
        scheduleSync();
        setSubmitModalOpen(true);
      }
    }
  };

  // Action: Mark for Review & Next
  const handleMarkForReviewAndNext = () => {
    flushTimeSpent();
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        const hasResponse = q.response?.key || q.response?.value !== undefined;

        let firstActionTimeMs = q.firstActionTimeMs;
        let firstActionType = q.firstActionType;
        if (firstActionTimeMs === null || firstActionTimeMs === undefined) {
          const start = firstVisitStartRef.current[q.id] || activeSinceRef.current;
          firstActionTimeMs = Math.max(0, Math.round(performance.now() - start));
          firstActionType = hasResponse ? 'answered' : 'flagged';
        }

        copy[currentIndex] = {
          ...q,
          firstActionTimeMs,
          firstActionType,
          state: hasResponse ? 'answered_flagged' : 'flagged_unanswered',
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });

    if (currentIndex < questions.length - 1) {
      goToQuestion(currentIndex + 1);
    } else {
      scheduleSync();
    }
  };

  // Action: Clear Response
  const handleClearResponse = () => {
    setQuestions((prev) => {
      const copy = [...prev];
      const q = copy[currentIndex];
      if (q) {
        const nextState: AnswerState =
          q.state === 'answered_flagged' || q.state === 'flagged_unanswered'
            ? 'flagged_unanswered'
            : 'seen_unanswered';

        let answerModifications = q.answerModifications || {
          count: 0,
          modifiedAfter15s: false,
          after15sCount: 0,
          history: [],
        };
        let modifiedAfter15s = q.modifiedAfter15s || false;

        // 4. Record modification when clearing an answer
        if (q.response !== null && (q.response?.key || q.response?.value !== undefined)) {
          const lastAnsTime = lastAnsweredAtRef.current[q.id] || Date.now();
          const elapsedMs = Math.max(0, Date.now() - lastAnsTime);
          const isAfter15s = elapsedMs > 15_000;
          const modItem: AnswerModificationItem = {
            from: q.response,
            to: null,
            elapsedMs,
            isAfter15s,
            timestamp: new Date().toISOString(),
          };
          answerModifications = {
            count: answerModifications.count + 1,
            modifiedAfter15s: answerModifications.modifiedAfter15s || isAfter15s,
            after15sCount: answerModifications.after15sCount + (isAfter15s ? 1 : 0),
            history: [...answerModifications.history, modItem],
          };
          modifiedAfter15s = answerModifications.modifiedAfter15s;
          lastAnsweredAtRef.current[q.id] = Date.now();
        }

        copy[currentIndex] = {
          ...q,
          response: null,
          draftValue: undefined,
          solveOrder: null,
          answerModifications,
          modifiedAfter15s,
          state: nextState,
        };
        dirtyQuestionIdsRef.current.add(q.id);
      }
      return copy;
    });
    scheduleSync();
  };

  // Jump to first question of selected subject tab
  const handleSubjectTab = (subj: 'maths' | 'physics' | 'chemistry' | 'biology') => {
    const idx = questions.findIndex((q) => q.subject === subj);
    if (idx !== -1) {
      goToQuestion(idx);
    }
  };

  /**
   * Flush answers, then close the attempt.
   *
   * Guarded by a ref rather than the `submitting` state: the countdown effect
   * calls this from an interval whose closure cannot observe a state update, so
   * the old `if (submitting) return` never tripped and expiry re-fired the whole
   * submit sequence once per second. The final flush also reads answers from
   * the ref — it used to send the first render's empty array, discarding
   * everything since the last successful heartbeat.
   */
  const closeAttempt = useCallback(
    async (mode: 'auto' | 'manual', options?: { autoSubmitted?: boolean; reason?: string }) => {
      if (submitStartedRef.current) return;
      submitStartedRef.current = true;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      setSubmitting(true);
      flushTimeSpent();

      try {
        const payload: Record<string, unknown> = buildAnswersPayload(true);
        if (options?.autoSubmitted || mode === 'auto') {
          payload.autoSubmitted = true;
          payload.autoSubmitReason = options?.reason || (mode === 'auto' ? 'deadline_expired' : 'popup_timeout_60s');
        }

        const res = await fetch(`/api/attempts/${attemptId}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({}));

        // On expiry we always land on the result page — the server has closed
        // the attempt either way, and stranding the student on a dead exam
        // screen would be worse than a result page that explains itself.
        if (!res.ok && mode === 'manual') {
          throw new Error(data?.message || 'Failed to submit test');
        }

        window.location.replace(`/student/attempts/${attemptId}/result?tab=solutions`);
      } catch (err) {
        if (mode === 'auto') {
          window.location.replace(`/student/attempts/${attemptId}/result?tab=solutions`);
          return;
        }
        setSubmitError(err instanceof Error ? err.message : 'Failed to submit test');
        submitStartedRef.current = false;
        setSubmitting(false);
      }
    },
    [attemptId, buildAnswersPayload, flushTimeSpent, router],
  );

  // 2. Countdown Timer. Depends on closeAttempt (stable) and currentDeadline.
  useEffect(() => {
    const targetTime = new Date(currentDeadline).getTime();
    let interval: ReturnType<typeof setInterval> | null = null;

    const updateTimer = () => {
      const adjustedNow = Date.now() - clockOffsetRef.current;
      const diff = Math.max(0, Math.floor((targetTime - adjustedNow) / 1000));
      setRemainingSeconds(diff);

      if (diff <= 0) {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
        if (extensionCount < 2) {
          setPopupTimer(60);
          setExtensionError(null);
          setTimeExtensionModalOpen(true);
        } else {
          void closeAttempt('auto', { autoSubmitted: true, reason: 'deadline_expired' });
        }
        return false;
      }
      return true;
    };

    const hasTimeRemaining = updateTimer();
    if (hasTimeRemaining) {
      interval = setInterval(updateTimer, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [currentDeadline, closeAttempt, extensionCount]);

  // 3. 60-Second Auto-Submit Timer for the "Need More Time?" Popup
  useEffect(() => {
    if (!timeExtensionModalOpen) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    timer = setInterval(() => {
      setPopupTimer((prev) => {
        if (prev <= 1) {
          if (timer) {
            clearInterval(timer);
            timer = null;
          }
          setTimeExtensionModalOpen(false);
          void closeAttempt('auto', { autoSubmitted: true, reason: 'popup_timeout_60s' });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timer) clearInterval(timer);
    };
  }, [timeExtensionModalOpen, closeAttempt]);

  const handleSubmitClick = () => {
    setSubmitModalOpen(true);
  };

  const handleRequestMoreTime = async () => {
    try {
      setExtendingTime(true);
      setExtensionError(null);
      const res = await fetch(`/api/attempts/${attemptId}/extend-time`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to extend test time.');
      }
      if (data.deadlineAt) {
        setCurrentDeadline(data.deadlineAt);
        const targetTime = new Date(data.deadlineAt).getTime();
        const adjustedNow = Date.now() - clockOffsetRef.current;
        const diff = Math.max(0, Math.floor((targetTime - adjustedNow) / 1000));
        setRemainingSeconds(diff);
      }
      if (typeof data.timeExtensionsCount === 'number') {
        setExtensionCount(data.timeExtensionsCount);
      } else {
        setExtensionCount((prev) => prev + 1);
      }
      setPopupTimer(60);
      setTimeExtensionModalOpen(false);
    } catch (err: any) {
      setExtensionError(err.message || 'Could not extend test time.');
    } finally {
      setExtendingTime(false);
    }
  };

  const handlePopupSubmitNow = () => {
    setTimeExtensionModalOpen(false);
    void closeAttempt('manual');
  };

  // Summary counts
  const paletteStats = useMemo(() => {
    let answered = 0;
    let notAnswered = 0;
    let notVisited = 0;
    let markedForReview = 0;
    let answeredMarked = 0;

    for (const q of questions) {
      if (q.state === 'answered') answered++;
      else if (q.state === 'seen_unanswered') notAnswered++;
      else if (q.state === 'not_seen') notVisited++;
      else if (q.state === 'flagged_unanswered') markedForReview++;
      else if (q.state === 'answered_flagged') answeredMarked++;
    }

    return { answered, notAnswered, notVisited, markedForReview, answeredMarked };
  }, [questions]);

  // Derived completion states for highlighting the palette
  const isAllQuestionsAnswered = useMemo(() => {
    return (
      questions.length > 0 &&
      paletteStats.answered + paletteStats.answeredMarked === questions.length
    );
  }, [questions.length, paletteStats.answered, paletteStats.answeredMarked]);

  const isAllQuestionsCompleted = useMemo(() => {
    return (
      questions.length > 0 &&
      (isAllQuestionsAnswered || allQuestionsVisited || paletteStats.notVisited === 0)
    );
  }, [questions.length, isAllQuestionsAnswered, allQuestionsVisited, paletteStats.notVisited]);

  // Derived from the questions actually present, so a single-subject paper
  // doesn't report totals for subjects it doesn't contain.
  const subjectCounts = useMemo(() => {
    const stats: Record<string, { total: number; answered: number }> = {};
    for (const q of questions) {
      const entry = (stats[q.subject] ??= { total: 0, answered: 0 });
      entry.total++;
      if (q.state === 'answered' || q.state === 'answered_flagged') entry.answered++;
    }
    return stats;
  }, [questions]);

  // Format Timer HH:MM:SS
  const timerText = useMemo(() => {
    const h = Math.floor(remainingSeconds / 3600);
    const m = Math.floor((remainingSeconds % 3600) / 60);
    const s = remainingSeconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, [remainingSeconds]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-slate-500">
        <Spinner className="size-8 text-brand-700" />
        <p className="text-sm font-medium">Preparing test environment...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-6 text-center">
        <Alert tone="red" title="Failed to load test">
          {error}
        </Alert>
        <Button variant="primary" className="mt-4" onClick={() => router.push('/student')}>
          Return to My Tests
        </Button>
      </div>
    );
  }

  return (
    // FBR-08: the runner used to be nested inside AppShell, which sizes to
    // 100dvh minus only its own header — not the mobile nav strip, the
    // outer <main> padding, or the footer it also sat inside. On a phone
    // that made the document ~85px taller than the viewport (a page scroll
    // stacked on top of the runner's own overflow-y-auto pane), and left
    // "My tests"/Analytics/Logout permanently visible one tap away from a
    // live, timed exam. The runner now renders bare (see StudentChrome.tsx)
    // and owns the whole viewport itself.
    <div
      className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100 font-sans text-slate-900 dark:bg-[#090d16] dark:text-slate-100"
      style={{ overscrollBehavior: 'none' }}
    >
      {/* 1. CBT Header Bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex shrink-0 items-center">
            <Image
              src="/brand/SRSMALogo.jpeg"
              alt="SRSMA Logo"
              width={38}
              height={38}
              priority
              className="h-9 w-auto rounded object-contain shadow-xs ring-1 ring-slate-200 dark:ring-slate-700"
            />
          </div>
          <div>
            <h1 className="line-clamp-1 text-sm font-bold text-slate-900 dark:text-slate-100">{testTitle}</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Candidate: <span className="font-semibold text-slate-700 dark:text-slate-200">{studentName}</span>
            </p>
          </div>
        </div>

        {/* Center: Live Countdown Timer */}
        <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 shadow-inner dark:border-slate-800 dark:bg-slate-800/80">
          <Clock className={`size-4 ${remainingSeconds < 300 ? 'animate-pulse text-red-600' : 'text-brand-700 dark:text-brand-400'}`} />
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Time Left:</span>
          <span
            role="timer"
            aria-live="off"
            className={`tnum font-mono text-base font-bold ${
              remainingSeconds < 300 ? 'text-red-600 font-extrabold' : 'text-slate-900 dark:text-slate-100'
            }`}
          >
            {timerText}
          </span>
        </div>

        {/* Right Actions: Sync, Fullscreen & Submit */}
        <div className="flex items-center gap-2">
          {/* Save-state indicator. syncError used to be recorded and never
              rendered anywhere, so a student whose answers had stopped reaching
              the server had no way to know. */}
          <span className="hidden items-center gap-1 text-xs sm:inline-flex" aria-live="polite">
            {!isOnline ? (
              <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                <WifiOff className="size-3 text-amber-600" />
                Offline — saved on this device
              </span>
            ) : syncError ? (
              <span
                title={syncError}
                className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950/80 dark:text-amber-300"
              >
                <AlertTriangle className="size-3 text-amber-600" />
                Not synced
              </span>
            ) : isSyncing ? (
              <span className="inline-flex items-center gap-1 text-slate-400">
                <Spinner className="size-3" />
                Saving…
              </span>
            ) : lastSavedAt ? (
              <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                <Check className="size-3" />
                Saved
              </span>
            ) : null}
          </span>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="hidden rounded p-1.5 text-slate-500 hover:bg-slate-100 sm:inline-block dark:text-slate-400 dark:hover:bg-slate-800"
            title="Toggle fullscreen"
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmitClick}
            className={`font-bold transition-all ${
              allQuestionsVisited
                ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-400 ring-offset-1 shadow-md animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            Submit Test
          </Button>
        </div>
      </header>

      {/* 2. Main CBT Workplace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Side: Question View & Actions */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Subject Tabs */}
          <div className="flex items-center gap-1 border-b border-slate-200 bg-white px-4 pt-2 dark:border-slate-800 dark:bg-slate-900">
            {subjects.map((s) => {
              const isActive = currentSubject === s;
              const count = subjectCounts[s];
              return (
                <button
                  key={s}
                  onClick={() => handleSubjectTab(s)}
                  className={`flex items-center gap-1.5 border-b-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors ${
                    isActive
                      ? 'border-brand-700 text-brand-700 bg-brand-50/50 dark:border-brand-400 dark:text-brand-300 dark:bg-brand-950/50'
                      : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{s}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                      isActive ? 'bg-brand-700 text-white dark:bg-brand-600' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {count?.answered ?? 0}/{count?.total ?? 0}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Question Card Content (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 dark:bg-[#090d16]">
            {currentQ ? (
              <div className="mx-auto max-w-4xl space-y-6">
                {/* Question Info Sub-Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-100 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950 dark:text-brand-300">
                      Question {currentQ.position}
                    </span>
                    <span className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">
                      [{currentQ.subject}] · {currentQ.type.toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="text-emerald-600 font-semibold">+{currentQ.marks.correct}.00</span>
                    <span className="text-slate-300 dark:text-slate-600">/</span>
                    <span className="text-red-600">{currentQ.marks.wrong}.00</span>
                  </div>
                </div>

                {/* Question Body with KaTeX & Image resolver */}
                <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-900 shadow-sm sm:text-base dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  <QuestionBody
                    body={currentQ.body}
                    renderImage={(placeholderId) => (
                      <div className="my-3 overflow-hidden rounded-md border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-950">
                        <img
                          src={getImageSrc(currentQ.id, placeholderId)}
                          alt="Question figure"
                          className="max-h-80 w-auto object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Answer Options Area */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {currentQ.type === 'mcq' ? 'Select One Option:' : 'Enter Numerical Answer:'}
                  </h3>

                  {currentQ.type === 'mcq' ? (
                    <div className="grid gap-2.5">
                      {currentQ.options.map((opt) => {
                        const isSelected = currentQ.response?.key === opt.key;
                        return (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => handleSelectOption(opt.key)}
                            className={`flex w-full items-start gap-3 rounded-lg border p-3.5 text-left text-sm transition-all ${
                              isSelected
                                ? 'border-brand-600 bg-brand-50/70 shadow-sm ring-2 ring-brand-500 dark:border-brand-500 dark:bg-brand-950/70'
                                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800'
                            }`}
                          >
                            <span
                              className={`flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${
                                isSelected
                                  ? 'border-brand-700 bg-brand-700 text-white dark:bg-brand-600'
                                  : 'border-slate-300 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                              }`}
                            >
                              {opt.key}
                            </span>
                            <div className="flex-1 text-slate-900 dark:text-slate-100">
                              <QuestionBody
                                body={opt.body}
                                renderImage={(imgId) => (
                                  <img
                                    src={getImageSrc(currentQ.id, imgId)}
                                    alt="Option figure"
                                    className="my-1 max-h-40 object-contain"
                                  />
                                )}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    /* Numerical Input */
                    <div className="max-w-xs space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                      <input
                        type="text"
                        inputMode="decimal"
                        autoComplete="off"
                        aria-label="Numerical answer"
                        value={
                          currentQ.draftValue ??
                          (currentQ.response?.value !== undefined ? String(currentQ.response.value) : '')
                        }
                        onChange={(e) => handleSetIntegerValue(e.target.value)}
                        placeholder="Enter numerical answer..."
                        className="tnum h-10 w-full rounded-md border border-slate-300 px-3 text-center text-lg font-bold text-slate-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Numbers only — use a decimal point, not a comma (e.g. 42 or 3.14).
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          {/* 3. Bottom Action Navigation Bar */}
          {/* Desktop Single-Row Navigation Bar */}
          <div className="hidden sm:flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 bg-white px-6 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearResponse}
                disabled={!currentQ?.response && !currentQ?.draftValue}
              >
                Clear Response
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkForReviewAndNext}
                className="border-purple-300 text-purple-800 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50"
              >
                <Flag className="mr-1 size-3.5 text-purple-700 dark:text-purple-400" />
                Mark for Review & Next
              </Button>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1 size-4" />
                Previous
              </Button>

              {allQuestionsVisited ? (
                <>
                  {currentIndex < questions.length - 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveAndNext}
                    >
                      Next
                      <ChevronRight className="ml-1 size-4" />
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAndSubmit}
                    className="bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white shadow-lg ring-2 ring-emerald-400 ring-offset-2 animate-pulse dark:ring-offset-slate-900"
                  >
                    <Check className="mr-1.5 size-4" />
                    Submit Test
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAndNext}
                  className="bg-brand-700 hover:bg-brand-800 font-semibold"
                >
                  Save & Next
                  <ChevronRight className="ml-1 size-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Mobile 2-Line Action Bar (all buttons visible without horizontal scroll) */}
          <div className="flex sm:hidden shrink-0 flex-col gap-2 border-t border-slate-200 bg-white p-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Line 1: Question response actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleClearResponse}
                disabled={!currentQ?.response && !currentQ?.draftValue}
                className="h-9 flex-1 justify-center text-xs"
              >
                Clear Response
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={handleMarkForReviewAndNext}
                className="h-9 flex-[1.3] justify-center border-purple-300 text-purple-800 hover:bg-purple-50 text-xs dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50"
              >
                <Flag className="mr-1 size-3.5 text-purple-700 dark:text-purple-400 shrink-0" />
                Mark for Review & Next
              </Button>
            </div>

            {/* Line 2: Navigation & Palette */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setMobilePaletteOpen(true)}
                className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition-all ${
                  isAllQuestionsCompleted
                    ? 'border-2 border-emerald-500 bg-emerald-50 text-emerald-800 shadow-xs ring-2 ring-emerald-400/50 hover:bg-emerald-100 dark:border-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-300'
                    : 'border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 active:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                }`}
              >
                {isAllQuestionsCompleted ? (
                  <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                ) : (
                  <Layers className="size-3.5" />
                )}
                Palette ({paletteStats.answered + paletteStats.answeredMarked}/{questions.length})
              </button>

              <Button
                variant="secondary"
                size="sm"
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0}
                className="h-9 px-2.5 text-xs shrink-0"
              >
                <ChevronLeft className="mr-0.5 size-4" />
                Prev
              </Button>

              {allQuestionsVisited ? (
                <>
                  {currentIndex < questions.length - 1 && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSaveAndNext}
                      className="h-9 flex-1 justify-center text-xs"
                    >
                      Next
                      <ChevronRight className="ml-0.5 size-4" />
                    </Button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSaveAndSubmit}
                    className="h-9 flex-1 justify-center bg-emerald-600 hover:bg-emerald-700 font-extrabold text-white text-xs shadow-md ring-2 ring-emerald-400 ring-offset-1 animate-pulse dark:ring-offset-slate-900"
                  >
                    <Check className="mr-1 size-3.5 shrink-0" />
                    Submit
                  </Button>
                </>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveAndNext}
                  className="h-9 flex-1 justify-center bg-brand-700 hover:bg-brand-800 font-bold text-xs"
                >
                  Save & Next
                  <ChevronRight className="ml-1 size-4 shrink-0" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Desktop 75-Cell Question Palette */}
        <aside
          className={`hidden w-80 shrink-0 flex-col border-l bg-white transition-all sm:flex dark:bg-slate-900 ${
            isAllQuestionsCompleted
              ? 'border-l-2 border-l-emerald-500 shadow-md ring-1 ring-emerald-400/30 dark:border-l-emerald-400 dark:ring-emerald-500/20'
              : 'border-slate-200 dark:border-slate-800'
          }`}
        >
          {/* Palette Legend */}
          <div className="border-b border-slate-200 p-3.5 dark:border-slate-800">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Question Palette</h2>
              {isAllQuestionsCompleted && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  All Completed
                </span>
              )}
            </div>

            {/* Completed Highlight Banner */}
            {isAllQuestionsCompleted && (
              <div className="mt-2.5 flex items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50/90 px-2.5 py-2 text-xs font-medium text-emerald-900 shadow-xs dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="leading-tight">
                  <span className="font-bold text-emerald-800 dark:text-emerald-200">
                    {isAllQuestionsAnswered ? 'All Questions Answered!' : 'All Questions Reviewed!'}
                  </span>
                  <p className="mt-0.5 text-[10px] text-emerald-700 dark:text-emerald-400">
                    {isAllQuestionsAnswered
                      ? `${paletteStats.answered + paletteStats.answeredMarked}/${questions.length} questions attempted. You can review or submit.`
                      : `${paletteStats.answered + paletteStats.answeredMarked}/${questions.length} attempted, none unvisited. Ready to submit.`}
                  </p>
                </div>
              </div>
            )}
            <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-emerald-600 text-[10px] font-bold text-white">
                  {paletteStats.answered}
                </span>
                <span>Answered</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-red-600 text-[10px] font-bold text-white">
                  {paletteStats.notAnswered}
                </span>
                <span>Not Answered</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-purple-700 text-[10px] font-bold text-white">
                  {paletteStats.markedForReview}
                </span>
                <span>Marked for Review</span>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="relative flex size-5 shrink-0 items-center justify-center rounded bg-purple-700 text-[10px] font-bold text-white">
                  {paletteStats.answeredMarked}
                  <span className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full border border-white bg-emerald-500" />
                </span>
                <span>Ans & Marked</span>
              </div>

              <div className="col-span-2 flex items-center gap-1.5">
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {paletteStats.notVisited}
                </span>
                <span>Not Visited</span>
              </div>
            </div>
          </div>

          {/* Grid of question buttons, grouped by subject. The heading used to
              read "{SUBJECT} Questions" above a grid that rendered every
              question in the paper regardless of subject. */}
          <div className="flex-1 overflow-y-auto p-3.5">
            {subjects.map((subj) => {
              const inSubject = questions
                .map((q, idx) => ({ q, idx }))
                .filter(({ q }) => q.subject === subj);
              if (inSubject.length === 0) return null;

              return (
                <div key={subj} className="mb-4 last:mb-0">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    {subj} · {inSubject.length}
                  </h3>

                  <div className="mt-2.5 grid grid-cols-5 gap-2">
                    {inSubject.map(({ q, idx }) => (
                      <PaletteButton
                        key={q.id}
                        question={q}
                        isCurrent={idx === currentIndex}
                        onClick={() => goToQuestion(idx)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* 4. Mobile Bottom Sheet Palette Drawer */}
      {mobilePaletteOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:hidden">
          <div className="max-h-[80vh] rounded-t-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 dark:text-slate-100">Question Palette</h3>
                {isAllQuestionsCompleted && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300">
                    <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                    Completed
                  </span>
                )}
              </div>
              <button onClick={() => setMobilePaletteOpen(false)} className="rounded p-1 text-slate-500 dark:text-slate-400">
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-3 grid max-h-60 grid-cols-6 gap-2 overflow-y-auto p-1">
              {questions.map((q, idx) => (
                <PaletteButton
                  key={q.id}
                  question={q}
                  isCurrent={idx === currentIndex}
                  onClick={() => {
                    goToQuestion(idx);
                    setMobilePaletteOpen(false);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. Need More Time? Time Extension & Submit Popup */}
      {timeExtensionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-md shadow-2xl border-amber-300/60 dark:border-amber-500/30">
            <CardBody className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    <Clock className="size-5" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    Do you want more time?
                  </h2>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 animate-pulse">
                  <Clock className="size-3.5" />
                  Auto-submitting in {popupTimer}s
                </span>
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <p className="font-semibold">
                  You can get 10 more minutes to complete or review your answers.
                </p>
                <p className="mt-1 text-slate-600 dark:text-slate-400">
                  Extension {extensionCount + 1} of 2 available. If no option is selected within 60 seconds, your test will auto-submit.
                </p>
              </div>

              {/* Quick progress pill stats */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-950/40">
                  <span className="block text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">Answered</span>
                  <span className="text-base font-extrabold text-emerald-800 dark:text-emerald-200">
                    {paletteStats.answered + paletteStats.answeredMarked}
                  </span>
                </div>
                <div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/40">
                  <span className="block text-[11px] font-semibold text-red-700 dark:text-red-300">Unanswered</span>
                  <span className="text-base font-extrabold text-red-800 dark:text-red-200">
                    {paletteStats.notAnswered + paletteStats.notVisited}
                  </span>
                </div>
                <div className="rounded-lg bg-purple-50 p-2 dark:bg-purple-950/40">
                  <span className="block text-[11px] font-semibold text-purple-700 dark:text-purple-300">Marked</span>
                  <span className="text-base font-extrabold text-purple-800 dark:text-purple-200">
                    {paletteStats.markedForReview + paletteStats.answeredMarked}
                  </span>
                </div>
              </div>

              {extensionError && (
                <Alert tone="red" className="text-xs">
                  {extensionError}
                </Alert>
              )}

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="primary"
                  size="md"
                  onClick={handleRequestMoreTime}
                  disabled={extendingTime || submitting}
                  className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold border-0 shadow-md"
                >
                  {extendingTime ? <Spinner className="size-4" /> : 'Yes, Need 10 more mins'}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="md"
                  onClick={handlePopupSubmitNow}
                  disabled={extendingTime || submitting}
                  className="flex-1 border-slate-300 font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200"
                >
                  {submitting ? <Spinner className="size-4" /> : 'Submit Now'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 6. Final Submit Confirmation Modal (Shown once both 10-min extensions are exhausted) */}
      {submitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg shadow-2xl">
            <CardBody className="space-y-4 p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Confirm Test Submission</h2>
                <button onClick={() => setSubmitModalOpen(false)} className="rounded p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
                  <X className="size-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400">
                {extensionCount >= 2 && (
                  <span className="mb-1 block font-semibold text-amber-600 dark:text-amber-400">
                    You have used all 2 time extensions (10 minutes each).
                  </span>
                )}
                Are you sure you want to submit? Review your attempt summary below before final submission:
              </p>

              {submitError ? (
                <Alert tone="red" title="Could not submit">
                  <p>{submitError}</p>
                  <p className="mt-1">
                    Your answers are still saved. Check your connection and press{' '}
                    <strong>Yes, Submit Test</strong> again.
                  </p>
                </Alert>
              ) : null}

              {/* Summary Table */}
              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full text-center text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                    <tr>
                      <th className="py-2 px-2 text-left">Subject</th>
                      <th className="py-2 px-2">Total</th>
                      <th className="py-2 px-2 text-emerald-700 dark:text-emerald-400">Answered</th>
                      <th className="py-2 px-2 text-red-600 dark:text-red-400">Not Ans</th>
                      <th className="py-2 px-2 text-purple-700 dark:text-purple-400">Marked</th>
                      <th className="py-2 px-2 text-slate-400">Not Visited</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {subjects.map((s) => {
                      const sQs = questions.filter((q) => q.subject === s);
                      const ans = sQs.filter((q) => q.state === 'answered' || q.state === 'answered_flagged').length;
                      const notAns = sQs.filter((q) => q.state === 'seen_unanswered').length;
                      const marked = sQs.filter((q) => q.state === 'flagged_unanswered' || q.state === 'answered_flagged').length;
                      const notSeen = sQs.filter((q) => q.state === 'not_seen').length;
                      return (
                        <tr key={s} className="font-medium">
                          <td className="py-2 px-2 text-left capitalize font-bold text-slate-800 dark:text-slate-200">{s}</td>
                          <td className="py-2 px-2">{sQs.length}</td>
                          <td className="py-2 px-2 text-emerald-700 font-bold dark:text-emerald-400">{ans}</td>
                          <td className="py-2 px-2 text-red-600 dark:text-red-400">{notAns}</td>
                          <td className="py-2 px-2 text-purple-700 dark:text-purple-400">{marked}</td>
                          <td className="py-2 px-2 text-slate-400">{notSeen}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 font-bold text-slate-900 border-t border-slate-200 dark:bg-slate-950 dark:text-slate-100 dark:border-slate-800">
                      <td className="py-2 px-2 text-left">Total</td>
                      <td className="py-2 px-2">{questions.length}</td>
                      <td className="py-2 px-2 text-emerald-700 font-bold dark:text-emerald-400">{paletteStats.answered + paletteStats.answeredMarked}</td>
                      <td className="py-2 px-2 text-red-600 dark:text-red-400">{paletteStats.notAnswered}</td>
                      <td className="py-2 px-2 text-purple-700 dark:text-purple-400">{paletteStats.markedForReview + paletteStats.answeredMarked}</td>
                      <td className="py-2 px-2 text-slate-400">{paletteStats.notVisited}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setSubmitModalOpen(false)}
                  disabled={submitting}
                >
                  Return to Exam
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => {
                    setSubmitError(null);
                    void closeAttempt('manual');
                  }}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {submitting ? <Spinner className="size-4" /> : 'Yes, Submit Test'}
                </Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

    </div>
  );
}

