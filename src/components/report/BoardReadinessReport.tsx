'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Zap,
  Target,
  FileText,
  Check,
  TrendingUp,
  Brain,
  Layers,
  ChevronRight,
  BookOpen,
  Sparkles,
  Star,
  Info,
  Compass,
  Calculator,
  Wrench,
  HelpCircle,
  BarChart3,
  GraduationCap,
  ArrowRight,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge, Button, Card, CardBody, CardHeader, CardTitle, Dialog, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import type {
  DiagnosticEvaluationResult,
  PreparationLevel,
  SkillValueCategory,
  PriorityLevel,
  RevisitCategory,
  SubjectDifficultyBreakdowns,
} from '@/lib/diagnostic-evaluator';

export interface StudentProfileDetails {
  board?: string | null;
  school?: string | null;
  city?: string | null;
  classLevel?: string | null;
  gender?: string | null;
  isFormFilled?: boolean;
}

interface BoardReadinessReportProps {
  report: DiagnosticEvaluationResult;
  studentGender?: 'Male' | 'Female' | string | null;
  studentDetails?: StudentProfileDetails | null;
  onRetakeOrBrowse?: () => void;
  isTeacherView?: boolean;
  onGoToSolutions?: () => void;
  attemptId?: string;
}

// ---------------------------------------------------------------------------
// Subject Performance Insight Evaluator (9 Exact Diagnostic Score Cases)
// ---------------------------------------------------------------------------
export function getSubjectPerformanceInsight(
  mathPercentage: number,
  sciencePercentage: number,
): { label: string; message: string } {
  const m = Math.round(mathPercentage);
  const s = Math.round(sciencePercentage);
  const diff = m - s;
  const absDiff = Math.abs(diff);

  // 1. Difference <= 12% (Balanced Cases)
  if (absDiff <= 12) {
    // Case 1: Dual High (Maths High, Science High — Balanced)
    if (m >= 75 && s >= 75) {
      return {
        label: 'Dual High — Balanced',
        message:
          'Awesome work! You are in great shape to score top marks in your board exams. To push for a full 100%, focus on writing down every step clearly with proper units, drawing neat diagrams, and practicing full 3-hour sample papers so you don\'t lose marks to tiny calculation slips.',
      };
    }
    // Case 3: Dual Low (Maths Low, Science Low — Balanced)
    if (m < 45 && s < 45) {
      return {
        label: 'Dual Low — Balanced',
        message:
          'Don\'t lose heart at all—everyone starts somewhere, and board exams are very predictable. Put full mock tests on hold for now; just pick the 3 easiest, high-mark chapters in your textbook (like Statistics in Maths or Life Processes in Science) and master the basic examples first to build steady confidence.',
      };
    }
    // If one is >= 75 and average >= 75 with diff <= 12
    if ((m + s) / 2 >= 75) {
      return {
        label: 'Dual High — Balanced',
        message:
          'Awesome work! You are in great shape to score top marks in your board exams. To push for a full 100%, focus on writing down every step clearly with proper units, drawing neat diagrams, and practicing full 3-hour sample papers so you don\'t lose marks to tiny calculation slips.',
      };
    }
    // Case 2: Dual Mid (Maths Mid, Science Mid — Balanced)
    return {
      label: 'Dual Mid — Balanced',
      message:
        'You have a solid base in both subjects, and you are totally ready to push into the 80s and 90s! Split your study time equally between Maths and Science, and focus on practicing chapter-wise previous years\' board questions (PYQs) so you can get used to how board questions are framed.',
    };
  }

  // 2. Maths Leads by > 12% (diff > 12)
  if (diff > 12) {
    // Case 6: Maths Ahead, Both Low (Maths Better — Foundational Tier)
    if (m < 45 && s < 45) {
      return {
        label: 'Maths Better — Foundational Tier',
        message:
          'You\'re making steady headway in Maths, and we can do the exact same thing for Science! Take it one step at a time: keep practicing your basic Maths formulas daily, and start Science by reading the easiest chapter summaries and learning the short 1-mark and 2-mark textbook questions.',
      };
    }
    // Case 5: Maths High/Mid, Science Low (Maths Much Better — Wide Gap)
    if (m >= 45 && s < 45) {
      return {
        label: 'Maths Much Better — Wide Gap',
        message:
          'Your strong Maths score shows you have great focus and logic—that is a huge advantage! Don\'t stress about Science; it is very scoring once you know the direct textbook questions. Spend 20 minutes a day keeping your Maths sharp, and use the rest of your study time to rebuild Science chapter by chapter.',
      };
    }
    // Case 4: Maths High, Science Mid (Maths Much Better)
    return {
      label: 'Maths Much Better',
      message:
        'Your Maths is looking super strong! Since your problem-solving is already sharp, you can easily pull your Science score up too. Dedicate more of your study time to Science by practicing textbook definitions, balancing chemical equations, and drawing neat, labeled diagrams.',
    };
  }

  // 3. Science Leads by > 12% (s - m > 12)
  // Case 9: Science Ahead, Both Low (Science Better — Foundational Tier)
  if (s < 45 && m < 45) {
    return {
      label: 'Science Better — Foundational Tier',
      message:
        'Your Science gives you a solid starting point, and you can definitely bring your Maths score up alongside it! Focus your energy on direct, high-scoring Maths chapters first—work through simple textbook questions step-by-step, and your marks and confidence will climb quickly.',
    };
  }
  // Case 8: Science High/Mid, Maths Low (Science Much Better — Wide Gap)
  if (s >= 45 && m < 45) {
    return {
      label: 'Science Much Better — Wide Gap',
      message:
        'Scoring well in Science proves you have what it takes to understand big, detailed ideas! Maths only feels tricky when formulas and basic steps are missing. Make a one-page formula sheet for easy chapters like Real Numbers and Statistics, and solve 4 to 5 textbook examples by hand every day—you will see fast results.',
    };
  }
  // Case 7: Science High, Maths Mid (Science Much Better)
  return {
    label: 'Science Much Better',
    message:
      'You clearly understand your Science concepts really well—great job! For Maths, remember that board examiners give generous step marks even if your final calculation goes off. Spend more of your study time writing out Maths textbook problems by hand so you build speed and avoid small slips.',
  };
}

// ---------------------------------------------------------------------------
// 1. Mobile Battery Style Bar Component
// ---------------------------------------------------------------------------
function MobileBatteryBar({
  percentage,
  variant,
  label,
}: {
  percentage: number;
  variant: 'easy' | 'medium' | 'hard';
  label: string;
}) {
  const config = {
    easy: {
      dot: 'bg-emerald-500',
      fill: 'from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400',
      badge: 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    },
    medium: {
      dot: 'bg-amber-500',
      fill: 'from-amber-400 to-amber-500 dark:from-amber-400 dark:to-orange-500',
      badge: 'text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/20',
    },
    hard: {
      dot: 'bg-indigo-600 dark:bg-indigo-400',
      fill: 'from-indigo-500 to-purple-600 dark:from-indigo-400 dark:to-purple-500',
      badge: 'text-indigo-700 dark:text-indigo-300 bg-indigo-500/10 border-indigo-500/20',
    },
  }[variant];

  const clampedPct = Math.min(100, Math.max(0, percentage));

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
          <span className={`inline-block size-2 rounded-full ${config.dot}`} />
          <span>{label}</span>
        </span>
        <span className={`rounded-md border px-1.5 py-0.5 font-black text-xs tnum ${config.badge}`}>
          {clampedPct}%
        </span>
      </div>

      {/* Sleek Modern Battery Capsule */}
      <div className="flex items-center">
        <div className="relative flex-1 h-3.5 sm:h-4 rounded-full border border-slate-300/80 bg-slate-100 p-0.5 shadow-inner dark:border-slate-700 dark:bg-slate-800/80 overflow-hidden">
          {/* Fill level */}
          <div
            className={`h-full rounded-full bg-gradient-to-r ${config.fill} transition-all duration-500`}
            style={{ width: `${clampedPct}%` }}
          />
        </div>

        {/* Battery Terminal Nub */}
        <div className="h-2 w-1 rounded-r-xs bg-slate-300 dark:bg-slate-600 shrink-0 ml-0.5" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Amazon E-commerce Style Star Rating Component
// ---------------------------------------------------------------------------
function EcommerceStarRating({
  rating,
  align = 'end',
}: {
  rating: number;
  align?: 'start' | 'end' | 'center' | 'responsive';
}) {
  const alignClass =
    align === 'responsive'
      ? 'justify-start sm:justify-end'
      : align === 'start'
        ? 'justify-start'
        : align === 'center'
          ? 'justify-center'
          : 'justify-end';

  return (
    <div className={`inline-flex flex-nowrap items-center ${alignClass} gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap`}>
      <div className="flex flex-nowrap items-center gap-0.5 shrink-0">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const lower = starIndex - 1;
          const diff = rating - lower;

          if (diff >= 0.75) {
            // >= x.75 -> Full star
            return (
              <Star
                key={starIndex}
                className="size-3 sm:size-3.5 md:size-4 fill-amber-400 text-amber-500 shrink-0"
              />
            );
          } else if (diff >= 0.25) {
            // x.25 to x.74 -> Half star
            return (
              <div key={starIndex} className="relative size-3 sm:size-3.5 md:size-4 shrink-0">
                <Star className="absolute inset-0 size-3 sm:size-3.5 md:size-4 fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-600" />
                <div className="absolute inset-0 w-[50%] overflow-hidden">
                  <Star className="size-3 sm:size-3.5 md:size-4 fill-amber-400 text-amber-500" />
                </div>
              </div>
            );
          } else {
            // < x.25 -> Empty star
            return (
              <Star
                key={starIndex}
                className="size-3 sm:size-3.5 md:size-4 fill-slate-100 text-slate-300 dark:fill-slate-800 dark:text-slate-600 shrink-0"
              />
            );
          }
        })}
      </div>
      <span className="inline-block shrink-0 whitespace-nowrap select-none rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[11px] sm:text-xs font-black text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 tnum leading-none">
        {rating.toFixed(1)}/5
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Difficulty-Wise Performance Insight Helper
// ---------------------------------------------------------------------------
function getDifficultyInsight(breakdowns?: SubjectDifficultyBreakdowns): string {
  if (!breakdowns) {
    return 'Your difficulty-wise results reflect steady engagement across foundational, intermediate, and advanced board challenge questions.';
  }

  const m = breakdowns.mathematics;
  const s = breakdowns.science;

  const totalEasy = (m.easy.total || 0) + (s.easy.total || 0);
  const easyScore = (m.easy.score || 0) + (s.easy.score || 0);
  const easyPct = totalEasy > 0 ? Math.round((easyScore / totalEasy) * 100) : 0;

  const totalMed = (m.medium.total || 0) + (s.medium.total || 0);
  const medScore = (m.medium.score || 0) + (s.medium.score || 0);
  const medPct = totalMed > 0 ? Math.round((medScore / totalMed) * 100) : 0;

  const totalHard = (m.hard.total || 0) + (s.hard.total || 0);
  const hardScore = (m.hard.score || 0) + (s.hard.score || 0);
  const hardPct = totalHard > 0 ? Math.round((hardScore / totalHard) * 100) : 0;

  if (easyPct >= 75 && medPct >= 65 && hardPct >= 60) {
    return 'Exceptional consistency across all difficulty tiers. You tackle challenging, higher-order questions with equal confidence as basic concepts. Sustaining this rigor through full-length timed mock tests will solidify top-bracket Board results.';
  }

  if (hardPct > medPct && hardPct >= 50 && (easyPct < 70 || medPct < 60)) {
    return 'Interesting pattern: You demonstrated strong problem-solving on complex (Hard) questions, but dropped marks on some foundational or intermediate questions. This usually indicates rushing through simpler problems or careless calculation errors. Slowing down slightly on routine steps will immediately raise your overall score.';
  }

  if (easyPct >= 70 && medPct >= 50 && hardPct < 50) {
    return 'You have established a solid conceptual foundation with dependable accuracy on Easy and Medium questions. Your primary growth frontier lies in Hard questions—focus your preparation on multi-step non-routine problems and combined formula applications to unlock top percentile marks.';
  }

  if (m.easy.percentage >= 70 && s.easy.percentage < 60) {
    return 'Your Mathematics difficulty pacing is well grounded, whereas Science shows drops on foundational questions. Dedicate time to reviewing NCERT definitions, laws, and diagram-based concepts in Science to match your Mathematics momentum.';
  }
  if (s.easy.percentage >= 70 && m.easy.percentage < 60) {
    return 'Science foundational and application questions are well mastered, but Mathematics shows friction in procedural calculations. Targeted practice on standard NCERT textbook exercises will quickly bolster your Mathematics foundation.';
  }

  if (easyPct < 60) {
    return 'Attention is recommended on foundational (Easy) questions across both subjects. Prioritizing standard textbook definitions, core formulas, and direct question types before moving to complex application sets will build greater test confidence.';
  }

  return 'Your performance demonstrates steady progress across Easy and Medium tiers with room to expand in complex multi-concept questions. Prioritize revision of difficult chapter questions to maximize your board exam preparation.';
}

// ---------------------------------------------------------------------------
// 4. Executive BRI Speedometer / Gauge Component
// ---------------------------------------------------------------------------
function BriSpeedometerGauge({
  score,
  prepStyle,
}: {
  score: number;
  prepStyle: { bg: string; label: string; tone: string };
}) {
  const clamped = Math.min(100, Math.max(0, score));
  const arcLength = 249.6;
  const strokeOffset = arcLength - (arcLength * clamped) / 100;

  // Angle from 160 deg to 380 deg
  const angleRad = ((160 + (clamped / 100) * 220) * Math.PI) / 180;
  const beadX = 90 + 65 * Math.cos(angleRad);
  const beadY = 85 + 65 * Math.sin(angleRad);

  const isHigh = clamped >= 70;
  const isMed = clamped >= 50 && clamped < 70;
  const isBasic = clamped >= 20 && clamped < 50;
  const isFoundational = clamped < 20;

  return (
    <div className="flex flex-col items-center justify-between rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 via-white to-slate-50/50 p-4 sm:p-5 shadow-xs dark:border-slate-800 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950/80">
      <div className="w-full flex items-center justify-between">
        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Award className="size-3.5 text-brand-600 dark:text-brand-400" />
          Board Readiness Index (BRI)
        </span>
        <span className="rounded-md bg-brand-50 border border-brand-200/60 px-2 py-0.5 text-[10px] font-bold text-brand-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300">
          Scale 0–100
        </span>
      </div>

      {/* Speedometer Arc SVG */}
      <div className="relative my-2.5 sm:my-3 flex items-center justify-center">
        <svg viewBox="0 0 180 128" className="w-48 sm:w-56 h-auto drop-shadow-xs">
          <defs>
            <linearGradient id="briGradHigh" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="100%" stopColor="#0d9488" />
            </linearGradient>
            <linearGradient id="briGradMed" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#6366f1" />
            </linearGradient>
            <linearGradient id="briGradBasic" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
            <linearGradient id="briGradFoundational" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#6366f1" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>

          {/* Background Arc Track */}
          <path
            d="M 28.9 107.2 A 65 65 0 1 1 151.1 107.2"
            fill="none"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            className="text-slate-200/90 dark:text-slate-800"
          />

          {/* Active Fill Arc */}
          <path
            d="M 28.9 107.2 A 65 65 0 1 1 151.1 107.2"
            fill="none"
            stroke={
              isHigh
                ? 'url(#briGradHigh)'
                : isMed
                  ? 'url(#briGradMed)'
                  : isBasic
                    ? 'url(#briGradBasic)'
                    : 'url(#briGradFoundational)'
            }
            strokeWidth="11"
            strokeLinecap="round"
            strokeDasharray={arcLength}
            strokeDashoffset={strokeOffset}
            className="transition-all duration-700 ease-out"
          />

          {/* Glowing Indicator Bead */}
          <circle
            cx={beadX}
            cy={beadY}
            r="8"
            className="fill-white drop-shadow-md dark:fill-slate-900"
          />
          <circle
            cx={beadX}
            cy={beadY}
            r="4.5"
            className={
              isHigh
                ? 'fill-emerald-500'
                : isMed
                  ? 'fill-blue-500'
                  : isBasic
                    ? 'fill-amber-500'
                    : 'fill-indigo-500'
            }
          />
        </svg>

        {/* Central Metric Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 pointer-events-none text-center">
          <span className="tnum text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {clamped}
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-0.5">
            / 100 Score
          </span>
        </div>
      </div>

      {/* 4-Tier Mini Scale Bar */}
      <div className="w-full grid grid-cols-4 gap-1 px-1 text-center text-[9px] sm:text-[10px] font-bold">
        <div
          className={`rounded-lg py-1 border transition-all ${isFoundational
              ? 'bg-indigo-500/15 text-indigo-800 border-indigo-400 font-black shadow-2xs dark:text-indigo-300'
              : 'text-slate-500 border-slate-200/80 bg-white/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/80'
            }`}
        >
          &lt;20 Foundational
        </div>
        <div
          className={`rounded-lg py-1 border transition-all ${isBasic
              ? 'bg-amber-500/15 text-amber-800 border-amber-400 font-black shadow-2xs dark:text-amber-300'
              : 'text-slate-500 border-slate-200/80 bg-white/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/80'
            }`}
        >
          20–49 Basic
        </div>
        <div
          className={`rounded-lg py-1 border transition-all ${isMed
              ? 'bg-blue-500/15 text-blue-800 border-blue-400 font-black shadow-2xs dark:text-blue-300'
              : 'text-slate-500 border-slate-200/80 bg-white/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/80'
            }`}
        >
          50–69 Strong
        </div>
        <div
          className={`rounded-lg py-1 border transition-all ${isHigh
              ? 'bg-emerald-500/15 text-emerald-800 border-emerald-400 font-black shadow-2xs dark:text-emerald-300'
              : 'text-slate-500 border-slate-200/80 bg-white/50 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-800/80'
            }`}
        >
          70+ High
        </div>
      </div>

      {/* Level of Preparation Status Banner */}
      <div className="mt-3.5 w-full text-center">
        <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-slate-700 dark:text-slate-300 block mb-1.5">
          Level of Preparation
        </span>
        <div className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3.5 py-1.5 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-extrabold tracking-wide shadow-2xs transition-all ${
          isHigh
            ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-200'
            : isMed
            ? 'border-blue-500/40 bg-blue-500/15 text-blue-800 dark:text-blue-200'
            : isBasic
            ? 'border-amber-500/40 bg-amber-500/15 text-amber-800 dark:text-amber-200'
            : 'border-indigo-500/40 bg-indigo-500/15 text-indigo-800 dark:text-indigo-200'
        }`}>
          <span className="text-sm">{isHigh ? '🏆' : isMed ? '🎯' : isBasic ? '⚡' : '🌱'}</span>
          <span>{prepStyle.label}</span>
        </div>
      </div>
    </div>
  );
}

export function getTimeManagementBadge(rating: 'Optimal' | 'Good' | 'Moderate' | 'Needs Intervention' | 'Medium' | 'Poor' | string) {
  switch (rating) {
    case 'Optimal':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          Optimal
        </span>
      );
    case 'Good':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-teal-500/30 bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-700 dark:bg-teal-950/40 dark:text-teal-300">
          <span className="size-1.5 rounded-full bg-teal-500" />
          Good
        </span>
      );
    case 'Moderate':
    case 'Medium':
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="size-1.5 rounded-full bg-amber-500" />
          {rating === 'Medium' ? 'Medium' : 'Moderate'}
        </span>
      );
    case 'Needs Intervention':
    case 'Poor':
    default:
      return (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
          <span className="size-1.5 rounded-full bg-rose-500" />
          {rating === 'Poor' ? 'Poor' : 'Needs Intervention'}
        </span>
      );
  }
}

function TimeManagementReportSection({
  timeManagement,
  isStrength,
}: {
  timeManagement: DiagnosticEvaluationResult['timeManagement'];
  isStrength: boolean;
}) {
  const starRating = Math.round(((timeManagement.finalScorePercent ?? 0) / 100) * 5 * 10) / 10;
  const hasGuesswork = (timeManagement.guessworkQuestions?.length ?? 0) > 0;
  const counts = timeManagement.categoryCounts || {
    EFFICIENT_MASTERY: 0,
    OVER_INVESTED_SUCCESS: 0,
    CARELESS_RUSHING: 0,
    DISCIPLINED_ATTEMPT: 0,
    TIME_TRAP: 0,
    UNATTEMPTED: 0,
  };

  const blueBadgeStyle = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50';
  const blueDotStyle = 'bg-blue-500';

  const emCount = counts.EFFICIENT_MASTERY || 0;
  const oiCount = counts.OVER_INVESTED_SUCCESS || 0;
  const daCount = counts.DISCIPLINED_ATTEMPT || 0;
  const crCount = counts.CARELESS_RUSHING || 0;
  const ttCount = counts.TIME_TRAP || 0;
  const unCount = counts.UNATTEMPTED || 0;

  const BEHAVIORAL_ROWS = [
    {
      key: 'EFFICIENT_MASTERY',
      term: 'Efficient Mastery',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Solved ${emCount} ${emCount === 1 ? 'Question' : 'Questions'} correctly well within expected time. Shows thorough concept clarity and confident, swift calculations.`,
      count: emCount,
    },
    {
      key: 'OVER_INVESTED_SUCCESS',
      term: 'Over-Invested Attempt',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Solved ${oiCount} ${oiCount === 1 ? 'Question' : 'Questions'} correctly, but took more time than needed. Practicing standard questions will build speed so you do not run short of time on longer 4-mark and 5-mark questions.`,
      count: oiCount,
    },
    {
      key: 'DISCIPLINED_ATTEMPT',
      term: 'Disciplined Attempt',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Attempted ${daCount} ${daCount === 1 ? 'Question' : 'Questions'} with genuine effort within standard time limits. Even though the final answer went wrong, your pacing and approach were calm and disciplined.`,
      count: daCount,
    },
    {
      key: 'CARELESS_RUSHING',
      term: 'Careless Rushing',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Answered ${crCount} ${crCount === 1 ? 'Question' : 'Questions'} too quickly and got incorrect due to rushing or minor calculation slips. Taking 15–20 extra seconds to re-read and double-check prevents these lost marks.`,
      count: crCount,
    },
    {
      key: 'TIME_TRAP',
      term: 'Time Trap',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Got stuck on ${ttCount} tricky ${ttCount === 1 ? 'Question' : 'Questions'}, spent too much time, and still got wrong. If a question is blocking you in an exam, skip it temporarily and return at the end.`,
      count: ttCount,
    },
    {
      key: 'UNATTEMPTED',
      term: 'Unattempted',
      badgeTone: blueBadgeStyle,
      dot: blueDotStyle,
      explanation: `Left ${unCount} ${unCount === 1 ? 'Question' : 'Questions'} unattempted due to time running out or uncertainty about the concept.`,
      count: unCount,
    },
  ];

  const visibleRows = BEHAVIORAL_ROWS.filter((row) => row.count > 0);

  return (
    <div
      className={`mt-8 space-y-4 rounded-2xl border p-4 sm:p-5 md:p-6 shadow-xs ${
        isStrength
          ? 'border-emerald-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
          : 'border-amber-200/90 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3.5 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div
              className={`flex size-7 items-center justify-center rounded-lg text-white ${
                isStrength ? 'bg-emerald-600' : 'bg-amber-600'
              }`}
            >
              <Clock className="size-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-900 dark:text-white">
              Time Management &amp; Pacing
            </h3>
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] sm:text-xs font-black uppercase tracking-wider border ${
                isStrength
                  ? 'bg-emerald-500/10 text-emerald-800 border-emerald-500/20 dark:bg-emerald-400/10 dark:text-emerald-300'
                  : 'bg-amber-500/10 text-amber-800 border-amber-500/20 dark:bg-amber-400/10 dark:text-amber-300'
              }`}
            >
              {isStrength ? (
                <>
                  <CheckCircle2 className="size-3 text-emerald-600 dark:text-emerald-400" />
                  Pacing Strength
                </>
              ) : (
                <>
                  <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
                  Area for Improvement
                </>
              )}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {isStrength
              ? 'Your overall pacing, speed control, and question discipline reflect strong exam readiness.'
              : 'Pacing adjustments and time allocation across questions are high-impact areas to raise your board score.'}
          </p>
        </div>

        {/* Category & Star Rating */}
        <div className="flex flex-wrap items-center gap-2.5 sm:justify-end shrink-0">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Pacing:</span>
            {getTimeManagementBadge(timeManagement.rating)}
          </div>
          <EcommerceStarRating rating={starRating} align="end" />
        </div>
      </div>

      {/* Guesswork Flag */}
      {hasGuesswork ? (
        <div className="rounded-xl border border-amber-300/80 bg-amber-50/70 p-3 sm:p-3.5 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="font-extrabold text-amber-950 dark:text-amber-100 mr-1">
              Possibility of Guesswork Detected:
            </strong>
            Rapid responses submitted in under 8 seconds indicate a likelihood of guesswork without step-by-step solving. In Board exams, guessing carries high risk of losing marks—allocating deliberate calculation time avoids silly mistakes.
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-2.5 sm:p-3 text-xs text-emerald-900 dark:border-emerald-800/40 dark:bg-emerald-950/20 dark:text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span className="font-medium">
            <strong className="font-bold text-emerald-950 dark:text-emerald-100">No Guesswork Detected:</strong> You maintained a disciplined pace with steady solving time across all attempted questions.
          </span>
        </div>
      )}

      {/* Behavioral Distribution Table */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
            Lets see how well you managed your Time in the below table
          </span>
        </div>

        {/* Mobile View: Responsive Card Layout (< sm) */}
        <div className="block sm:hidden space-y-2.5">
          {visibleRows.map((row) => (
            <div
              key={row.key}
              className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold border ${row.badgeTone}`}>
                  <span className={`size-1.5 rounded-full ${row.dot}`} />
                  {row.term}
                </span>
                <span className="inline-flex items-center rounded-md bg-white px-2.5 py-0.5 text-xs font-mono font-bold text-slate-800 border border-slate-200 shadow-2xs dark:bg-slate-900 dark:text-slate-100 dark:border-slate-700">
                  {row.count} {row.count === 1 ? 'Question' : 'Questions'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                {row.explanation}
              </p>
            </div>
          ))}
          {visibleRows.length === 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-center text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              No question pacing items recorded.
            </div>
          )}
        </div>

        {/* Desktop View: Structured Table (>= sm) */}
        <div className="hidden sm:block rounded-xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900 shadow-2xs">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                <TableHead className="text-xs font-bold uppercase tracking-wider py-2.5 px-3 whitespace-nowrap">
                  Behavior Pattern
                </TableHead>
                <TableHead className="text-center text-xs font-bold uppercase tracking-wider py-2.5 px-3 whitespace-nowrap">
                  No. of Questions
                </TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider py-2.5 px-3">
                  What It Means
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleRows.map((row) => (
                <TableRow key={row.key} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                  <TableCell className="py-2.5 px-3 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-bold border ${row.badgeTone}`}>
                      <span className={`size-1.5 rounded-full ${row.dot}`} />
                      {row.term}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-center font-mono font-bold text-sm text-slate-900 dark:text-white tnum whitespace-nowrap">
                    {row.count}
                  </TableCell>
                  <TableCell className="py-2.5 px-3 text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {row.explanation}
                  </TableCell>
                </TableRow>
              ))}
              {visibleRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="py-4 text-center text-xs text-slate-400 dark:text-slate-500">
                    No question pacing items recorded.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pacing Feedback Box */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 text-xs leading-relaxed transition-all shadow-xs ${
          isStrength
            ? 'border-emerald-200 bg-emerald-50/50 dark:border-emerald-800/40 dark:bg-emerald-950/25'
            : 'border-amber-200 bg-amber-50/50 dark:border-amber-800/40 dark:bg-amber-950/25'
        }`}
      >
        <div
          className={`flex items-center gap-2 pb-2.5 border-b ${
            isStrength
              ? 'border-emerald-200/60 dark:border-emerald-800/40'
              : 'border-amber-200/60 dark:border-amber-800/40'
          }`}
        >
          <div
            className={`flex size-6 items-center justify-center rounded-lg text-white shadow-2xs ${
              isStrength ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-amber-600 dark:bg-amber-500'
            }`}
          >
            {isStrength ? (
              <Sparkles className="size-3.5" />
            ) : (
              <Target className="size-3.5" />
            )}
          </div>
          <h4
            className={`font-black uppercase tracking-wider text-xs ${
              isStrength
                ? 'text-emerald-900 dark:text-emerald-300'
                : 'text-amber-900 dark:text-amber-300'
            }`}
          >
            Pacing Feedback
          </h4>
        </div>

        <div className="mt-3 space-y-2 text-slate-700 dark:text-slate-200 font-medium">
          <p className="text-slate-900 dark:text-slate-100 font-semibold leading-relaxed">
            {isStrength
              ? 'Great pacing! You maintained steady speed and composure across the test.'
              : 'Pacing is your key growth frontier. Allocate time smartly per question to finish comfortably.'}
          </p>

          <div className="space-y-1.5 pt-0.5">
            {isStrength ? (
              <>
                {counts.EFFICIENT_MASTERY > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Efficient Solving:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.EFFICIENT_MASTERY} question(s) answered quickly and accurately, preserving time for complex problems.
                      </span>
                    </p>
                  </div>
                )}
                {counts.OVER_INVESTED_SUCCESS > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Speed Up:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.OVER_INVESTED_SUCCESS} question(s) took extra time. Timed practice on standard questions will help you solve them faster.
                      </span>
                    </p>
                  </div>
                )}
                {counts.CARELESS_RUSHING > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Avoid Slips:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.CARELESS_RUSHING} question(s) missed due to rushing. Spend 15 extra seconds double-checking calculations.
                      </span>
                    </p>
                  </div>
                )}
                {counts.TIME_TRAP > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Watch Time Traps:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        Stuck on {counts.TIME_TRAP} question(s). If stuck for over 2 minutes, star it and move ahead.
                      </span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <>
                {counts.TIME_TRAP > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Avoid Time Traps:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        Stuck on {counts.TIME_TRAP} question(s). If you cannot outline a solution in 60 seconds, move forward first.
                      </span>
                    </p>
                  </div>
                )}
                {counts.CARELESS_RUSHING > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Slow Down on Simple Questions:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.CARELESS_RUSHING} mark(s) lost to rushing. Double-check your steps before finalizing.
                      </span>
                    </p>
                  </div>
                )}
                {counts.OVER_INVESTED_SUCCESS > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Build Solving Speed:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.OVER_INVESTED_SUCCESS} question(s) were correct but slow. Practice routine textbook questions with a timer.
                      </span>
                    </p>
                  </div>
                )}
                {counts.UNATTEMPTED > 0 && (
                  <div className="flex items-start gap-1.5">
                    <span className="text-amber-600 dark:text-amber-400 font-bold shrink-0">•</span>
                    <p>
                      <strong className="font-bold text-slate-900 dark:text-slate-100">Attempt All Questions:</strong>{' '}
                      <span className="text-slate-600 dark:text-slate-300">
                        {counts.UNATTEMPTED} question(s) unattempted. Pacing early questions better will leave time for the entire paper.
                      </span>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function formatWeaknessName(name: string): string {
  const map: Record<string, string> = {
    'Conceptual Gap': 'Conceptual Understanding',
    'Application Gap': 'Application Skill',
    'Problem Solving Gap': 'Problem Solving Skill',
    'Problem-Solving Gap': 'Problem Solving Skill',
    'Interpretation Gap': 'Question Interpretation Skill',
    'Accuracy Risk': 'Accuracy',
    'Difficulty Readiness Gap': 'Difficulty Readiness',
    'Multi-Step Question Gap': 'Multi-Step Question Skill',
    'Application-Based Question Gap': 'Application-Based Question Skill',
  };
  return map[name] || name;
}

export function BoardReadinessReport({
  report,
  studentGender,
  studentDetails,
  onRetakeOrBrowse,
  isTeacherView = false,
  onGoToSolutions,
  attemptId,
}: BoardReadinessReportProps) {
  const isMale = (studentGender || report.studentGender) === 'Male';
  const avatarSrc = isMale ? '/board-challenge/Male.webp' : '/board-challenge/Female.webp';

  const [activePage, setActivePage] = useState<'page1' | 'page2' | 'page3' | 'page4' | 'page5' | 'page6'>('page1');
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [revisitFilter, setRevisitFilter] = useState<'all' | RevisitCategory>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'incorrect' | 'overtime' | 'revisit'>('all');

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getPageSection = (pageId: string) => {
    const hyphenated = `report-${pageId.replace(/^page(\d+)$/, 'page-$1')}`;
    return (
      document.getElementById(hyphenated) ||
      document.getElementById(`report-${pageId}`) ||
      document.getElementById(pageId)
    );
  };

  const scrollToPage = (pageId: 'page1' | 'page2' | 'page3' | 'page4' | 'page5' | 'page6') => {
    setActivePage(pageId);
    const element = getPageSection(pageId);
    if (!element) return;

    // Suppress scroll-watcher while programmatic smooth scroll is animating
    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 950);

    // Compute dynamic sticky top + sticky toolbar height to offset scroll with generous breathing clearance
    const stickyTop = typeof window !== 'undefined' && window.innerWidth < 768 ? 88 : 64;
    const toolbar = document.getElementById('report-sticky-toolbar');
    const toolbarHeight = toolbar ? toolbar.offsetHeight : (typeof window !== 'undefined' && window.innerWidth < 768 ? 110 : 90);

    // Generous offset so element top rounded border and padding are fully visible below sticky headers
    const totalOffset = stickyTop + toolbarHeight + 24;
    const scrollingElement = document.scrollingElement || document.documentElement || document.body;
    const currentScrollY =
      window.scrollY ||
      window.pageYOffset ||
      document.documentElement.scrollTop ||
      (scrollingElement ? scrollingElement.scrollTop : 0) ||
      (document.body ? document.body.scrollTop : 0);
    const elementTop = element.getBoundingClientRect().top + currentScrollY;
    const targetY = Math.max(0, elementTop - totalOffset);

    try {
      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    } catch {
      window.scrollTo(0, targetY);
    }

    if (scrollingElement) {
      try {
        scrollingElement.scrollTo({
          top: targetY,
          behavior: 'smooth',
        });
      } catch {
        scrollingElement.scrollTop = targetY;
      }
    }
    if (document.body && document.body !== scrollingElement) {
      try {
        document.body.scrollTo({
          top: targetY,
          behavior: 'smooth',
        });
      } catch {
        document.body.scrollTop = targetY;
      }
    }
  };

  useEffect(() => {
    const pageIds: Array<'page1' | 'page2' | 'page3' | 'page4' | 'page5' | 'page6'> = [
      'page1',
      'page2',
      'page3',
      'page4',
      'page5',
      ...(isTeacherView ? (['page6'] as const) : []),
    ];

    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const stickyTop = typeof window !== 'undefined' && window.innerWidth < 768 ? 88 : 64;
      const toolbar = document.getElementById('report-sticky-toolbar');
      const toolbarHeight = toolbar ? toolbar.offsetHeight : (typeof window !== 'undefined' && window.innerWidth < 768 ? 110 : 90);
      const threshold = stickyTop + toolbarHeight + 35;

      for (let i = pageIds.length - 1; i >= 0; i--) {
        const el = getPageSection(pageIds[i]);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= threshold) {
            setActivePage(pageIds[i]);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isTeacherView]);

  const handleWhatsAppAction = (action: 'whatsapp_contact_us' | 'whatsapp_enroll_now') => {
    try {
      fetch('/api/student/lead-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          attemptId: attemptId || null,
          source: 'report_page_5',
        }),
      }).catch((err) => console.error('[lead-action] tracking error', err));
    } catch {
      // ignore
    }

    const message =
      action === 'whatsapp_contact_us'
        ? `Hi, I just completed the JEE Online Test at Shri Ram Smart Minds Academy. Based on my diagnostic report, I would like to speak with an academic counsellor about the Class 10 Board Mastery Course. Please share details.`
        : `Hi, I just completed the JEE Online Test at Shri Ram Smart Minds Academy. Based on my diagnostic report, I would like to enroll in the Class 10 Board Mastery Course. Please share the next steps and batch details.`;
    const url = `https://wa.me/918463911854?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };



  // Category & Prep Level styling helpers
  const getPrepLevelBadge = (level: PreparationLevel | string) => {
    const norm = String(level).trim().toLowerCase();
    if (norm.includes('high achievement') || norm === 'advanced') {
      return {
        tone: 'green' as const,
        label: 'High achievement Potential',
        bg: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
        gradient: 'from-emerald-600 to-teal-700',
      };
    }
    if (norm.includes('conceptually strong') || norm === 'proficient') {
      return {
        tone: 'brand' as const,
        label: 'Conceptually Strong',
        bg: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30',
        gradient: 'from-blue-600 to-indigo-700',
      };
    }
    if (norm.includes('foundational') || norm.includes('early') || norm.includes('emerging')) {
      return {
        tone: 'violet' as const,
        label: 'Foundational',
        bg: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
        gradient: 'from-indigo-600 to-violet-700',
      };
    }
    return {
      tone: 'amber' as const,
      label: 'Basic',
      bg: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
      gradient: 'from-amber-500 to-orange-600',
    };
  };

  const getSkillCategoryBadge = (cat: SkillValueCategory) => {
    switch (cat) {
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Good
          </span>
        );
      case 'Average':
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <span className="size-1.5 rounded-full bg-amber-500" />
            Average
          </span>
        );
      case 'Needs Strengthening':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <span className="size-1.5 rounded-full bg-rose-500" />
            Needs Strengthening
          </span>
        );
    }
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'High Priority':
        return (
          <Badge tone="red" className="font-bold">
            High Priority
          </Badge>
        );
      case 'Medium Priority':
        return (
          <Badge tone="amber" className="font-bold">
            Medium Priority
          </Badge>
        );
      case 'Low Priority':
      default:
        return (
          <Badge tone="brand" className="font-bold">
            Low Priority
          </Badge>
        );
    }
  };

  const getRevisitBadge = (cat: RevisitCategory) => {
    switch (cat) {
      case 'Too Slow':
      case 'Severe Overtime':
      case 'High Friction Gap':
      case 'Pacing / Time Management':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <Clock className="size-3" />
            Too Slow
          </span>
        );
      case 'Too Fast but Incorrect':
      case 'Rapid Guesswork':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-orange-500/30 bg-orange-50 px-2 py-0.5 text-xs font-bold text-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
            <Zap className="size-3 text-orange-600" />
            Too Fast but Incorrect
          </span>
        );
      case 'Conceptual / Calculation Gap':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-rose-500/30 bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertTriangle className="size-3" />
            Conceptual / Calculation Gap
          </span>
        );
      case 'Unattempted':
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <HelpCircle className="size-3 text-slate-500" />
            Unattempted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-md border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            {cat}
          </span>
        );
    }
  };

  const prepStyle = getPrepLevelBadge(report.levelOfPreparation);
  const prepNorm = String(report.levelOfPreparation || '').trim().toLowerCase();
  const isHighPrep = prepNorm.includes('high achievement') || prepNorm === 'advanced' || (report.briScore ?? 0) >= 70;
  const isMedPrep = !isHighPrep && (prepNorm.includes('conceptually strong') || prepNorm === 'proficient' || (report.briScore ?? 0) >= 50);
  const isVeryLowPrep = !isHighPrep && !isMedPrep && ((report.briScore ?? 0) < 20 || prepNorm.includes('foundational'));

  const filteredTopics = report.topicsToRevisit.filter((t) => {
    if (t.category === 'Rapid Guesswork') return false;
    if (revisitFilter === 'all') return true;
    return t.category === revisitFilter;
  });

  const isTmsStrength = (report.timeManagement?.finalScorePercent ?? 0) >= 70;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* 1. Header Navigation Toolbar */}
      <div
        id="report-sticky-toolbar"
        className="sticky top-[5.5rem] md:top-[4rem] z-20 flex flex-col gap-2.5 rounded-2xl border border-slate-200/90 bg-white/95 p-3 sm:p-3.5 shadow-md backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95"
      >
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="flex size-9 sm:size-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-md shrink-0">
              <GraduationCap className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="rounded bg-brand-100 px-2 py-0.5 text-xs sm:text-[11px] font-black uppercase tracking-wider text-brand-800 dark:bg-brand-950 dark:text-brand-300 whitespace-nowrap">
                  Shri Ram Smart Minds Academy
                </span>
                {studentDetails?.isFormFilled ? (
                  <span className="text-xs sm:text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                    {studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} • {studentDetails.board || 'CBSE'}
                    {isTeacherView && studentDetails.school && (
                      <span className="ml-1 text-[11px] text-slate-400 hidden sm:inline">
                        ({studentDetails.school}{studentDetails.city ? `, ${studentDetails.city}` : ''})
                      </span>
                    )}
                  </span>
                ) : isTeacherView ? (
                  <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                    ⚠️ Unlock Form: Not Filled
                  </span>
                ) : (
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Class X CBSE</span>
                )}
              </div>
              <h1 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white mt-0.5 truncate">
                JEE ONLINE TEST REPORT
              </h1>
            </div>
          </div>
        </div>

        {/* Page Scroll navigation buttons - Responsive grid on mobile, flex on desktop so all tabs fit seamlessly */}
        <div className={`grid ${isTeacherView ? 'grid-cols-6' : 'grid-cols-5'} sm:flex sm:items-center gap-1 sm:gap-1.5 rounded-xl border border-slate-200 bg-slate-100 p-1 sm:p-1.5 dark:border-slate-800 dark:bg-slate-800/90 text-xs font-bold w-full sm:overflow-x-auto no-scrollbar`}>
          <button
            type="button"
            onClick={() => scrollToPage('page1')}
            className={`flex-1 rounded-lg px-1 sm:px-3 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page1'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700/80'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <span className="hidden sm:inline">P1 • Overview</span>
            <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
              <span className="text-[11px] font-black">P1</span>
              <span className="text-[8.5px] font-semibold opacity-75">Overview</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToPage('page2')}
            className={`flex-1 rounded-lg px-1 sm:px-3 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page2'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700/80'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <span className="hidden sm:inline">P2 • Strengths</span>
            <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
              <span className="text-[11px] font-black">P2</span>
              <span className="text-[8.5px] font-semibold opacity-75">Strengths</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToPage('page3')}
            className={`flex-1 rounded-lg px-1 sm:px-3 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page3'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700/80'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <span className="hidden sm:inline">P3 • Priorities</span>
            <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
              <span className="text-[11px] font-black">P3</span>
              <span className="text-[8.5px] font-semibold opacity-75">Areas</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToPage('page4')}
            className={`flex-1 rounded-lg px-1 sm:px-3 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page4'
              ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-900 dark:text-white ring-1 ring-slate-200/80 dark:ring-slate-700/80'
              : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
          >
            <span className="hidden sm:inline">P4 • Next Steps</span>
            <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
              <span className="text-[11px] font-black">P4</span>
              <span className="text-[8.5px] font-semibold opacity-75">Next Steps</span>
            </span>
          </button>
          <button
            type="button"
            onClick={() => scrollToPage('page5')}
            className={`flex-1 rounded-lg px-1 sm:px-3 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page5'
              ? 'bg-white text-brand-700 shadow-xs dark:bg-slate-900 dark:text-brand-300 ring-1 ring-brand-300 dark:ring-brand-700'
              : 'text-slate-600 hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-300'
              }`}
          >
            <span className="hidden sm:inline">P5 • Support</span>
            <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
              <span className="text-[11px] font-black">P5</span>
              <span className="text-[8.5px] font-semibold opacity-75">Support</span>
            </span>
          </button>
          {isTeacherView && (
            <button
              type="button"
              onClick={() => scrollToPage('page6')}
              className={`flex-1 rounded-lg px-1 sm:px-2.5 py-1.5 sm:py-1.5 transition text-center text-xs font-black ${activePage === 'page6'
                ? 'bg-amber-500 text-slate-950 shadow-xs dark:bg-amber-400'
                : 'text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200'
                }`}
            >
              <span className="hidden sm:inline-flex items-center justify-center gap-1">
                <Calculator className="size-3.5" />
                P6 • Audit
              </span>
              <span className="sm:hidden flex flex-col items-center justify-center leading-tight">
                <span className="text-[11px] font-black flex items-center justify-center gap-0.5">
                  <Calculator className="size-3" />
                  P6
                </span>
                <span className="text-[8.5px] font-semibold opacity-75">Audit</span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          PAGE 1: JEE ONLINE TEST REPORT
          ========================================================================= */}
      <section
        id="report-page-1"
        className="report-page-container report-page-1 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 md:p-8 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
      >
        {/* Header watermark & Brand bar */}
        <div className="border-b border-slate-100 pb-4 dark:border-slate-800">
          <div className="flex items-start sm:items-center justify-between gap-2.5 sm:gap-3">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
              <span className="text-xs sm:text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                <GraduationCap className="size-4 text-brand-600 dark:text-brand-400 shrink-0" />
                <span className="inline-flex flex-wrap items-baseline gap-x-1">
                  <span className="whitespace-nowrap">Shri Ram</span>
                  <span className="whitespace-nowrap">Smart Minds Academy</span>
                </span>
              </span>
              <span className="rounded bg-brand-50 border border-brand-200/60 px-2.5 py-0.5 text-[11px] sm:text-xs font-black uppercase tracking-wider text-brand-700 dark:bg-brand-950/40 dark:border-brand-800 dark:text-brand-300">
                Diagnostic Evaluation
              </span>
              {studentDetails?.isFormFilled ? (
                <span className="rounded bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  {studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} • {studentDetails.board || 'CBSE'}
                </span>
              ) : isTeacherView ? (
                <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                  ⚠️ Unlock Form: Not Filled by Student
                </span>
              ) : null}
            </div>
            <div className="text-right shrink-0 pt-0.5 sm:pt-0">
              <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs whitespace-nowrap">
                {isTeacherView ? 'PAGE 1 OF 6' : 'PAGE 1 OF 5'}
              </span>
            </div>
          </div>

          <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-2.5 break-words">
            PAGE 1: JEE ONLINE TEST REPORT
          </h2>

          <div className="mt-3.5 w-full rounded-xl border border-blue-200/90 bg-gradient-to-r from-blue-50/80 to-indigo-50/50 p-3.5 sm:p-4 text-sm dark:border-blue-900/60 dark:bg-gradient-to-r dark:from-blue-950/40 dark:to-indigo-950/20 flex items-start gap-2.5 shadow-2xs">
            <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white mt-0.5 shadow-2xs">
              <Info className="size-4" />
            </div>
            <div className="leading-relaxed text-slate-700 dark:text-slate-300 flex-1 text-sm sm:text-sm">
              <span className="font-extrabold text-blue-800 dark:text-blue-300 mr-1.5 inline-flex items-center text-sm">
                A Note For Parents:
              </span>
              This report is best used as a starting point for understanding your child&apos;s current preparation and identifying where focused support can make the greatest difference.
            </div>
          </div>
        </div>

          {/* Teacher View Notice if student has not filled form */}
          {isTeacherView && !studentDetails?.isFormFilled && (
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 dark:text-amber-400 mt-0.5" />
              <div>
                <p className="font-bold">Teacher Authorization View</p>
                <p className="mt-0.5 text-[11px] leading-relaxed text-amber-800 dark:text-amber-300">
                  This student has not submitted the report unlock form yet (Board, School, and City details are pending). As a Teacher, you have full administrative authorization to view their complete diagnostic performance.
                </p>
              </div>
            </div>
          )}

          {/* Mentor Greeting Card */}
          <div className="mt-6 rounded-2xl bg-gradient-to-br from-brand-50/80 via-indigo-50/30 to-slate-50 p-4 sm:p-6 border border-brand-100/80 dark:border-slate-800 dark:from-slate-900 dark:via-brand-950/20 dark:to-slate-900 shadow-xs">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6">
              <div className="space-y-3 w-full">
                {/* Mobile Mascot Avatar in header (< sm) */}
                <div className="flex items-center gap-3.5 sm:hidden">
                  <div className="relative size-20 shrink-0 rounded-2xl border-2 border-brand-500/40 bg-slate-950 p-1.5 shadow-md ring-1 ring-brand-400/20 flex items-center justify-center overflow-hidden">
                    <img
                      src={avatarSrc}
                      alt={isMale ? 'Male Student Mascot' : 'Female Student Mascot'}
                      className="size-full object-contain rounded-xl"
                    />
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <span className="inline-block rounded-md bg-brand-500/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-brand-700 dark:bg-brand-400/10 dark:text-brand-300">
                      SRSMA Mentorship
                    </span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white truncate">
                      Dear {report.studentName},
                    </h3>
                  </div>
                </div>

                {/* Desktop Heading (>= sm) */}
                <div className="hidden sm:flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-white font-black text-base shadow-sm">
                    🎓
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    Dear {report.studentName},
                  </h3>
                </div>

                <p className="text-xs sm:text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  Congratulations on taking this first step towards becoming more Board-ready! Taking this diagnostic test shows that you care about your preparation and are willing to find out where you stand and how you can improve. Go through this report carefully—it will help you understand your strengths, identify the areas that need more attention, and know what to do next. If you use these insights well you can put yourself in a strong position to excel in your {studentDetails?.board ? `${studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} ${studentDetails.board}` : 'Class X Board'} examinations. Go ahead and explore further!
                </p>
              </div>

              {/* Desktop Mascot Standing Character (>= sm) */}
              <div className="hidden sm:flex shrink-0 items-center justify-center">
                <div className="relative rounded-2xl border-2 border-brand-500/40 bg-slate-950 p-2 shadow-md ring-1 ring-brand-400/20 overflow-hidden flex items-center justify-center">
                  <img
                    src={avatarSrc}
                    alt={isMale ? 'Male Student Mascot' : 'Female Student Mascot'}
                    className="h-32 sm:h-36 w-auto object-contain rounded-xl"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Diagnostic Report Title */}
          <div className="mt-8 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="h-5 w-1.5 rounded-full bg-brand-600" />
              <h3 className="text-sm sm:text-base font-black tracking-wider uppercase text-slate-900 dark:text-white">
                Personal Diagnostic Evaluation
              </h3>
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Overview &amp; Baseline
            </span>
          </div>

          {/* Hero Readiness Snapshot */}
          <div className="mt-4 grid gap-5 sm:grid-cols-12">
            {/* BRI Speedometer Gauge Arc Tile */}
            <div className="sm:col-span-6 lg:col-span-5">
              <BriSpeedometerGauge score={report.briScore} prepStyle={prepStyle} />
            </div>

            {/* Score Snapshot Cards & Subject Performance Matrix */}
            <div className="sm:col-span-6 lg:col-span-7 flex flex-col justify-between gap-3">
              {/* Overall Raw Score Card */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Overall Raw Score
                  </span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    Accuracy: {Math.round((report.totalRawScore / Math.max(1, report.totalQuestions)) * 100)}%
                  </span>
                </div>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="tnum text-3xl font-black text-slate-900 dark:text-white">
                    {report.totalRawScore}
                  </span>
                  <span className="text-sm font-bold text-slate-400">/ {report.totalQuestions} Questions Correct</span>
                </div>
                <div className="mt-2.5 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${report.totalRawScore <= 8
                      ? 'bg-rose-500'
                      : report.totalRawScore <= 14
                        ? 'bg-amber-500'
                        : 'bg-emerald-500'
                      }`}
                    style={{ width: `${(report.totalRawScore / Math.max(1, report.totalQuestions)) * 100}%` }}
                  />
                </div>
              </div>

              {/* Subject Breakdown Matrix */}
              <div className="rounded-2xl border border-slate-200/90 bg-white p-3.5 sm:p-4 dark:border-slate-800 dark:bg-slate-900 shadow-xs space-y-3">
                <div className="flex items-center justify-between text-xs font-bold border-b border-slate-100 pb-2 dark:border-slate-800">
                  <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400">Subject-Wise Performance</span>
                  <span className="uppercase tracking-wider text-slate-500 dark:text-slate-400">Accuracy %</span>
                </div>

                {/* Mathematics */}
                <div className="flex items-center justify-between rounded-xl bg-blue-50/60 p-2.5 border border-blue-100 dark:bg-blue-950/20 dark:border-blue-900/40">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-bold shadow-2xs">
                      📐
                    </span>
                    <span className="font-bold text-slate-900 dark:text-white text-sm">Mathematics</span>
                  </div>
                  <span className="rounded-lg bg-blue-600/10 px-2.5 py-1 text-sm font-black text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 tnum">
                    {report.breakdown.mathematics.percentage}%
                  </span>
                </div>

                {/* Science */}
                <div className="rounded-xl bg-emerald-50/60 p-2.5 border border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-2xs">
                        🧪
                      </span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">Science</span>
                    </div>
                    <span className="rounded-lg bg-emerald-600/10 px-2.5 py-1 text-sm font-black text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 tnum">
                      {report.breakdown.science.percentage}%
                    </span>
                  </div>

                  {/* Science Sub-Disciplines Micro Pills */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <div className="rounded-lg bg-white/90 dark:bg-slate-800/80 p-1.5 text-center border border-emerald-200/50 dark:border-slate-700">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Physics</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white tnum">{report.breakdown.physics?.percentage ?? 0}%</span>
                    </div>
                    <div className="rounded-lg bg-white/90 dark:bg-slate-800/80 p-1.5 text-center border border-emerald-200/50 dark:border-slate-700">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Chemistry</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white tnum">{report.breakdown.chemistry?.percentage ?? 0}%</span>
                    </div>
                    <div className="rounded-lg bg-white/90 dark:bg-slate-800/80 p-1.5 text-center border border-emerald-200/50 dark:border-slate-700">
                      <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block">Biology</span>
                      <span className="text-xs font-black text-slate-900 dark:text-white tnum">{report.breakdown.biology?.percentage ?? 0}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Subject Comparison Insight Box */}
              {(() => {
                const insight = getSubjectPerformanceInsight(
                  report.breakdown.mathematics.percentage,
                  report.breakdown.science.percentage,
                );
                return (
                  <div className="rounded-2xl border-2 border-sky-300/80 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-indigo-50/70 p-4 text-xs leading-relaxed text-blue-950 dark:border-sky-700/60 dark:bg-gradient-to-r dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/30 dark:text-sky-100 shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-sky-200/60 pb-2 dark:border-sky-800/60">
                      <div className="flex items-center gap-2 font-black uppercase tracking-wider text-[11px] text-sky-800 dark:text-sky-300">
                        <div className="flex size-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs">
                          <Sparkles className="size-3.5" />
                        </div>
                        <span>Subject Performance Insight</span>
                      </div>
                      <span className="rounded-md bg-sky-100 dark:bg-sky-900/60 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:text-sky-200 border border-sky-300/60 dark:border-sky-700">
                        {insight.label}
                      </span>
                    </div>
                    <p className="mt-2.5 font-medium leading-relaxed text-slate-800 dark:text-slate-200 text-xs sm:text-[13px]">
                      {insight.message}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Difficulty Level Performance Bar Graph (Maths & Science) */}
          <div className="mt-6 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                  <BarChart3 className="size-4 text-brand-600 dark:text-brand-400" />
                  Difficulty-Wise Performance
                </h3>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {/* Mathematics Difficulty Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>📐</span>
                    <span>Mathematics</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Overall: {report.breakdown.mathematics.percentage}%
                  </span>
                </div>
                <div className="space-y-3">
                  <MobileBatteryBar
                    label="Easy"
                    variant="easy"
                    percentage={report.subjectDifficultyBreakdowns?.mathematics.easy.percentage ?? 0}
                  />
                  <MobileBatteryBar
                    label="Medium"
                    variant="medium"
                    percentage={report.subjectDifficultyBreakdowns?.mathematics.medium.percentage ?? 0}
                  />
                  <MobileBatteryBar
                    label="Hard"
                    variant="hard"
                    percentage={report.subjectDifficultyBreakdowns?.mathematics.hard.percentage ?? 0}
                  />
                </div>
              </div>

              {/* Science Difficulty Card */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/30">
                <div className="flex items-center justify-between mb-3 border-b border-slate-200/60 pb-2 dark:border-slate-800">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-1.5">
                    <span>🧪</span>
                    <span>Science</span>
                  </span>
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    Overall: {report.breakdown.science.percentage}%
                  </span>
                </div>
                <div className="space-y-3">
                  <MobileBatteryBar
                    label="Easy"
                    variant="easy"
                    percentage={report.subjectDifficultyBreakdowns?.science.easy.percentage ?? 0}
                  />
                  <MobileBatteryBar
                    label="Medium"
                    variant="medium"
                    percentage={report.subjectDifficultyBreakdowns?.science.medium.percentage ?? 0}
                  />
                  <MobileBatteryBar
                    label="Hard"
                    variant="hard"
                    percentage={report.subjectDifficultyBreakdowns?.science.hard.percentage ?? 0}
                  />
                </div>
              </div>
            </div>

            {/* Difficulty Performance Insight Box */}
            <div className="mt-4 rounded-2xl border-2 border-sky-300/80 bg-gradient-to-r from-sky-50/90 via-blue-50/70 to-indigo-50/70 p-4 text-xs leading-relaxed text-blue-950 dark:border-sky-700/60 dark:bg-gradient-to-r dark:from-sky-950/40 dark:via-blue-950/30 dark:to-indigo-950/30 dark:text-sky-100 shadow-sm">
              <div className="flex items-center gap-2 border-b border-sky-200/60 pb-2 dark:border-sky-800/60 font-black uppercase tracking-wider text-[11px] text-sky-800 dark:text-sky-300">
                <div className="flex size-6 items-center justify-center rounded-lg bg-sky-600 text-white shadow-2xs">
                  <Sparkles className="size-3.5" />
                </div>
                <span>Difficulty-Wise Performance Insight</span>
              </div>
              <p className="mt-2.5 font-medium leading-relaxed text-slate-800 dark:text-slate-200 text-xs sm:text-[13px]">
                {getDifficultyInsight(report.subjectDifficultyBreakdowns)}
              </p>
            </div>
          </div>

          {/* Front Page Guesswork Alert */}
          {report.timeManagement?.guessworkQuestions && report.timeManagement.guessworkQuestions.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50/90 via-amber-50/40 to-yellow-50/60 p-4 sm:p-5 shadow-xs dark:border-amber-500/30 dark:bg-gradient-to-r dark:from-slate-900/95 dark:via-amber-950/20 dark:to-slate-900/95 dark:shadow-[0_0_20px_-3px_rgba(245,158,11,0.12)]">
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
                      Response time &lt; 8s
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                    Possibility of Guesswork Detected
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-normal">
                    There is possibility of guesswork being done in answering{' '}
                    <span className="inline-flex flex-wrap items-center gap-1 align-baseline my-0.5">
                      {report.timeManagement.guessworkQuestions.map((q) => (
                        <span
                          key={q}
                          className="inline-flex items-center rounded-md bg-amber-200/80 px-1.5 py-0.5 text-xs font-black text-amber-950 dark:bg-amber-400/20 dark:text-amber-200 dark:border dark:border-amber-400/30"
                        >
                          Q{q}
                        </span>
                      ))}
                    </span>{' '}
                    (responses were submitted in less than 8 seconds).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Key Insight Analytical Box */}
          <div className="mt-8 rounded-2xl border-2 border-purple-400/40 bg-gradient-to-r from-purple-500/15 via-indigo-500/15 to-pink-500/10 p-5 sm:p-6 dark:border-purple-500/40 dark:bg-gradient-to-r dark:from-purple-950/40 dark:via-indigo-950/30 dark:to-slate-900 shadow-md">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-md">
                <Sparkles className="size-5" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-300/60 dark:border-purple-800">
                  Diagnostic Insight
                </div>
                <h4 className="text-sm sm:text-base font-black tracking-wider uppercase text-purple-950 dark:text-purple-100">
                  Your Key Insight
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium dark:text-slate-200">
                  {report.keyInsight}
                </p>
              </div>
            </div>
          </div>
        </section>

      {/* =========================================================================
          PAGE 2: YOUR STRENGTHS
          ========================================================================= */}
      <section
        id="report-page-2"
        className="report-page-container report-page-2 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 md:p-8 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
              <GraduationCap className="size-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="inline-flex flex-wrap items-baseline gap-x-1">
                <span className="whitespace-nowrap">Shri Ram</span>
                <span className="whitespace-nowrap">Smart Minds Academy</span>
              </span>
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5 break-words">
              PAGE 2: YOUR STRENGTHS
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs whitespace-nowrap">
              {isTeacherView ? 'PAGE 2 OF 6' : 'PAGE 2 OF 5'}
            </span>
          </div>
        </div>

          {/* Top 3 Strengths */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Award className="size-4 text-emerald-600 dark:text-emerald-400" />
                {report.strengthsTitle || 'YOUR STRENGTHS'}
              </h3>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Top Performance Categories
              </span>
            </div>

            {report.strengths.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
                No syllabus categories scored 50% or above in this test. Focused revision will help build your core strengths!
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-3">
                {report.strengths.map((s) => {
                  const podiumMedal = s.rank === 1 ? '🥇 #1' : s.rank === 2 ? '🥈 #2' : '🥉 #3';
                  const medalClass = s.rank === 1
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-xs'
                    : s.rank === 2
                      ? 'bg-gradient-to-r from-slate-500 to-slate-600 text-white shadow-xs'
                      : 'bg-gradient-to-r from-amber-700 to-orange-700 text-white shadow-xs';

                  const isCore = s.percentage >= 70;
                  const isPotential = s.percentage < 60;
                  const cardTag = isCore
                    ? 'Verified Core Strength'
                    : isPotential
                      ? 'Areas with Most Potential'
                      : 'Emerging Strength';

                  return (
                    <div
                      key={s.rank}
                      className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 transition-all shadow-xs ${
                        isCore
                          ? 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 dark:border-emerald-900/40 dark:from-emerald-950/30 dark:to-teal-950/20'
                          : 'border-blue-200/80 bg-gradient-to-br from-blue-50/70 to-indigo-50/30 dark:border-blue-900/40 dark:from-blue-950/30 dark:to-indigo-950/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`px-2.5 py-0.5 rounded-md font-black text-xs tracking-wider uppercase ${medalClass}`}>
                            {podiumMedal}
                          </span>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold border ${
                            isCore
                              ? 'bg-emerald-100/70 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-blue-100/70 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                          }`}>
                            {s.percentage}%
                          </span>
                        </div>

                        <h4 className="mt-3 text-base font-black text-slate-900 dark:text-white">
                          {s.name}
                        </h4>

                        {/* Faculty Feedback reason callout */}
                        <div className={`mt-3 rounded-xl p-3 border text-xs font-medium leading-relaxed shadow-2xs ${
                          isCore
                            ? 'bg-emerald-500/10 border-emerald-300/60 text-emerald-950 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200'
                            : 'bg-blue-500/10 border-blue-300/60 text-blue-950 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200'
                        }`}>
                          <div className="flex items-center gap-1 font-bold text-[10px] uppercase tracking-wider mb-1 opacity-90">
                            <Sparkles className="size-3 shrink-0" />
                            <span>Faculty Evaluation</span>
                          </div>
                          <p>{s.reason}</p>
                        </div>
                      </div>

                      <div className={`mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800 flex items-center gap-1.5 text-xs font-bold ${
                        isCore
                          ? 'text-emerald-700 dark:text-emerald-400'
                          : 'text-blue-700 dark:text-blue-400'
                      }`}>
                        {isCore ? (
                          <>
                            <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                            <span>{cardTag}</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <span>{cardTag}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Time Management Section (When TMS >= 70%: Displayed as Strength on Page 2) */}
          {report.timeManagement && isTmsStrength && (
            <TimeManagementReportSection
              timeManagement={report.timeManagement}
              isStrength={true}
            />
          )}

          {/* Question Structure Performance Table */}
          <div className="mt-8 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="size-4 text-brand-600 dark:text-brand-400" />
                Your Performance Pattern (By Question Type)
              </h3>
              <span className="text-[11px] font-semibold text-slate-400">5 Performance Patterns</span>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900 shadow-xs">
              <Table className="w-full">
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider py-3 px-3 sm:px-4 whitespace-nowrap">Performance Pattern</TableHead>
                    <TableHead className="text-left sm:text-right text-xs font-bold uppercase tracking-wider py-3 px-3 sm:px-4 whitespace-nowrap">Rating (up to 5 Stars)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    const PATTERNS = [
                      { name: 'Direct', icon: <Zap className="size-4 text-amber-500" /> },
                      { name: 'Multi-step', icon: <Layers className="size-4 text-indigo-500" /> },
                      { name: 'Diagram-based', icon: <Compass className="size-4 text-emerald-500" /> },
                      { name: 'Application-based', icon: <Wrench className="size-4 text-blue-500" /> },
                      { name: 'Word Problem', icon: <BookOpen className="size-4 text-purple-500" /> },
                    ];

                    const sortedPatterns = PATTERNS.map((p) => {
                      const found = report.structures.find((s) => s.type.toLowerCase() === p.name.toLowerCase());
                      const st = found ?? { type: p.name, correct: 0, total: 0, percentage: 0 };
                      const starRating = Math.round((st.percentage / 100) * 5 * 10) / 10;
                      return { p, st, starRating };
                    }).sort((a, b) => b.st.percentage - a.st.percentage);

                    return sortedPatterns.map(({ p, st, starRating }) => (
                      <TableRow key={st.type} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                        <TableCell className="py-3 px-3 sm:px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="flex size-7 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0">
                              {p.icon}
                            </div>
                            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                              {st.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-3 px-3 sm:px-4 text-left sm:text-right whitespace-nowrap shrink-0">
                          <EcommerceStarRating rating={starRating} align="responsive" />
                        </TableCell>
                      </TableRow>
                    ));
                  })()}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* What This Tells You Narrative Box */}
          <div className="mt-8 rounded-2xl border-2 border-amber-400/50 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-brand-500/10 p-5 sm:p-6 dark:border-amber-500/40 dark:bg-gradient-to-r dark:from-amber-950/35 dark:via-orange-950/25 dark:to-slate-900 shadow-md">
            <div className="flex items-start gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 shadow-md font-black text-sm">
                <Brain className="size-5" />
              </div>
              <div className="space-y-1.5">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-widest text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300/60 dark:border-amber-800">
                  Pattern Analysis
                </div>
                <h4 className="text-sm sm:text-base font-black tracking-wider uppercase text-amber-950 dark:text-amber-100">
                  What This Tells You
                </h4>
                <p className="text-xs sm:text-sm leading-relaxed text-slate-800 font-medium dark:text-slate-200">
                  {report.performancePatternInsight}
                </p>
              </div>
            </div>
          </div>
        </section>

      {/* =========================================================================
          PAGE 3: WHERE SHOULD YOU IMPROVE?
          ========================================================================= */}
      <section
        id="report-page-3"
        className="report-page-container report-page-3 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 md:p-8 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
              <GraduationCap className="size-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="inline-flex flex-wrap items-baseline gap-x-1">
                <span className="whitespace-nowrap">Shri Ram</span>
                <span className="whitespace-nowrap">Smart Minds Academy</span>
              </span>
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5 break-words">
              PAGE 3: WHERE SHOULD YOU IMPROVE?
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs whitespace-nowrap">
              {isTeacherView ? 'PAGE 3 OF 6' : 'PAGE 3 OF 5'}
            </span>
          </div>
        </div>

          {/* Priority Gaps */}
          {(() => {
            const weaknessGaps = (report.priorityGaps || []).filter((g) => g.scorePercent < 50).slice(0, 4);
            return (
              <div className="mt-6 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1">
                  <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                    <Target className="size-4 text-brand-600 dark:text-brand-400" />
                    Your Priority Gaps
                  </h3>
                  <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    High-Impact Growth Frontiers
                  </span>
                </div>

                {weaknessGaps.length === 0 ? (
                  <div className="relative overflow-hidden flex flex-col items-center justify-center rounded-3xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/90 via-teal-50/40 to-emerald-50/70 p-6 sm:p-8 text-center shadow-xs dark:border-emerald-500/30 dark:bg-gradient-to-b dark:from-slate-900 dark:via-emerald-950/25 dark:to-slate-900 dark:shadow-[0_0_35px_-5px_rgba(16,185,129,0.18)]">
                    {/* Ambient celebratory radial glow */}
                    <div className="pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2 size-48 rounded-full bg-emerald-400/20 dark:bg-emerald-400/15 blur-2xl" />

                    {/* Trophy Medallion */}
                    <div className="relative flex size-16 items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-emerald-400/30 dark:bg-emerald-400/20 blur-md animate-pulse" />
                      <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400 via-teal-400 to-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/25 ring-2 ring-emerald-300 dark:ring-emerald-400/60">
                        <Award className="size-7 text-slate-950" />
                      </div>
                    </div>

                    <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-emerald-100/90 dark:bg-emerald-400/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-emerald-800 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-400/30 shadow-2xs">
                      <Sparkles className="size-3 text-emerald-600 dark:text-emerald-400" />
                      <span>Excellence Benchmark Achieved</span>
                    </div>

                    <h4 className="mt-3 text-base sm:text-xl font-black tracking-tight text-slate-900 dark:text-white">
                      Congratulations! No Weakness Areas Detected
                    </h4>

                    <p className="mt-2 max-w-lg text-xs sm:text-sm leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
                      Outstanding performance! You scored 50% or above across all evaluated syllabus categories. Keep up the phenomenal work for your board exams!
                    </p>

                    {/* 3 Academic Milestone Badges */}
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-emerald-200/60 dark:border-slate-800">
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-emerald-100 dark:border-slate-700 shadow-2xs">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        All Categories &gt;= 50%
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-emerald-100 dark:border-slate-700 shadow-2xs">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Zero Critical Deficits
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/80 dark:bg-slate-800/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-300 border border-emerald-100 dark:border-slate-700 shadow-2xs">
                        <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        Board Ready Pacing
                      </span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`grid gap-3 sm:grid-cols-2 ${weaknessGaps.length === 1
                      ? 'lg:grid-cols-1 max-w-md'
                      : weaknessGaps.length === 2
                        ? 'lg:grid-cols-2'
                        : weaknessGaps.length === 3
                          ? 'lg:grid-cols-3'
                          : 'lg:grid-cols-2 xl:grid-cols-4'
                      }`}
                  >
                    {weaknessGaps.map((g) => {
                      const isHighPriority = g.priority === 'High Priority';
                      const borderClass = isHighPriority
                        ? 'border-rose-200/80 dark:border-rose-900/40 bg-gradient-to-br from-white to-rose-50/30 dark:from-slate-900 dark:to-rose-950/20'
                        : 'border-amber-200/80 dark:border-amber-900/40 bg-gradient-to-br from-white to-amber-50/30 dark:from-slate-900 dark:to-amber-950/20';

                      return (
                        <div
                          key={g.rank}
                          className={`flex flex-col justify-between rounded-2xl border p-4 sm:p-5 shadow-xs transition-all ${borderClass}`}
                        >
                          <div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-400">#{g.rank} Priority Focus</span>
                              {getPriorityBadge(g.priority)}
                            </div>
                            <h4 className="mt-2.5 text-base font-black text-slate-900 dark:text-white">
                              {formatWeaknessName(g.name)}
                            </h4>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <EcommerceStarRating rating={Math.round((g.scorePercent / 100) * 5 * 10) / 10} align="start" />
                              <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                                {g.scorePercent}%
                              </span>
                            </div>
                          </div>
                          {g.message && (
                            <div className={`mt-3 rounded-xl p-3 border-2 text-xs font-medium leading-relaxed shadow-xs ${
                              isHighPriority
                                ? 'bg-amber-50/95 border-amber-400 text-amber-950 dark:border-amber-500/70 dark:bg-amber-950/40 dark:text-amber-200'
                                : 'bg-amber-50/90 border-amber-300 text-amber-950 dark:border-amber-600/70 dark:bg-amber-950/40 dark:text-amber-200'
                            }`}>
                              <div className="flex items-center gap-1 font-extrabold text-[10px] uppercase tracking-wider mb-1">
                                <Target className="size-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                <span className="text-amber-900 dark:text-amber-300 font-extrabold">Improvement Feedback</span>
                              </div>
                              <p className="font-semibold text-slate-800 dark:text-slate-200">{g.message}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Time Management Section (When TMS < 70%: Displayed as Area for Improvement on Page 3) */}
          {report.timeManagement && !isTmsStrength && (
            <TimeManagementReportSection
              timeManagement={report.timeManagement}
              isStrength={false}
            />
          )}

          {/* Topics to Revisit: 2 Distinct Tables (Mathematics & Science) */}
          <div className="mt-8 space-y-6">
            <div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white flex items-center gap-2">
                <BookOpen className="size-4 text-brand-600 dark:text-brand-400" />
                Topics to Revisit
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Key chapters in Mathematics and Science where you can review questions and strengthen your concepts:
              </p>
            </div>

            {/* TABLE 1: Mathematics */}
            {(() => {
              const mathsTopics = report.topicsToRevisit.filter(
                (t) => t.subject.toLowerCase() === 'maths' || t.subject.toLowerCase() === 'mathematics',
              );
              const hasTooFast = mathsTopics.some(
                (t) => t.category === 'Too Fast but Incorrect' || t.category === 'Rapid Guesswork',
              );
              const hasTooSlow = mathsTopics.some(
                (t) =>
                  t.category === 'Too Slow' ||
                  t.category === 'Severe Overtime' ||
                  t.category === 'Pacing / Time Management',
              );
              const hasUnattempted = mathsTopics.some((t) => t.category === 'Unattempted');

              return (
                <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-blue-100 text-blue-800 font-bold text-xs dark:bg-blue-950 dark:text-blue-300 shadow-2xs">
                        📐
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Mathematics — Topics to Revisit ({mathsTopics.length})
                      </h4>
                    </div>
                  </div>

                  {/* Mobile Question Cards (< md) */}
                  <div className="space-y-2.5 md:hidden">
                    {mathsTopics.map((t) => (
                      <div
                        key={t.qno}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center justify-center size-6 rounded-md bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 font-black text-xs shadow-2xs">
                            Q{t.qno}
                          </span>
                          <div className="shrink-0">
                            {getRevisitBadge(t.category)}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {t.chapter}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.topic}
                          </div>
                        </div>
                      </div>
                    ))}
                    {mathsTopics.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        🎉 No Mathematics topics require revisit. High accuracy and disciplined pacing maintained!
                      </div>
                    )}
                  </div>

                  {/* Desktop Academic Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                          <TableHead className="w-14 text-center text-xs font-bold uppercase tracking-wider">Q#</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Chapter &amp; Topic</TableHead>
                          <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {mathsTopics.map((t) => (
                          <TableRow key={t.qno} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                              {t.qno}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{t.chapter}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{t.topic}</div>
                            </TableCell>
                            <TableCell className="text-right">{getRevisitBadge(t.category)}</TableCell>
                          </TableRow>
                        ))}
                        {mathsTopics.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={3} className="py-6 text-center text-slate-400 dark:text-slate-500">
                              🎉 No Mathematics topics require revisit. High accuracy and disciplined pacing maintained!
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {(hasTooFast || hasTooSlow || hasUnattempted) && (
                    <div className="pt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800/60">
                      {hasTooFast && (
                        <p>
                          <span className="font-bold text-orange-600 dark:text-orange-400">* Too Fast but Incorrect:</span> Questions answered in under 8 seconds that resulted in an incorrect response. Take extra care to read questions thoroughly before answering.
                        </p>
                      )}
                      {hasTooSlow && (
                        <p>
                          <span className="font-bold text-amber-600 dark:text-amber-400">* Too Slow:</span> Questions taking more than double the expected time limit. Timed drill practice will help refine solving speed.
                        </p>
                      )}
                      {hasUnattempted && (
                        <p>
                          <span className="font-bold text-slate-600 dark:text-slate-300">* Unattempted Chapters:</span> Questions left unattempted during the exam. Practice these chapters independently to build speed and confidence.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* TABLE 2: Science */}
            {(() => {
              const scienceTopics = report.topicsToRevisit.filter((t) =>
                ['physics', 'chemistry', 'biology', 'science'].includes(t.subject.toLowerCase()),
              );
              const hasTooFast = scienceTopics.some(
                (t) => t.category === 'Too Fast but Incorrect' || t.category === 'Rapid Guesswork',
              );
              const hasTooSlow = scienceTopics.some(
                (t) =>
                  t.category === 'Too Slow' ||
                  t.category === 'Severe Overtime' ||
                  t.category === 'Pacing / Time Management',
              );
              const hasUnattempted = scienceTopics.some((t) => t.category === 'Unattempted');

              return (
                <div className="space-y-3 rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs dark:bg-emerald-950 dark:text-emerald-300 shadow-2xs">
                        🧪
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                        Science — Topics to Revisit ({scienceTopics.length})
                      </h4>
                    </div>
                  </div>

                  {/* Mobile Question Cards (< md) */}
                  <div className="space-y-2.5 md:hidden">
                    {scienceTopics.map((t) => (
                      <div
                        key={t.qno}
                        className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3.5 dark:border-slate-800 dark:bg-slate-800/40 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className="inline-flex items-center justify-center size-6 rounded-md bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 font-black text-xs shadow-2xs">
                              Q{t.qno}
                            </span>
                            <span className="rounded bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                              {t.subject}
                            </span>
                          </div>
                          <div className="shrink-0">
                            {getRevisitBadge(t.category)}
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            {t.chapter}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {t.topic}
                          </div>
                        </div>
                      </div>
                    ))}
                    {scienceTopics.length === 0 && (
                      <div className="py-6 text-center text-xs text-slate-400 dark:text-slate-500">
                        🎉 No Science topics require revisit. High accuracy and disciplined pacing maintained!
                      </div>
                    )}
                  </div>

                  {/* Desktop Academic Table (>= md) */}
                  <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                          <TableHead className="w-14 text-center text-xs font-bold uppercase tracking-wider">Q#</TableHead>
                          <TableHead className="w-24 text-xs font-bold uppercase tracking-wider">Branch</TableHead>
                          <TableHead className="text-xs font-bold uppercase tracking-wider">Chapter &amp; Topic</TableHead>
                          <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Category</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scienceTopics.map((t) => (
                          <TableRow key={t.qno} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                            <TableCell className="text-center font-bold text-slate-900 dark:text-white">
                              {t.qno}
                            </TableCell>
                            <TableCell className="font-semibold text-slate-800 capitalize dark:text-slate-200">
                              {t.subject}
                            </TableCell>
                            <TableCell>
                              <div className="font-bold text-slate-900 dark:text-slate-100">{t.chapter}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{t.topic}</div>
                            </TableCell>
                            <TableCell className="text-right">{getRevisitBadge(t.category)}</TableCell>
                          </TableRow>
                        ))}
                        {scienceTopics.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={4} className="py-6 text-center text-slate-400 dark:text-slate-500">
                              🎉 No Science topics require revisit. High accuracy and disciplined pacing maintained!
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>

                  {(hasTooFast || hasTooSlow || hasUnattempted) && (
                    <div className="pt-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 space-y-0.5 border-t border-slate-100 dark:border-slate-800/60">
                      {hasTooFast && (
                        <p>
                          <span className="font-bold text-orange-600 dark:text-orange-400">* Too Fast but Incorrect:</span> Questions answered in under 8 seconds that resulted in an incorrect response. Take extra care to read questions thoroughly before answering.
                        </p>
                      )}
                      {hasTooSlow && (
                        <p>
                          <span className="font-bold text-amber-600 dark:text-amber-400">* Too Slow:</span> Questions taking more than double the expected time limit. Timed drill practice will help refine solving speed.
                        </p>
                      )}
                      {hasUnattempted && (
                        <p>
                          <span className="font-bold text-slate-600 dark:text-slate-300">* Unattempted Chapters:</span> Questions left unattempted during the exam. Practice these chapters independently to build speed and confidence.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            <p className="text-[11px] text-slate-400 italic text-center sm:text-left">
              *Topic observations are based only on the questions tested.*
            </p>
          </div>

          {/* Official Academic Seal & Certification Footer */}
          <div className="mt-8 border-t border-slate-200/80 dark:border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-black text-xs border border-brand-200/50">
                ✓
              </span>
              <div>
                Official Diagnostic Dossier for <strong className="text-slate-800 dark:text-slate-200">{report.studentName}</strong> • {studentDetails?.isFormFilled ? `${studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} ${studentDetails.board || 'CBSE'}` : 'Class X JEE Online Test'}
              </div>
            </div>
            <div className="text-center sm:text-right font-semibold text-slate-600 dark:text-slate-400">
              Shri Ram Smart Minds Academy • Academic Evaluation Office
            </div>
          </div>
        </section>

      {/* =========================================================================
          PAGE 4: RECOMMENDATIONS (ADAPTED BY PREPARATION LEVEL)
          ========================================================================= */}
      <section
        id="report-page-4"
        className="report-page-container report-page-4 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-7 md:p-8 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
              <GraduationCap className="size-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="inline-flex flex-wrap items-baseline gap-x-1">
                <span className="whitespace-nowrap">Shri Ram</span>
                <span className="whitespace-nowrap">Smart Minds Academy</span>
              </span>
            </span>
            <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5 break-words">
              PAGE 4: RECOMMENDATIONS
            </h2>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs whitespace-nowrap">
              {isTeacherView ? 'PAGE 4 OF 6' : 'PAGE 4 OF 5'}
            </span>
          </div>
        </div>

        {/* Personalized Preparation Level Action Blueprint */}
        {(() => {
          const prepNorm = String(report.levelOfPreparation || '').trim().toLowerCase();
          const isHigh = prepNorm.includes('high achievement') || prepNorm === 'advanced' || (report.briScore ?? 0) >= 70;
          const isMed = !isHigh && (prepNorm.includes('conceptually strong') || prepNorm === 'proficient' || (report.briScore ?? 0) >= 50);

          if (isHigh) {
            return (
              <div className="mt-6 space-y-4">
                {/* Hero Header for High Potential */}
                <div className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/5 p-4 sm:p-5 dark:border-emerald-800/60 dark:from-emerald-950/40 dark:to-teal-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-emerald-600 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                          🏆 Level of Preparation: High Achievement Potential
                        </span>
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          BRI: {report.briScore}/100
                        </span>
                      </div>
                      <h3 className="mt-2 text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        HOW TO MOVE FROM STRONG TO EXCELLENT
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        Your diagnostic performance confirms strong grasp across standard chapters. To reach the top tier and secure 95%+ in Boards, your strategic focus must now shift towards unfamiliar problem varieties, cross-chapter synthesis, and high execution speed under timed pressure.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Action Points */}
                <div className="space-y-3">
                  {/* ① Challenge yourself */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                        ①
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Challenge yourself
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Do not spend all your practice time on questions you can already solve. Regularly include unfamiliar and higher-order problems.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-800">
                            ★ High-Impact: Devote 40%+ of study time to unfamiliar &amp; Competency-based problems
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ② Practise mixed problems */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                        ②
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Practise mixed problems
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Combine concepts from different chapters so that you practise identifying the method, not just applying a memorised formula.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Multi-Concept Synthesis • Identification over Memorisation
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ③ Analyse mistakes deeply */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                        ③
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Analyse mistakes deeply
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          When you make an error, identify exactly where your reasoning broke down and re-solve the problem independently.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            🔍 Root Cause Pinpointing: Never stop at reading the solution — re-derive independently
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ④ Build examination efficiency */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                        ④
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Build examination efficiency
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Continue timed practice so that your accuracy remains high even when working under examination pressure.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            ⚡ Timed Drills: High Pacing Accuracy + Zero Unforced Errors
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⑤ Use Board preparation strategically */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-emerald-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-emerald-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white font-black text-sm shadow-xs">
                        ⑤
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Use Board preparation strategically
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Secure all standard Board-level questions first, then use additional time to strengthen case-based, application-based and higher-order questions.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-100/80 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                            🎯 100% Standard Foundation Locked + High-Yield Competency Focus
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          if (isMed) {
            return (
              <div className="mt-6 space-y-4">
                {/* Hero Header for Conceptually Strong */}
                <div className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-blue-500/5 p-4 sm:p-5 dark:border-blue-800/60 dark:from-blue-950/40 dark:to-indigo-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-blue-600 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                          🎯 Level of Preparation: Conceptually Strong
                        </span>
                        <span className="text-xs font-bold text-blue-800 dark:text-blue-300">
                          BRI: {report.briScore}/100
                        </span>
                      </div>
                      <h3 className="mt-2 text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        TURN YOUR CURRENT PERFORMANCE INTO STRONGER BOARD PREPARATION
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        You have built solid conceptual understanding across core topics. The next critical leap is turning that understanding into dependable exam-style problem solving, higher accuracy under timer conditions, and mastery of multi-step questions.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Action Points */}
                <div className="space-y-3">
                  {/* ① Move beyond direct questions */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                        ①
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Move beyond direct questions
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          For every chapter you study, include application-based and multi-step questions—not only straightforward exercises.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-100/80 px-2.5 py-1 text-xs font-bold text-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                            Action: Complement textbook drills with scenario-based &amp; application questions
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ② Rework every important mistake */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                        ②
                      </span>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Rework every important mistake
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          After a test, first attempt the incorrect question again without seeing the solution. Then identify whether the issue was:
                        </p>
                        <div className="flex flex-wrap gap-2 pt-0.5">
                          <span className="rounded-md border border-rose-300 bg-rose-50 px-2 py-0.5 text-xs font-bold text-rose-800 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
                            • Concept
                          </span>
                          <span className="rounded-md border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                            • Application
                          </span>
                          <span className="rounded-md border border-purple-300 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-800 dark:border-purple-800 dark:bg-purple-950/40 dark:text-purple-300">
                            • Accuracy
                          </span>
                          <span className="rounded-md border border-blue-300 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
                            • Interpretation
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ③ Practise consistently */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                        ③
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Practise consistently
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          A manageable amount of focused practice every day is more valuable than occasional long study sessions.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Consistency Principle: 5–8 high-quality problems daily builds compounding confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ④ Test yourself every 1–2 weeks */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                        ④
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Test yourself every 1–2 weeks
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Use mixed, timed questions to check whether your improvement is carrying across chapters.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Pacing Cadence: 30–45 min bi-weekly mixed chapter assessments
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⑤ Shift towards Board-style practice */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-blue-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-xs">
                        ⑤
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Shift towards Board-style practice
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          As the examination approaches, progressively increase your practice of sample papers, case-based questions and mixed-chapter questions.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-100/80 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                            Board Target: Full sample papers, Assertion-Reason, and Case Study formats
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Case 3: Basic (20 <= BRI < 50)
          if (!isVeryLowPrep) {
            return (
              <div className="mt-6 space-y-4">
                {/* Hero Header for Basic */}
                <div className="rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/5 p-4 sm:p-5 dark:border-amber-800/60 dark:from-amber-950/40 dark:to-orange-950/20">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-amber-500 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-950 shadow-xs">
                          ⚡ Level of Preparation: Basic
                        </span>
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          BRI: {report.briScore}/100
                        </span>
                      </div>
                      <h3 className="mt-2 text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        TURN YOUR GAPS INTO PROGRESS
                      </h3>
                      <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                        A lower starting score is not a setback—it is your clearest roadmap to improvement. By addressing fundamental ideas before memorising formulas, you will see rapid gains in speed, understanding, and exam confidence.
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5 Action Points */}
                <div className="space-y-3">
                  {/* ① Strengthen the basics */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs">
                        ①
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Strengthen the basics
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Revisit the concepts behind the questions you could not solve. Make sure you can explain the idea before memorising the method.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                            Golden Principle: Understand concepts from first principles before memorising steps
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ② Practise a few questions every day */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs">
                        ②
                      </span>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Practise a few questions every day
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Use a simple progression:
                        </p>
                        <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-bold">
                          <span className="rounded-lg bg-emerald-100 px-3 py-1 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                            Basic
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="rounded-lg bg-blue-100 px-3 py-1 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            Standard
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="rounded-lg bg-purple-100 px-3 py-1 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            Application
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          Focus on quality and consistency rather than solving a very large number of questions.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ③ Keep an Error Notebook */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs">
                        ③
                      </span>
                      <div className="flex-1 space-y-2">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Keep an Error Notebook
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          For every important mistake, record:
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm">
                          <div className="rounded-xl border border-slate-200/90 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700/80 transition flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 font-black text-xs dark:bg-slate-800 dark:text-brand-300 border border-brand-200/60 dark:border-slate-700">
                                  1
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight">
                                  What did I get wrong?
                                </span>
                              </div>
                              <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed block pl-6.5">
                                Identify the exact misstep or incorrect formula.
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200/90 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700/80 transition flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 font-black text-xs dark:bg-slate-800 dark:text-brand-300 border border-brand-200/60 dark:border-slate-700">
                                  2
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight">
                                  Why?
                                </span>
                              </div>
                              <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed block pl-6.5">
                                Did I misread, rush, or miss the fundamental idea?
                              </span>
                            </div>
                          </div>
                          <div className="rounded-xl border border-slate-200/90 bg-white/90 p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900/90 dark:hover:border-slate-700/80 transition flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-brand-50 text-brand-700 font-black text-xs dark:bg-slate-800 dark:text-brand-300 border border-brand-200/60 dark:border-slate-700">
                                  3
                                </span>
                                <span className="font-bold text-slate-900 dark:text-slate-100 text-xs sm:text-sm tracking-tight">
                                  What is the correct approach?
                                </span>
                              </div>
                              <span className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed block pl-6.5">
                                Write down the proper reasoning and method.
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ④ Test yourself regularly */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs">
                        ④
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Test yourself regularly
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Take a short mixed test every 1–2 weeks and track whether the same mistakes are recurring.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            Frequency: 15–20 question short mixed test every 7–14 days
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ⑤ Master your prescribed textbook */}
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-amber-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-amber-700/60">
                    <div className="flex items-start gap-3.5">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-slate-950 font-black text-sm shadow-xs">
                        ⑤
                      </span>
                      <div className="flex-1 space-y-1">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                          Master your prescribed textbook
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                          Become confident with examples and exercises before moving extensively to additional or advanced material.
                        </p>
                        <div className="pt-0.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-brand-100/80 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                            Priority Rule: 100% textbook example &amp; exercise mastery first
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Case 4: BRI < 20 — Hope-Giving, Reassuring & Actionable Comeback Blueprint (Concise)
          return (
            <div className="mt-6 space-y-4">
              {/* Hero Header for Foundational Stage (Hope-Giving & Focused) */}
              <div className="rounded-2xl border border-violet-200/90 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-pink-500/5 p-4 sm:p-5 dark:border-violet-800/60 dark:from-violet-950/40 dark:via-purple-950/30 dark:to-pink-950/20">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-gradient-to-r from-violet-600 to-indigo-600 px-2.5 py-0.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider text-white shadow-xs">
                        🌱 Level of Preparation: Foundational
                      </span>
                      <span className="text-xs font-bold text-violet-800 dark:text-violet-300">
                        BRI: {report.briScore}/100
                      </span>
                    </div>
                    <h3 className="mt-2 text-base sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                      START FRESH: BUILD YOUR BOARD CONFIDENCE
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                      A diagnostic test is simply a starting compass, not a limit on what you can achieve. With calm, step-by-step guidance starting from textbook basics, you will see your marks and confidence grow steadily.
                    </p>
                  </div>
                </div>
              </div>

              {/* 5 Action Points — Consistent style & length matching Cases 1, 2, and 3 */}
              <div className="space-y-3">
                {/* ① Reframe your starting baseline */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-violet-700/60">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-sm shadow-xs">
                      ①
                    </span>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Reframe your starting baseline
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        A diagnostic test is simply a tool to identify where to begin, not a measure of what you can achieve. Focus on steady daily progress without exam anxiety.
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-violet-100/80 px-2.5 py-1 text-xs font-extrabold uppercase tracking-wider text-violet-800 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-300/60 dark:border-violet-800">
                          🌱 Mindset Anchor: Every top score starts from zero • Progress begins today
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ② Target quick-win chapters first */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-violet-700/60">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-sm shadow-xs">
                      ②
                    </span>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Target quick-win chapters first
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Focus your initial effort on high-weightage, predictable chapters (such as Real Numbers and Statistics in Maths, and Chemical Reactions and Environment in Science) to lock in initial marks.
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-100/80 px-2.5 py-1 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          🎯 Quick-Win Target: 2–3 core chapters secure your first 20–25 marks
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ③ Master NCERT solved examples by hand */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-violet-700/60">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-sm shadow-xs">
                      ③
                    </span>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Master NCERT solved examples by hand
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Put advanced reference books aside. Practice textbook solved examples line-by-line—writing the formula and given data alone secures valuable step marks in CBSE.
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          ✍️ CBSE Step-Marking: Formula + Given data earns marks on every question
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ④ Keep practice calm and consistent */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-violet-700/60">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-sm shadow-xs">
                      ④
                    </span>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Keep practice calm and consistent
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Avoid long, stressful study sessions. Solving just 3 to 5 simple textbook problems every day builds steady momentum and eliminates fear.
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200/80 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          ⏱️ Consistency Rule: 3–5 solved questions a day creates compounding confidence
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ⑤ Seek guidance without hesitation */}
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-violet-700/60">
                  <div className="flex items-start gap-3.5">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white font-black text-sm shadow-xs">
                      ⑤
                    </span>
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                        Seek guidance without hesitation
                      </h4>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                        Most roadblocks come from minor past gaps that can be resolved quickly. Ask teachers or mentors early—difficult ideas become simple once explained clearly.
                      </p>
                      <div className="pt-0.5">
                        <span className="inline-flex items-center gap-1 rounded-md bg-brand-100/80 px-2.5 py-1 text-xs font-bold text-brand-800 dark:bg-brand-950/60 dark:text-brand-300">
                          🤝 Mentorship: Clearing basic doubts early leads to rapid score jumps
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* A Note For Parents */}
        <div className="mt-8 rounded-2xl border border-indigo-200/90 bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/40 p-5 sm:p-6 dark:border-indigo-900/60 dark:bg-gradient-to-br dark:from-slate-900 dark:via-slate-900/95 dark:to-indigo-950/30 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="flex size-8 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs font-black">
              <Info className="size-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black tracking-tight text-slate-900 dark:text-white">
              A Note For Parents
            </h3>
          </div>
          <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            <p>
              Your child’s report is meant to identify where their preparation stands today—not to label their ability.
            </p>
            {isVeryLowPrep && (
              <div className="rounded-xl border border-violet-200/90 bg-violet-50/80 p-3 text-violet-950 dark:border-violet-800/60 dark:bg-violet-950/40 dark:text-violet-200 leading-relaxed text-xs">
                <span className="font-bold text-violet-900 dark:text-violet-200">A reassuring note for parents: </span>
                An initial diagnostic score under timer pressure is completely normal and not a measure of your child’s capability. With patient encouragement, regular daily practice, and small wins, students from this baseline routinely make fast, significant gains in marks.
              </div>
            )}
            <p>
              The most useful support at this stage is to understand the areas highlighted in the report, encourage regular practice, and help your child maintain consistency without unnecessary pressure or comparison. Every student develops at a different pace. With the right guidance, focused practice and timely feedback, identified gaps can be strengthened significantly.
            </p>
            <p className="font-semibold text-indigo-950 dark:text-indigo-200">
              We hope Shri Ram Smart Minds Academy could provide you and your child a good plan of action for Class X Board Exams. Wish you all the best! You may contact us if you need any further guidance for your child. Thanks!
            </p>
          </div>
        </div>

        {/* Official Academic Seal & Certification Footer */}
        <div className="mt-8 border-t border-slate-200/80 dark:border-slate-800 pt-5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-black text-xs border border-brand-200/50">
              ✓
            </span>
            <div>
              Personalized Growth Blueprint for <strong className="text-slate-800 dark:text-slate-200">{report.studentName}</strong> • {studentDetails?.isFormFilled ? `${studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} ${studentDetails.board || 'CBSE'}` : 'Class X JEE Online Test'}
            </div>
          </div>
          <div className="text-center sm:text-right font-semibold text-slate-600 dark:text-slate-400">
            Shri Ram Smart Minds Academy • Academic Evaluation Office
          </div>
        </div>
      </section>

      <section
        id="report-page-5"
        className="report-page-container report-page-5 relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-3.5 sm:p-5 md:p-6 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800 gap-2">
          <div className="min-w-0 flex-1">
            <span className="text-xs sm:text-xs font-black uppercase tracking-wider text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
              <GraduationCap className="size-4 text-brand-600 dark:text-brand-400 shrink-0" />
              <span className="inline-flex flex-wrap items-baseline gap-x-1">
                <span className="whitespace-nowrap">Shri Ram</span>
                <span className="whitespace-nowrap">Smart Minds Academy</span>
              </span>
            </span>
            <div className="mt-1">
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white break-words">
                PAGE 5: NEED STRUCTURED SUPPORT?
              </h2>
              <p className="mt-1 text-sm font-semibold text-brand-700 dark:text-brand-300 leading-snug">
                We recommend joining our Board Mastery Course to excel in the upcoming Board Exams. Online, Offline and Combined Batches begin from 26th October onwards.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="inline-block rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 shadow-2xs whitespace-nowrap">
              {isTeacherView ? 'PAGE 5 OF 6' : 'PAGE 5 OF 5'}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Top Banner: Why This Course? */}
          <div className="relative overflow-hidden rounded-2xl border border-amber-400/50 bg-slate-950 p-3.5 sm:p-4 text-white shadow-md">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="space-y-1 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-amber-400 px-2 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-950">
                    Why This Course?
                  </span>
                  <span className="text-xs font-bold text-amber-300">
                    SRSMA Class 10 Board Mastery Course
                  </span>
                </div>
                <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                  Knowing a chapter is not enough. Students must learn to solve unfamiliar, application-based questions.
                </h3>
                <p className="text-xs text-amber-200 font-medium italic">
                  SRSMA Way: From knowing the chapter to confidently solving what comes next.
                </p>
              </div>
              <div className="shrink-0 flex flex-col sm:flex-row lg:flex-col gap-2">
                <button
                  type="button"
                  onClick={() => setShowBrochureModal(true)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-400 px-3.5 py-1.5 text-xs font-black text-slate-950 shadow-sm transition hover:bg-amber-300"
                >
                  <FileText className="size-3.5" />
                  View Full Brochure Flyer
                </button>
                <button
                  type="button"
                  onClick={() => handleWhatsAppAction('whatsapp_contact_us')}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-3.5 py-1.5 text-xs font-black text-white shadow-sm transition active:scale-[0.99]"
                >
                  <MessageCircle className="size-3.5" />
                  Contact Us
                </button>
              </div>
            </div>
          </div>

          {/* Two-Column Grid matching brochure layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
            {/* Left Column (5 cols) */}
            <div className="lg:col-span-5 space-y-2.5">
              {/* The Class X Gap */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  The Class X Gap
                </h4>
                {/* Visual Pipeline */}
                <div className="grid grid-cols-2 gap-1.5 text-[11px] font-bold text-center">
                  <div className="rounded-lg bg-amber-300/80 text-slate-900 p-1.5 flex items-center justify-center">
                    School teaches the chapter
                  </div>
                  <div className="rounded-lg bg-amber-200/80 text-slate-900 p-1.5 flex items-center justify-center">
                    Basic examples understood
                  </div>
                  <div className="rounded-lg bg-slate-700 text-white p-1.5 flex items-center justify-center">
                    Routine questions done
                  </div>
                  <div className="rounded-lg bg-slate-950 text-amber-300 p-1.5 flex items-center justify-center border border-amber-400">
                    Unfamiliar feels difficult
                  </div>
                </div>

                {/* Quotes */}
                <div className="space-y-1 text-xs text-slate-700 dark:text-slate-300 italic leading-snug">
                  <p className="rounded-lg bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/60">
                    “I know the formula… but don’t know when to use it.”
                  </p>
                  <p className="rounded-lg bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/60">
                    “I understood the chapter… but can’t solve a new question.”
                  </p>
                  <p className="rounded-lg bg-white p-1.5 border border-slate-200 dark:border-slate-800 dark:bg-slate-950/60">
                    “I can score in familiar tests… but lose marks in tougher papers.”
                  </p>
                </div>

                <div className="rounded-xl bg-slate-950 p-2 text-center text-xs font-black text-amber-400 border border-amber-400/50">
                  SRSMA BOARD MASTERY COURSE CLOSES THIS GAP!
                </div>
              </div>

              {/* Ideal For Students Who */}
              <div className="rounded-2xl border border-slate-200 bg-slate-950 p-3 sm:p-3.5 text-white space-y-2 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <div className="size-1.5 rounded-full bg-amber-400" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                    This Programme Is Ideal For Students Who:
                  </h4>
                </div>
                <ul className="space-y-1.5 text-xs text-slate-100 font-medium">
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-amber-400 shrink-0" />
                    <span>Have conceptual gaps</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-amber-400 shrink-0" />
                    <span>Want to improve Board marks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-amber-400 shrink-0" />
                    <span>Find Maths or Science difficult</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-amber-400 shrink-0" />
                    <span>Want structured preparation outside school</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="size-3.5 text-amber-400 shrink-0" />
                    <span>Want stronger fundamentals before Class XI</span>
                  </li>
                </ul>
                <div className="rounded-lg bg-amber-400/20 border border-amber-400/40 p-1.5 text-[11px] sm:text-xs font-bold text-amber-300 text-center leading-snug">
                  Especially valuable for students who plan to choose MPC / BiPC after Class X
                </div>
              </div>

              {/* The Four Pillars */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 sm:p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-900/60">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  The Four Pillars Of This Course
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-white mb-0.5">
                      <Brain className="size-3.5 text-rose-500 shrink-0" />
                      <span>Concept Clarity</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      Identify weak fundamentals and rebuild them from the ground up.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-white mb-0.5">
                      <BookOpen className="size-3.5 text-blue-500 shrink-0" />
                      <span>Deep Practice</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      Move from basic → application → higher-order → Board-level questions.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-white mb-0.5">
                      <Target className="size-3.5 text-amber-500 shrink-0" />
                      <span>Performance Feedback</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      Tests reveal exactly where the student is losing marks — and what to improve.
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-950">
                    <div className="flex items-center gap-1 font-bold text-xs text-slate-900 dark:text-white mb-0.5">
                      <Zap className="size-3.5 text-emerald-500 shrink-0" />
                      <span>Exam Skills</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-tight">
                      Learn to approach questions, manage time &amp; present answers effectively.
                    </p>
                  </div>
                </div>
              </div>

              {/* Enroll Now CTA Button */}
              <div>
                <button
                  type="button"
                  onClick={() => handleWhatsAppAction('whatsapp_enroll_now')}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-2.5 px-4 text-xs sm:text-sm shadow-md transition-all active:scale-[0.99]"
                >
                  <MessageCircle className="size-4" />
                  <span>Enroll Now via WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Right Column (7 cols) */}
            <div className="lg:col-span-7 space-y-2.5">
              {/* The 100 Hour Roadmap */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                      The 100 Hour Roadmap
                    </h4>
                    <p className="text-xs font-bold text-brand-600 dark:text-brand-400">
                      100 hours. 12 weeks. One clear goal.
                    </p>
                  </div>
                </div>

                {/* Phase 1: Understand */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-blue-600" />
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        1. UNDERSTAND
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-slate-500 tracking-wider">
                      CLOSE THE GAPS (Only Maths &amp; Science)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-600 text-xs">01</span>
                      <span>Strengthen weak fundamentals</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-600 text-xs">02</span>
                      <span>Understand concepts from first principles</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-600 text-xs">03</span>
                      <span>Learn the why, not just the formula</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-blue-600 text-xs">04</span>
                      <span>Connect concepts across chapters</span>
                    </div>
                    <div className="flex items-center gap-1.5 sm:col-span-2">
                      <span className="font-mono font-bold text-blue-600 text-xs">05</span>
                      <span>Develop clear methods for solving problems</span>
                    </div>
                  </div>
                </div>

                {/* Phase 2: Master */}
                <div className="rounded-xl border border-amber-300/80 bg-amber-50/50 p-2.5 space-y-2 text-slate-900 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider">
                        2. MASTER
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-amber-700 dark:text-amber-300 tracking-wider">
                      PRACTISE. APPLY. SOLVE.
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs">
                    <div className="rounded-lg bg-white/90 p-2 border border-amber-200/80 dark:bg-slate-900/80 dark:border-amber-900/50 shadow-2xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">1. BASIC</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Build confidence with Concept-First questions</div>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 border border-amber-200/80 dark:bg-slate-900/80 dark:border-amber-900/50 shadow-2xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">2. APPLICATION</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Apply ideas to unfamiliar, Exam-Style problems</div>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 border border-amber-200/80 dark:bg-slate-900/80 dark:border-amber-900/50 shadow-2xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">3. HIGHER-ORDER</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Develop thinking needed for Competency based questions</div>
                    </div>
                    <div className="rounded-lg bg-white/90 p-2 border border-amber-200/80 dark:bg-slate-900/80 dark:border-amber-900/50 shadow-2xs">
                      <div className="font-bold text-amber-800 dark:text-amber-300 text-xs">4. BOARD PATTERN</div>
                      <div className="text-[11px] text-slate-700 dark:text-slate-300 mt-0.5">Practise the PYQs that matter the most in Boards</div>
                    </div>
                  </div>
                  <div className="text-center text-[11px] text-amber-800/90 dark:text-amber-300/90 font-semibold pt-0.5">
                    • Build Confidence • Apply Concepts • Master Board Patterns
                  </div>
                </div>

                {/* Phase 3: Perform */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 space-y-2 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full bg-emerald-600" />
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        3. PERFORM
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">
                      TEST. ANALYSE. IMPROVE.
                    </span>
                  </div>
                  <div className="rounded-lg bg-emerald-600/10 border border-emerald-500/20 p-1.5 flex items-center justify-between text-xs">
                    <span className="font-black text-emerald-900 dark:text-emerald-200">
                      6 FULL-LENGTH MOCK TESTS
                    </span>
                    <span className="font-bold text-emerald-700 dark:text-emerald-300 text-[11px]">
                      3 MATHS + 3 SCIENCE
                    </span>
                  </div>
                  {/* Flow */}
                  <div className="flex flex-wrap items-center justify-center gap-1 text-[11px] font-black text-slate-700 dark:text-slate-300">
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">ATTEMPT</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">ANALYSE</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">IDENTIFY MISTAKES</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800">CORRECT</span>
                    <span>→</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-white">IMPROVE</span>
                  </div>
                  <div className="text-center text-[10px] sm:text-[11px] text-slate-500 dark:text-slate-400">
                    • Speed • Accuracy • Time Management • Answer Presentation • Exam Strategy
                  </div>
                </div>

                <div className="rounded-xl bg-amber-400 p-2 text-center text-xs font-black text-slate-950 shadow-xs">
                  NOT 100 HOURS OF LECTURES. IT’S 100 HOURS OF GUIDED PREPARATION!
                </div>
              </div>

              {/* Star Faculty Guiding Your Child */}
              <div className="rounded-2xl border border-slate-200 bg-white p-3 sm:p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-900 shadow-xs">
                <div>
                  <div className="text-[10px] sm:text-[11px] font-extrabold uppercase tracking-wider text-teal-900 dark:text-amber-300">
                    NOT 100 HOURS OF LECTURES. IT&apos;S 100 HOURS OF GUIDED PREPARATION!
                  </div>
                  <h4 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white mt-0.5">
                    STAR FACULTY GUIDING YOUR CHILD
                  </h4>
                  <div className="mt-1 h-0.5 w-full bg-teal-900/20 dark:bg-slate-700" />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 items-end text-center pt-1">
                  {/* Amal M Das */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="relative size-12 sm:size-14 rounded-full overflow-hidden border-2 border-amber-400 mb-1 shadow-xs bg-amber-50">
                      <img
                        src="/board-challenge/faculty_amal.webp"
                        alt="Mr. Amal M Das"
                        className="size-full object-cover object-center"
                      />
                    </div>
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-xs">
                      MR. AMAL M DAS
                    </span>
                    <div className="mt-1 flex flex-col space-y-0.5">
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        B.Tech, IIT KGP
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-teal-800 dark:text-teal-400 leading-tight">
                        Program Coordinator
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-teal-800 dark:text-teal-400 leading-tight">
                        Maths HOD
                      </span>
                    </div>
                  </div>

                  {/* Brajesh */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="relative size-12 sm:size-14 rounded-full overflow-hidden border-2 border-amber-400 mb-1 shadow-xs bg-amber-50">
                      <img
                        src="/board-challenge/faculty_brajesh.webp"
                        alt="Mr. Brajesh"
                        className="size-full object-cover object-center"
                      />
                    </div>
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-xs">
                      MR. BRAJESH
                    </span>
                    <div className="mt-1 flex flex-col space-y-0.5">
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        B.Tech, IIT Madras
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-teal-800 dark:text-teal-400 leading-tight">
                        Physics HOD
                      </span>
                    </div>
                  </div>

                  {/* Ninad */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="relative size-12 sm:size-14 rounded-full overflow-hidden border-2 border-amber-400 mb-1 shadow-xs bg-amber-50">
                      <img
                        src="/board-challenge/faculty_ninad.webp"
                        alt="Mr. Ninad"
                        className="size-full object-cover object-center"
                      />
                    </div>
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-xs">
                      MR. NINAD
                    </span>
                    <div className="mt-1 flex flex-col space-y-0.5">
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        B.Tech, IIT Madras
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-teal-800 dark:text-teal-400 leading-tight">
                        Chemistry HOD
                      </span>
                    </div>
                  </div>

                  {/* Thirumala */}
                  <div className="flex flex-col items-center justify-end">
                    <div className="relative size-12 sm:size-14 rounded-full overflow-hidden border-2 border-amber-400 mb-1 shadow-xs bg-amber-50">
                      <img
                        src="/board-challenge/faculty_thirumala.webp"
                        alt="Mr. Thirumala"
                        className="size-full object-cover object-center"
                      />
                    </div>
                    <span className="rounded bg-amber-400 px-2 py-0.5 text-[9px] sm:text-[10px] font-black uppercase tracking-wide text-slate-950 shadow-xs">
                      MR. THIRUMALA
                    </span>
                    <div className="mt-1 flex flex-col space-y-0.5">
                      <span className="text-[10.5px] sm:text-[11px] font-bold text-slate-800 dark:text-slate-200">
                        M.Tech, NIT Warangal
                      </span>
                      <span className="text-[10px] sm:text-[10.5px] font-medium text-teal-800 dark:text-teal-400 leading-tight">
                        Maths Faculty
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Official Academic Seal & Certification Footer */}
        <div className="mt-5 border-t border-slate-200/80 dark:border-slate-800 pt-3.5 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-5 sm:size-6 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 font-black text-xs border border-brand-200/50">
              ✓
            </span>
            <div>
              Academic Mentorship Pathway for <strong className="text-slate-800 dark:text-slate-200">{report.studentName}</strong> • {studentDetails?.isFormFilled ? `${studentDetails.classLevel ? `Class ${studentDetails.classLevel}` : 'Class X'} ${studentDetails.board || 'CBSE'}` : 'Class X JEE Online Test'}
            </div>
          </div>
          <div className="text-center sm:text-right font-semibold text-slate-600 dark:text-slate-400">
            Shri Ram Smart Minds Academy • Academic Mentorship Cell
          </div>
        </div>

        {/* Action Button after Page 5: Go to Solutions Tab */}
        {onGoToSolutions && (
          <div className="mt-8 rounded-2xl border-2 border-brand-500/30 bg-gradient-to-r from-brand-50/90 via-indigo-50/50 to-teal-50/60 p-4 sm:p-5 dark:border-brand-500/40 dark:bg-gradient-to-r dark:from-slate-900 dark:via-brand-950/40 dark:to-slate-900 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 dark:bg-brand-950 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                Diagnostic Report Review Complete
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                Ready to review question derivations and faculty solutions?
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Jump directly to the Solutions tab to view question-by-question analysis, answer keys, and timing audit.
              </p>
            </div>
            <Button
              type="button"
              onClick={onGoToSolutions}
              className="shrink-0 w-full sm:w-auto rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-black px-5 py-2.5 shadow-md transition flex items-center justify-center gap-2 text-xs sm:text-sm"
            >
              <span>Go to Solutions Tab</span>
              <ArrowRight className="size-4" />
            </Button>
          </div>
        )}
      </section>

      {/* =========================================================================
          PAGE 6: DIAGNOSTIC AUDIT & STEP-BY-STEP CALCULATIONS (DEVELOPMENT ONLY)
          ========================================================================= */}
      {isTeacherView && report.calculationSteps && (
        <section
          id="report-page-6"
          className="report-page-container report-page-6 relative overflow-hidden rounded-3xl border border-amber-300 bg-white p-4 sm:p-8 shadow-sm transition dark:border-amber-700/60 dark:bg-slate-900 block scroll-mt-56 sm:scroll-mt-52 md:scroll-mt-48"
        >
          {/* Header watermark & Brand bar */}
          <div className="flex items-center justify-between border-b border-amber-200 pb-4 dark:border-amber-900/60 gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Diagnostic Audit Engine
                </span>
                <span className="rounded bg-amber-100 px-2.5 py-0.5 text-xs font-black uppercase tracking-wider text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Teacher View
                </span>
              </div>
              <h2 className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white mt-1.5 break-words">
                PAGE 6: DIAGNOSTIC AUDIT &amp; STEP-BY-STEP CALCULATIONS
              </h2>
            </div>
            <div className="text-right shrink-0">
              <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-black text-amber-800 dark:text-amber-300 border border-amber-500/30">
                PAGE 6 OF 6
              </span>
              <p className="mt-1 text-xs text-slate-400 hidden sm:block">Faculty Audit Ledger</p>
            </div>
          </div>

          {/* Dev Mode Explanatory Notice */}
          <div className="mt-6 rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50/80 via-yellow-50/50 to-orange-50/40 p-4 dark:border-amber-900/40 dark:from-amber-950/30 dark:via-yellow-950/20 dark:to-orange-950/20">
            <div className="flex items-start gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950 font-bold">
                <Wrench className="size-4" />
              </div>
              <div className="space-y-1 text-xs">
                <div className="font-bold text-amber-900 dark:text-amber-200">
                  Development Audit Trail &amp; Verification
                </div>
                <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                  This page documents all raw sums, diagnostic weights ($W_i$), step-by-step percentage formulas, and individual question audit traces.
                  Designed to verify computations against specifications; this page can be toggled or removed for final production.
                </p>
              </div>
            </div>
          </div>

          {/* Executive Diagnostic Scorecard — All Master Scores in One Glance */}
          <div className="mt-6 rounded-2xl border border-amber-200/90 bg-gradient-to-br from-amber-50/70 via-white to-orange-50/40 p-5 shadow-xs dark:border-amber-800/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-amber-950/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-amber-200/60 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="size-4 text-amber-700 dark:text-amber-400" />
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                  Master Diagnostic Scorecard &amp; Key Evaluation Metrics
                </h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                Summary of all evaluated diagnostic axes
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {/* BRI Score */}
              <div className="rounded-xl border border-brand-200/80 bg-brand-50/50 p-3 dark:border-brand-900/40 dark:bg-brand-950/20">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  BRI Index
                </span>
                <div className="mt-1 text-xl font-black text-brand-700 dark:text-brand-300 tnum">
                  {report.briScore}%
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {report.levelOfPreparation}
                </p>
              </div>

              {/* Raw Marks */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Raw Score
                </span>
                <div className="mt-1 text-xl font-black text-slate-900 dark:text-white tnum">
                  {report.totalRawScore} / {report.totalQuestions}
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {Math.round((report.totalRawScore / report.totalQuestions) * 100)}% unweighted
                </p>
              </div>

              {/* Accuracy */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Accuracy
                </span>
                <div className="mt-1 text-xl font-black text-emerald-600 dark:text-emerald-400 tnum">
                  {report.skills.accuracy.scorePercent}%
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {report.skills.accuracy.correctCount} of {report.skills.accuracy.attemptedCount} att.
                </p>
              </div>

              {/* TMS */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  TMS Pacing
                </span>
                <div className="mt-1 text-xl font-black text-indigo-600 dark:text-indigo-400 tnum">
                  {report.timeManagement.finalScorePercent}%
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {report.timeManagement.rating}
                </p>
              </div>

              {/* Maths & Science */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Subject Scores
                </span>
                <div className="mt-1 flex items-baseline gap-1.5 font-mono text-sm font-black text-slate-900 dark:text-white">
                  <span>M: {report.breakdown.mathematics.percentage}%</span>
                  <span>•</span>
                  <span>S: {report.breakdown.science.percentage}%</span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  Maths vs Science
                </p>
              </div>

              {/* Strengths / Gaps Count */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-800/50">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Identified Gaps
                </span>
                <div className="mt-1 flex items-baseline gap-2 font-mono text-sm font-black">
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {report.strengths.length} Str.
                  </span>
                  <span>•</span>
                  <span className={report.priorityGaps.length > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}>
                    {report.priorityGaps.length} Weak.
                  </span>
                </div>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                  {report.priorityGaps.length === 0 ? 'Excellence achieved' : 'Action items'}
                </p>
              </div>
            </div>
          </div>

          {/* 1. Scoring & BRI Derivation */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-black">
                <Calculator className="size-4" />
              </div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                1. Scoring &amp; Board Readiness Index (BRI) Derivation
              </h3>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Questions (N)</span>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white tnum">
                  {report.calculationSteps.scoring.totalQuestionsN}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Total items evaluated</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Raw Score Sum (Σ S_i)</span>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white tnum">
                  {report.calculationSteps.scoring.rawScoreSum} / {report.calculationSteps.scoring.totalQuestionsN}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">1 mark per correct answer</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Diagnostic Weight (Σ W_i)</span>
                <div className="mt-2 text-2xl font-black text-indigo-600 dark:text-indigo-400 tnum">
                  {report.calculationSteps.scoring.diagnosticWeightSum}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Sum of all question weights</p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Earned Weighted Score</span>
                <div className="mt-2 text-2xl font-black text-emerald-600 dark:text-emerald-400 tnum">
                  {report.calculationSteps.scoring.weightedScoreSum}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">Σ (S_i × W_i)</p>
              </div>
            </div>

            {/* BRI Calculation Box */}
            <div className="rounded-2xl border border-brand-200 bg-brand-50/40 p-5 dark:border-brand-900/40 dark:bg-brand-950/20">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300">
                    BRI Formula &amp; Step-by-Step Fraction:
                  </div>
                  <div className="font-mono text-xs bg-white/80 p-3 rounded-lg border border-brand-200/60 dark:bg-slate-900/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    BRI = ( Σ(S_i × W_i) / Σ(W_i) ) × 100%
                    <br />
                    BRI = {report.calculationSteps.scoring.briFraction}
                    <br />
                    <strong className="text-brand-700 dark:text-brand-400">
                      BRI = {report.calculationSteps.scoring.briResult}%
                    </strong>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-bold uppercase tracking-wider text-brand-900 dark:text-brand-300">
                    Preparation Level Classification Rule:
                  </div>
                  <div className="font-mono text-xs bg-white/80 p-3 rounded-lg border border-brand-200/60 dark:bg-slate-900/80 dark:border-slate-800 text-slate-800 dark:text-slate-200">
                    {report.calculationSteps.scoring.levelRule}
                    <div className="mt-2 flex items-center gap-2 font-sans font-bold">
                      <span>Evaluated Result:</span>
                      {getPrepLevelBadge(report.calculationSteps.scoring.levelResult).label}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Area, Science Discipline & Difficulty Breakdown Derivations */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-brand-600 text-white text-xs font-black">
                <Layers className="size-4" />
              </div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                2. Area, Science Discipline &amp; Difficulty Breakdown Derivations
              </h3>
            </div>

            {/* 2.1 Core Areas & Difficulty */}
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Dimension</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Filter Condition</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Matching Qs</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Score / Total</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Formula &amp; Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.breakdowns.map((b) => (
                    <TableRow key={b.area}>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                        {b.area}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400">
                        {b.filterCondition}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {b.matchingQuestions.map((q) => (
                            <span key={q} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Q{q}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tnum text-xs text-slate-800 dark:text-slate-200">
                        {b.score} / {b.total}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                        {b.formula}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* 2.2 Science Sub-Disciplines Breakdown */}
            {report.calculationSteps.scienceDisciplineBreakdowns && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Science Sub-Disciplines Breakdown (Physics, Chemistry, Biology)
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400">Itemized Science scores</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Discipline</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Matching Qs</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Score / Total</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Formula</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Percentage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.calculationSteps.scienceDisciplineBreakdowns.map((sd) => (
                        <TableRow key={sd.discipline}>
                          <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                            {sd.discipline}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {sd.matchingQuestions.map((q) => (
                                <span key={q} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                  Q{q}
                                </span>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-bold tnum text-xs text-slate-800 dark:text-slate-200">
                            {sd.score} / {sd.total}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {sd.formula}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                            {sd.percentage}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* 2.3 Subject × Difficulty Cross-Tabulation */}
            {report.calculationSteps.subjectDifficultyMatrix && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Subject × Difficulty Cross-Tabulation
                  </h4>
                  <span className="text-[11px] font-medium text-slate-400">Easy vs Medium vs Difficult across Mathematics and Science</span>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Subject</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Difficulty Tier</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Score / Total</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Formula</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Accuracy %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.calculationSteps.subjectDifficultyMatrix.map((m) => (
                        <TableRow key={`${m.subject}-${m.difficulty}`}>
                          <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                            {m.subject}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                              m.difficulty === 'Easy'
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : m.difficulty === 'Medium'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                            }`}>
                              {m.difficulty}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-bold tnum text-xs text-slate-800 dark:text-slate-200">
                            {m.score} / {m.total}
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {m.formula}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                            {m.percentage}%
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* 3. Primary Cognitive Skills & Accuracy Derivations */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
              3. Primary Cognitive Skills &amp; Accuracy Derivations
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Skill Dimension</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Filter Logic</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Matching Qs</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Earned W / Total W</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Formula &amp; %</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Category Assigned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.skills.map((s) => (
                    <TableRow key={s.skillName}>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                        {s.skillName}
                      </TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-xs truncate">
                        {s.filterCondition}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {s.matchingQuestions.map((q) => (
                            <span key={q} className="rounded bg-slate-100 px-1 py-0.2 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Q{q}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tnum text-xs text-slate-800 dark:text-slate-200">
                        {s.earnedWeights} / {s.totalWeights}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                        {s.formula}
                      </TableCell>
                      <TableCell className="text-center">
                        {getSkillCategoryBadge(s.categoryResult)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 4. Question Structure Derivations */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
              4. Question Structure Performance Derivations
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Structure Type</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Matching Qs</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Correct / Total</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Formula &amp; %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.structures.map((st) => (
                    <TableRow key={st.structureType}>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                        {st.structureType}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {st.matchingQuestions.length > 0 ? (
                            st.matchingQuestions.map((q) => (
                              <span key={q} className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                Q{q}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">None tested</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold tnum text-xs text-slate-800 dark:text-slate-200">
                        {st.correctCount} / {st.totalCount}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                        {st.formula}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 5. Strengths Derivation & Ranking Audit */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-black">
                <Sparkles className="size-4" />
              </div>
              <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                5. Strengths Derivation &amp; Ranking Audit
              </h3>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="w-12 text-center text-xs font-bold uppercase tracking-wider">Rank</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Strength Area</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Classification Tier</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Score %</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Evaluated Evidence &amp; Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.strengthsRanking.map((s) => {
                    const isCore = s.percentage >= 70;
                    return (
                      <TableRow key={s.rank}>
                        <TableCell className="text-center font-bold text-xs">
                          <span className="flex size-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-black mx-auto">
                            #{s.rank}
                          </span>
                        </TableCell>
                        <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                          {s.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                            isCore
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300/40'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-300/40'
                          }`}>
                            {s.tag || (isCore ? 'Verified Core Strength' : 'Areas with Most Potential')}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          {s.percentage}%
                        </TableCell>
                        <TableCell className="text-xs text-slate-600 dark:text-slate-300 max-w-md">
                          {s.reason}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 6. Weakness Engine Evaluation Matrix & Priority Gaps Audit */}
          <div className="mt-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-rose-600 text-white text-xs font-black">
                  <Target className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                    6. Weakness Engine Evaluation Matrix &amp; Priority Gaps Audit
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Faculty audit of all 9 diagnostic weakness labels, thresholds (&lt; 50%), mutual exclusion pairs, and final priority gap assignments.
                  </p>
                </div>
              </div>
            </div>

            {/* 6.1 Priority Gaps Audit (Final Selected Weaknesses) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <AlertTriangle className="size-3.5 text-rose-500" />
                  6.1 Selected Priority Gaps (Final Weaknesses on Page 3)
                </h4>
                <span className="text-[11px] font-semibold text-slate-400">
                  {report.calculationSteps.priorityGapsRanking.length} Priority Gap{report.calculationSteps.priorityGapsRanking.length === 1 ? '' : 's'} Selected
                </span>
              </div>

              {report.calculationSteps.priorityGapsRanking.length === 0 ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20 flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-slate-950 font-bold">
                    <CheckCircle2 className="size-5" />
                  </div>
                  <div className="text-xs">
                    <strong className="text-emerald-900 dark:text-emerald-300 font-bold block">
                      Faculty Audit Confirmation: Zero Weakness Areas Detected (&lt; 50%)
                    </strong>
                    <span className="text-emerald-800/90 dark:text-emerald-400">
                      All evaluated syllabus categories scored 50% or above. The student achieved the academic excellence benchmark across all evaluated dimensions.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {report.calculationSteps.priorityGapsRanking.map((g) => (
                    <div
                      key={g.rank}
                      className="rounded-2xl border border-rose-200/80 bg-gradient-to-br from-white to-rose-50/40 p-4 shadow-xs dark:border-rose-900/40 dark:from-slate-900 dark:to-rose-950/20"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400">#{g.rank} Priority Focus</span>
                        {getPriorityBadge(g.priority)}
                      </div>
                      <h5 className="mt-2 text-sm font-black text-slate-900 dark:text-white">
                        {formatWeaknessName(g.name)}
                      </h5>
                      <div className="mt-2 flex items-center justify-between">
                        <EcommerceStarRating rating={Math.round((g.scorePercent / 100) * 5 * 10) / 10} align="start" />
                        <span className="font-mono text-xs font-black text-rose-700 dark:text-rose-400">
                          {g.scorePercent}%
                        </span>
                      </div>
                      <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                        <strong>Trigger:</strong> {g.ruleApplied}
                      </div>
                      {g.message && (
                        <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                          &ldquo;{g.message}&rdquo;
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 6.2 Complete 9-Label Weakness Engine Matrix (All Evaluated Values) */}
            {report.calculationSteps.allWeaknessEvaluations && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    6.2 Complete 9-Label Weakness Evaluation Engine Matrix (All Values)
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Full Evaluation Ledger &bull; 9 Engine Labels + Fallback Pacing
                  </span>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Weakness Dimension</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Category Type</TableHead>
                        <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Evaluated Value</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Diagnostic Formula / Base</TableHead>
                        <TableHead className="text-xs font-bold uppercase tracking-wider">Threshold Rule</TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Trigger Status</TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Priority Band</TableHead>
                        <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Selection Outcome</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.calculationSteps.allWeaknessEvaluations.map((w) => {
                        const isSelected = w.status === 'Selected Priority Gap';
                        const isSuppressed = w.status.includes('Suppressed');
                        const isMet = w.status === 'Benchmark Met (>= 50%)';

                        return (
                          <TableRow
                            key={w.id}
                            className={
                              isSelected
                                ? 'bg-rose-50/40 dark:bg-rose-950/20'
                                : isSuppressed
                                  ? 'bg-amber-50/30 dark:bg-amber-950/15'
                                  : undefined
                            }
                          >
                            <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                              <div>{formatWeaknessName(w.name)}</div>
                              <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                {w.triggerReason}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400 text-xs font-medium">
                              {w.categoryType}
                            </TableCell>
                            <TableCell className="text-right font-mono font-bold text-xs tnum">
                              <span
                                className={
                                  w.evaluatedScore < 50
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-emerald-600 dark:text-emerald-400'
                                }
                              >
                                {w.evaluatedScore}%
                              </span>
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-600 dark:text-slate-400 max-w-xs">
                              {w.formula}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] text-slate-700 dark:text-slate-300">
                              {w.thresholdCondition}
                            </TableCell>
                            <TableCell className="text-center">
                              {w.isTriggered ? (
                                <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                                  <AlertTriangle className="size-3" /> Deficit Triggered
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  <Check className="size-3" /> Benchmark Met
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {w.priority === 'Benchmark Met (>= 50%)' ? (
                                <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                                  &ge; 50% Satisfied
                                </span>
                              ) : (
                                getPriorityBadge(w.priority as PriorityLevel)
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              {isSelected ? (
                                <span className="inline-block rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-extrabold text-white shadow-2xs">
                                  Selected #{w.selectedRank}
                                </span>
                              ) : isSuppressed ? (
                                <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                  {w.status}
                                </span>
                              ) : isMet ? (
                                <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                                  No Deficit (&ge; 50%)
                                </span>
                              ) : (
                                <span className="text-[11px] text-slate-400">Not Triggered</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>

          {/* 7. Time Management & Pacing Derivations (TMS) */}
          {report.calculationSteps.timeManagement && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-black">
                  <Clock className="size-4" />
                </div>
                <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                  7. Time Management &amp; Pacing Derivations (TMS)
                </h3>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Scoring Formula</span>
                    <p className="mt-1 font-mono text-xs font-bold text-slate-900 dark:text-white">
                      TMS (%) = (Σ (Qi × Wi) / Σ Wi) * 100
                    </p>
                    <p className="mt-1 text-xs text-brand-600 dark:text-brand-400 font-bold">
                      {report.calculationSteps.timeManagement.formula} = {report.calculationSteps.timeManagement.finalScorePercent}%
                    </p>
                    <p className="mt-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                      t_est = Mean of Lowerbound &amp; Upperbound
                    </p>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Piecewise Qi Rules</span>
                    <ul className="mt-1 space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      <li>• Correct, r ≤ 1.0: <strong className="text-emerald-600">Efficient Mastery (1.0)</strong></li>
                      <li>• Correct, r &gt; 1.0: <strong className="text-teal-600">Over-Invested (max 0.25, 1/r)</strong></li>
                      <li>• Incorrect, r &lt; 0.70: <strong className="text-amber-600">Careless Rushing</strong></li>
                      <li>• Incorrect, 0.70-1.30: <strong className="text-blue-600">Disciplined Attempt (0.50)</strong></li>
                      <li>• Incorrect, r &gt; 1.30: <strong className="text-rose-600">Time Trap</strong></li>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Classification &amp; Flags</span>
                    <div className="mt-1 flex items-center gap-2">
                      {getTimeManagementBadge(report.calculationSteps.timeManagement.ratingResult)}
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {report.calculationSteps.timeManagement.finalScorePercent}%
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">
                      ≥85% Optimal | 70-84% Good | 50-69% Moderate | &lt;50% Needs Intervention
                    </p>
                    {report.calculationSteps.timeManagement.guessworkQuestions.length > 0 ? (
                      <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-300 font-semibold">
                        ⚠️ Guesswork: Q{report.calculationSteps.timeManagement.guessworkQuestions.join(', Q')} (&lt;8s)
                      </p>
                    ) : (
                      <p className="mt-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        ✓ No guesswork flags (&lt;8s)
                      </p>
                    )}
                  </div>
                </div>

                {/* Detailed Category Count Badges */}
                {report.calculationSteps.timeManagement.categoryCounts && (
                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                      Behavioral Distribution:
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      Efficient Mastery: {report.calculationSteps.timeManagement.categoryCounts['EFFICIENT_MASTERY'] || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1 text-[11px] font-bold text-teal-800 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800/50">
                      Over-Invested: {report.calculationSteps.timeManagement.categoryCounts['OVER_INVESTED_SUCCESS'] || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-800 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                      Disciplined Attempt: {report.calculationSteps.timeManagement.categoryCounts['DISCIPLINED_ATTEMPT'] || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      Careless Rushing: {report.calculationSteps.timeManagement.categoryCounts['CARELESS_RUSHING'] || 0}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-800 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                      Time Trap: {report.calculationSteps.timeManagement.categoryCounts['TIME_TRAP'] || 0}
                    </span>
                    {(report.calculationSteps.timeManagement.categoryCounts['UNATTEMPTED'] || 0) > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        Unattempted: {report.calculationSteps.timeManagement.categoryCounts['UNATTEMPTED']}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. Chapter Score & Priority Classification Audit */}
          <div className="mt-8 space-y-3">
            <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
              8. Chapter Score &amp; Priority Classification Audit
            </h3>
            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Chapter Name</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Subject</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Score / Total</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Accuracy %</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Priority Classification</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.allChapterScores.map((c) => (
                    <TableRow key={`${c.subject}-${c.chapter}`}>
                      <TableCell className="font-bold text-slate-900 dark:text-white text-xs">
                        {c.chapter}
                      </TableCell>
                      <TableCell className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        {c.subject}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-slate-800 dark:text-slate-200">
                        {c.correct} / {c.total}
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-xs text-brand-700 dark:text-brand-400">
                        {c.percentage}%
                      </TableCell>
                      <TableCell className="text-center">
                        {getPriorityBadge(c.priority)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* 9. Full Question-by-Question Diagnostic Audit */}
          <div className="mt-8 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-sm font-black tracking-wider uppercase text-slate-900 dark:text-white">
                  9. Full Question-by-Question Audit Table ({report.calculationSteps.questionAudit.length} Questions)
                </h3>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  Itemized record of responses, time taken, time limits, weights, and revisit classifications:
                </p>
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setAuditFilter('all')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${auditFilter === 'all'
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  All ({report.calculationSteps.questionAudit.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('incorrect')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${auditFilter === 'incorrect'
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  Incorrect ({report.calculationSteps.questionAudit.filter((q) => !q.isCorrect).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('overtime')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${auditFilter === 'overtime'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  Overtime ({report.calculationSteps.questionAudit.filter((q) => q.timeLimitExceeded).length})
                </button>
                <button
                  type="button"
                  onClick={() => setAuditFilter('revisit')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${auditFilter === 'revisit'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                >
                  Revisit Flags ({report.calculationSteps.questionAudit.filter((q) => Boolean(q.revisitCategory)).length})
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white overflow-x-auto dark:border-slate-800 dark:bg-slate-900">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50/80 dark:bg-slate-800/50">
                    <TableHead className="w-10 text-center text-xs font-bold uppercase tracking-wider">Q#</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Subject &amp; Chapter</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Diff &amp; Skill</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Weight (W_i)</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Time (Actual vs ETS)</TableHead>
                    <TableHead className="text-center text-xs font-bold uppercase tracking-wider">Answer / Key</TableHead>
                    <TableHead className="text-right text-xs font-bold uppercase tracking-wider">Weighted Score</TableHead>
                    <TableHead className="text-xs font-bold uppercase tracking-wider">Revisit Trigger</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.calculationSteps.questionAudit
                    .filter((item) => {
                      if (auditFilter === 'incorrect') return !item.isCorrect;
                      if (auditFilter === 'overtime') return item.timeLimitExceeded;
                      if (auditFilter === 'revisit') return Boolean(item.revisitCategory);
                      return true;
                    })
                    .map((item) => (
                      <TableRow key={item.qno} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                        <TableCell className="text-center font-bold text-slate-900 dark:text-white text-xs">
                          {item.qno}
                        </TableCell>
                        <TableCell>
                          <div className="font-bold text-slate-900 text-xs dark:text-slate-100">
                            {item.subject}: {item.chapter}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {item.topic}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {item.difficulty}
                          </span>
                          <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                            {item.primarySkill}
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-mono font-bold text-xs text-indigo-700 dark:text-indigo-400">
                          {item.diagnosticWeight}x
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {item.timeTakenS}s / ETS {item.expectedBenchmarkS ?? item.expectedUpperBoundS}s
                          </div>
                          <div className="mt-1 flex flex-wrap items-center justify-center gap-1">
                            {item.timeManagementLabel && (
                              <span
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${item.timeManagementCategory === 'EFFICIENT_MASTERY'
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : item.timeManagementCategory === 'OVER_INVESTED_SUCCESS'
                                    ? 'bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300'
                                    : item.timeManagementCategory === 'DISCIPLINED_ATTEMPT'
                                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300'
                                      : item.timeManagementCategory === 'CARELESS_RUSHING'
                                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                                        : 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  }`}
                              >
                                {item.timeManagementLabel} {item.timeManagementQi !== undefined ? `(Q: ${item.timeManagementQi})` : ''}
                              </span>
                            )}
                            {item.isGuesswork && (
                              <span className="rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-black text-amber-950 dark:bg-amber-900/60 dark:text-amber-200">
                                ⚡ &lt;8s Guesswork
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5 font-mono text-xs font-bold">
                            <span className="text-slate-700 dark:text-slate-300">
                              {item.selectedOption ?? '—'}
                            </span>
                            <span className="text-slate-400">/</span>
                            <span className="text-emerald-700 dark:text-emerald-400">
                              {item.correctAnswer}
                            </span>
                          </div>
                          <div className="mt-0.5">
                            {!item.attempted ? (
                              <span className="text-[10px] text-slate-400">Skipped</span>
                            ) : item.isCorrect ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                <Check className="size-3" /> Correct
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                <AlertTriangle className="size-3" /> Incorrect
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-xs">
                          <span className={item.weightedScore > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}>
                            {item.weightedScore.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {item.revisitCategory ? (
                            <div>
                              {getRevisitBadge(item.revisitCategory)}
                              {item.revisitIssue && (
                                <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 max-w-xs">
                                  {item.revisitIssue}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Footer certification note */}
          <div className="mt-8 border-t border-amber-200 pt-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2 dark:border-amber-900/60">
            <div>
              Generated for <strong className="text-slate-700 dark:text-slate-300">{report.studentName}</strong> • Internal Calculation Audit
            </div>
            <div>
              SRSMA Diagnostic Engine v1.0 • Verification &amp; Development Mode
            </div>
          </div>
        </section>
      )}

      {/* Full Brochure Lightbox Modal */}
      {showBrochureModal && (
        <Dialog
          isOpen={showBrochureModal}
          onClose={() => setShowBrochureModal(false)}
          size="2xl"
          title="SRSMA Class 10 Board Mastery Course Brochure"
          footer={
            <div className="flex w-full items-center justify-between gap-2">
              <a
                href="/board-challenge/brochure_full_300dpi.webp"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-brand-300 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 hover:bg-brand-100 transition dark:border-brand-700 dark:bg-brand-950 dark:text-brand-300"
              >
                <ExternalLink className="size-3.5" />
                <span>Open Full-Res in New Tab</span>
              </a>
              <Button variant="secondary" size="sm" onClick={() => setShowBrochureModal(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <p className="sm:hidden text-center text-[11px] font-medium text-slate-500 dark:text-slate-400">
              💡 Tip: Tap &quot;Open Full-Res in New Tab&quot; or rotate your phone to view every detail crisply.
            </p>
            <div className="max-h-[75vh] overflow-auto p-1 rounded-xl bg-slate-900/5 dark:bg-slate-950/40">
              <img
                src="/board-challenge/brochure_full_300dpi.webp"
                alt="SRSMA Board Mastery Course Brochure"
                className="w-full min-w-[340px] sm:min-w-[600px] rounded-lg object-contain shadow-md"
              />
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
