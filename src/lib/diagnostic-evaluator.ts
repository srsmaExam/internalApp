/**
 * SRSMA Diagnostic Evaluation Engine
 * Class X JEE Online Test Evaluator
 *
 * Dynamically computes evaluation metrics, breakdowns, skills, structural patterns,
 * strengths, priority gaps, topics to revisit, and analytical narratives strictly from
 * question profiling metadata and student test responses without hardcoding totals.
 */

export interface QuestionMetadataItem {
  qno: number;
  subject: string;
  chapter: string;
  topic: string;
  conceptTested?: string | null;
  prerequisiteConcept?: string | null;
  difficulty: 'Easy' | 'Medium' | 'Difficult' | string;
  primarySkill: string;
  secondarySkill?: string | null;
  questionStructure: string;
  visualDependency: 'High' | 'Medium' | 'Low' | 'None' | string;
  expectedTime: string;
  answer: string;
  diagnosticWeight: number;
}

export interface StudentQuestionResponse {
  qno: number;
  attempted: boolean;
  selectedOption: string | null;
  timeTakenSeconds: number;
}

export interface StudentResponsePayload {
  studentName: string;
  studentGender?: 'Male' | 'Female' | string | null;
  responses: StudentQuestionResponse[];
}

export type PreparationLevel =
  | 'Basic'
  | 'Conceptually Strong'
  | 'High achievement Potential'
  | 'ADVANCED'
  | 'PROFICIENT'
  | 'BASIC'
  | 'Foundational'
  | 'NEEDS IMMEDIATE INTERVENTION';
export type SkillValueCategory = 'Good' | 'Average' | 'Needs Strengthening';
export type PriorityLevel = 'High Priority' | 'Medium Priority' | 'Low Priority';
export type RevisitCategory =
  | 'Too Slow'
  | 'Too Fast but Incorrect'
  | 'Conceptual / Calculation Gap'
  | 'Unattempted'
  | 'Pacing / Time Management'
  | 'Severe Overtime'
  | 'High Friction Gap'
  | 'Rapid Guesswork';

export interface AreaPerformance {
  score: number;
  totalQuestions: number;
  percentage: number;
}

export interface SkillProfileItem {
  name: string;
  scorePercent: number;
  category: SkillValueCategory;
  earnedWeight: number;
  totalWeight: number;
}

export interface QuestionStructurePerformance {
  type: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface StrengthItem {
  rank: number;
  name: string;
  scoreDetails: string;
  percentage: number;
  reason: string;
  isEmerging?: boolean;
  tag?: string;
}

export interface DifficultyLevelPerformance {
  level: 'Easy' | 'Medium' | 'Hard';
  score: number;
  total: number;
  percentage: number;
}

export interface SubjectDifficultyBreakdown {
  easy: DifficultyLevelPerformance;
  medium: DifficultyLevelPerformance;
  hard: DifficultyLevelPerformance;
}

export interface SubjectDifficultyBreakdowns {
  mathematics: SubjectDifficultyBreakdown;
  science: SubjectDifficultyBreakdown;
}

export interface PriorityGapItem {
  rank: number;
  name: string;
  scorePercent: number;
  priority: PriorityLevel;
  message: string;
  triggerReason?: string;
}

export interface TopicToRevisitItem {
  qno: number;
  subject: string;
  chapter: string;
  topic: string;
  issueObserved: string;
  category: RevisitCategory;
  recommendedFocusArea: string;
  timeTaken: number;
  expectedLimit: number;
  isCorrect: boolean;
  attempted: boolean;
}

export interface QuestionAuditItem {
  qno: number;
  subject: string;
  chapter: string;
  topic: string;
  difficulty: string;
  primarySkill: string;
  secondarySkill: string | null;
  questionStructure: string;
  visualDependency: string;
  expectedTimeRaw: string;
  expectedUpperBoundS: number;
  timeTakenS: number;
  timeLimitExceeded: boolean;
  expectedBenchmarkS?: number;
  timeManagementScore?: number;
  timeManagementQi?: number;
  timeManagementCategory?: TimeManagementCategory;
  timeManagementLabel?: string;
  isGuesswork?: boolean;
  correctAnswer: string;
  selectedOption: string | null;
  attempted: boolean;
  isCorrect: boolean;
  diagnosticWeight: number;
  weightedScore: number;
  revisitIssue: string | null;
  revisitCategory: RevisitCategory | null;
}

export type TimeManagementCategory =
  | 'EFFICIENT_MASTERY'
  | 'OVER_INVESTED_SUCCESS'
  | 'CARELESS_RUSHING'
  | 'DISCIPLINED_ATTEMPT'
  | 'TIME_TRAP'
  | 'UNATTEMPTED';

export type TimeManagementBand =
  | 'Optimal'
  | 'Good'
  | 'Moderate'
  | 'Needs Intervention';

export type TimeManagementRating = TimeManagementBand | 'Good' | 'Medium' | 'Poor';

export interface QuestionTimeEvaluation {
  qno: number;
  timeTakenSeconds: number;
  ets: number;
  multiplier: number;
  ratio: number;
  qi: number;
  score: number;
  category: TimeManagementCategory;
  label: string;
  rating: TimeManagementBand;
  isGuesswork: boolean;
  attempted: boolean;
  isCorrect: boolean;
}

export interface TimeManagementSummary {
  totalScore: number;
  maxPossibleScore: number;
  finalScorePercent: number;
  tmsScore: number;
  rating: TimeManagementBand;
  band: TimeManagementBand;
  attemptedCount: number;
  totalQuestions: number;
  categoryCounts: Record<TimeManagementCategory, number>;
  guessworkQuestions: number[];
  items: QuestionTimeEvaluation[];
}

export interface WeaknessEvaluationAuditItem {
  id: string;
  name: string;
  categoryType: string;
  evaluatedScore: number;
  formula: string;
  thresholdCondition: string;
  isTriggered: boolean;
  priority: PriorityLevel | 'Benchmark Met (>= 50%)';
  status:
    | 'Selected Priority Gap'
    | 'Suppressed: Pair Exclusion'
    | 'Suppressed: Top 4 Limit'
    | 'Benchmark Met (>= 50%)'
    | 'Not Triggered';
  selectedRank?: number;
  triggerReason: string;
  message?: string;
  totalTested?: number;
}

export interface ScienceDisciplineBreakdownItem {
  discipline: string;
  score: number;
  total: number;
  percentage: number;
  formula: string;
  matchingQuestions: number[];
}

export interface SubjectDifficultyMatrixItem {
  subject: string;
  difficulty: string;
  score: number;
  total: number;
  percentage: number;
  formula: string;
}

export interface DiagnosticCalculationSteps {
  scoring: {
    totalQuestionsN: number;
    rawScoreSum: number;
    diagnosticWeightSum: number;
    weightedScoreSum: number;
    briFraction: string;
    briResult: number;
    levelRule: string;
    levelResult: PreparationLevel;
  };
  breakdowns: Array<{
    area: string;
    filterCondition: string;
    matchingQuestions: number[];
    score: number;
    total: number;
    formula: string;
    percentage: number;
  }>;
  scienceDisciplineBreakdowns?: ScienceDisciplineBreakdownItem[];
  subjectDifficultyMatrix?: SubjectDifficultyMatrixItem[];
  skills: Array<{
    skillName: string;
    filterCondition: string;
    matchingQuestions: number[];
    earnedWeights: number;
    totalWeights: number;
    formula: string;
    percentage: number;
    categoryRule: string;
    categoryResult: SkillValueCategory;
  }>;
  structures: Array<{
    structureType: string;
    matchingQuestions: number[];
    correctCount: number;
    totalCount: number;
    formula: string;
    percentage: number;
  }>;
  strengthsRanking: Array<{
    rank: number;
    name: string;
    percentage: number;
    scoreDetails: string;
    reason: string;
    tag?: string;
    isEmerging?: boolean;
  }>;
  priorityGapsRanking: Array<{
    rank: number;
    name: string;
    scorePercent: number;
    priority: PriorityLevel;
    ruleApplied: string;
    message?: string;
  }>;
  allWeaknessEvaluations?: WeaknessEvaluationAuditItem[];
  allChapterScores: Array<{
    chapter: string;
    subject: string;
    correct: number;
    total: number;
    percentage: number;
    priority: PriorityLevel;
  }>;
  timeManagement?: {
    attemptedCount: number;
    totalQuestions: number;
    totalScore: number;
    maxPossibleScore: number;
    formula: string;
    finalScorePercent: number;
    ratingRule: string;
    ratingResult: TimeManagementBand | string;
    guessworkQuestions: number[];
    categoryCounts?: Record<string, number>;
  };
  questionAudit: QuestionAuditItem[];
}

export interface DiagnosticEvaluationResult {
  studentName: string;
  studentGender?: 'Male' | 'Female' | string | null;
  totalQuestions: number;
  totalRawScore: number;
  totalDiagnosticWeight: number;
  totalWeightedScore: number;
  briScore: number;
  levelOfPreparation: PreparationLevel;

  // Breakdowns
  breakdown: {
    mathematics: AreaPerformance;
    science: AreaPerformance;
    physics: AreaPerformance;
    chemistry: AreaPerformance;
    biology: AreaPerformance;
    easy: AreaPerformance;
    medium: AreaPerformance;
    difficult: AreaPerformance;
    difficultyBySubject?: SubjectDifficultyBreakdowns;
  };

  subjectDifficultyBreakdowns: SubjectDifficultyBreakdowns;

  // Primary Skills & Accuracy
  skills: {
    conceptualFoundation: SkillProfileItem;
    conceptApplication: SkillProfileItem;
    problemSolving: SkillProfileItem;
    accuracy: {
      scorePercent: number;
      category: SkillValueCategory;
      correctCount: number;
      attemptedCount: number;
    };
    questionInterpretation: SkillProfileItem;
  };

  // 7 Question Structure Types
  structures: QuestionStructurePerformance[];

  // Insights & Patterns
  strengthsTitle: string;
  strengths: StrengthItem[];
  priorityGaps: PriorityGapItem[];
  topicsToRevisit: TopicToRevisitItem[];

  // Time Management & Pacing
  timeManagement: TimeManagementSummary;

  // Dynamic Narratives
  keyInsight: string;
  performancePatternInsight: string;

  // Plain Text formatted report
  plainTextReport: string;

  // Page 4: Calculation Steps & Audit Trail (Development Only)
  calculationSteps: DiagnosticCalculationSteps;
}

export function parseExpectedTimeRange(raw: string | number | null | undefined): {
  lowerBound: number;
  upperBound: number;
  mean: number;
} {
  if (raw === null || raw === undefined) {
    return { lowerBound: 60, upperBound: 60, mean: 60 };
  }
  if (typeof raw === 'number') {
    const val = raw > 0 ? raw : 60;
    return { lowerBound: val, upperBound: val, mean: val };
  }
  const str = String(raw).trim();
  const rangeMatch = str.match(/(\d+)\s*[–\-—,]\s*(\d+)/);
  if (rangeMatch) {
    const min = Number(rangeMatch[1]);
    const max = Number(rangeMatch[2]);
    return {
      lowerBound: min,
      upperBound: max,
      mean: (min + max) / 2,
    };
  }
  const singleMatch = str.match(/(\d+)/);
  if (singleMatch) {
    const val = Number(singleMatch[1]);
    return { lowerBound: val, upperBound: val, mean: val };
  }
  return { lowerBound: 60, upperBound: 60, mean: 60 };
}

export function parseExpectedTimeBenchmark(raw: string | number | null | undefined): number {
  return parseExpectedTimeRange(raw).mean;
}

export function parseExpectedTimeUpperBound(raw: string | number | null | undefined): number {
  return parseExpectedTimeRange(raw).upperBound;
}

export function getQuestionETS(
  rawExpectedTime?: string | number | null,
  expectedTimeS?: number | null,
): number {
  if (rawExpectedTime !== null && rawExpectedTime !== undefined && rawExpectedTime !== '') {
    const benchmark = parseExpectedTimeBenchmark(rawExpectedTime);
    if (benchmark > 0) return benchmark;
  }
  if (expectedTimeS && expectedTimeS > 0) {
    return expectedTimeS;
  }
  return 60;
}

export function evaluateQuestionTimeManagement(
  timeTakenSeconds: number,
  ets: number,
  isCorrect?: boolean | null,
  attempted: boolean = true,
): {
  ratio: number;
  qi: number;
  category: TimeManagementCategory;
  label: string;
  rating: TimeManagementBand;
  score: number;
} {
  const safeEts = Math.max(1, ets);
  const tAct = Number(timeTakenSeconds ?? 0);
  const ratio = Number((tAct / safeEts).toFixed(2));

  if (!attempted || tAct <= 0) {
    return {
      ratio: 0,
      qi: 0.0,
      category: 'UNATTEMPTED',
      label: 'Unattempted',
      rating: 'Needs Intervention',
      score: 0,
    };
  }

  if (isCorrect) {
    if (ratio <= 1.0) {
      return {
        ratio,
        qi: 1.0,
        category: 'EFFICIENT_MASTERY',
        label: 'Efficient Mastery',
        rating: 'Optimal',
        score: 3,
      };
    } else {
      const rawQi = 1.0 / ratio;
      const qi = Math.max(0.25, Number(rawQi.toFixed(4)));
      return {
        ratio,
        qi,
        category: 'OVER_INVESTED_SUCCESS',
        label: 'Over-Invested Success',
        rating: qi >= 0.70 ? 'Good' : 'Moderate',
        score: qi >= 0.70 ? 3 : 2,
      };
    }
  } else {
    if (ratio < 0.70) {
      const qi = Number((0.50 * (ratio / 0.70)).toFixed(4));
      return {
        ratio,
        qi,
        category: 'CARELESS_RUSHING',
        label: 'Careless Rushing',
        rating: 'Needs Intervention',
        score: 1,
      };
    } else if (ratio <= 1.30) {
      return {
        ratio,
        qi: 0.50,
        category: 'DISCIPLINED_ATTEMPT',
        label: 'Disciplined Attempt',
        rating: 'Moderate',
        score: 2,
      };
    } else {
      const rawQi = 0.50 - 0.50 * (ratio - 1.30);
      const qi = Math.max(0.0, Number(rawQi.toFixed(4)));
      return {
        ratio,
        qi,
        category: 'TIME_TRAP',
        label: 'Time Trap',
        rating: 'Needs Intervention',
        score: 1,
      };
    }
  }
}

export function classifyTimeManagementBand(percentage: number): TimeManagementBand {
  if (percentage >= 85.0) return 'Optimal';
  if (percentage >= 70.0) return 'Good';
  if (percentage >= 50.0) return 'Moderate';
  return 'Needs Intervention';
}

export function classifyTimeManagementRating(percentage: number): TimeManagementBand {
  return classifyTimeManagementBand(percentage);
}

export function evaluateTimeManagement(
  questions: Array<{
    qno: number;
    attempted: boolean;
    timeTakenSeconds: number;
    expectedUpperBoundS?: number;
    benchmarkTimeS?: number;
    isCorrect?: boolean | null;
    diagnosticWeight?: number;
  }>,
  totalQuestionsCount?: number,
): TimeManagementSummary {
  const N = Math.max(1, totalQuestionsCount ?? questions.length);
  let totalQi = 0;
  let totalWeightedQi = 0;
  let totalDiagnosticWeight = 0;
  let attemptedCount = 0;
  const guessworkQuestions: number[] = [];
  const items: QuestionTimeEvaluation[] = [];
  const categoryCounts: Record<TimeManagementCategory, number> = {
    EFFICIENT_MASTERY: 0,
    OVER_INVESTED_SUCCESS: 0,
    CARELESS_RUSHING: 0,
    DISCIPLINED_ATTEMPT: 0,
    TIME_TRAP: 0,
    UNATTEMPTED: 0,
  };

  for (const q of questions) {
    const isGuesswork = q.attempted && q.timeTakenSeconds > 0 && q.timeTakenSeconds < 8;
    if (isGuesswork) {
      guessworkQuestions.push(q.qno);
    }

    const ets = Math.max(1, q.benchmarkTimeS ?? q.expectedUpperBoundS ?? 60);
    const evalResult = evaluateQuestionTimeManagement(
      q.timeTakenSeconds,
      ets,
      q.isCorrect,
      q.attempted,
    );

    const weight =
      typeof q.diagnosticWeight === 'number' && !isNaN(q.diagnosticWeight) && q.diagnosticWeight > 0
        ? q.diagnosticWeight
        : 1.0;

    categoryCounts[evalResult.category] += 1;
    totalQi += evalResult.qi;
    totalWeightedQi += evalResult.qi * weight;
    totalDiagnosticWeight += weight;

    if (q.attempted && q.timeTakenSeconds > 0) {
      attemptedCount += 1;
    }

    items.push({
      qno: q.qno,
      timeTakenSeconds: q.timeTakenSeconds,
      ets,
      multiplier: evalResult.ratio,
      ratio: evalResult.ratio,
      qi: evalResult.qi,
      score: evalResult.score,
      category: evalResult.category,
      label: evalResult.label,
      rating: evalResult.rating,
      isGuesswork,
      attempted: q.attempted,
      isCorrect: Boolean(q.isCorrect),
    });
  }

  // If fewer questions were provided than N, reconcile missing records as UNATTEMPTED
  const missingCount = Math.max(0, N - questions.length);
  if (missingCount > 0) {
    categoryCounts.UNATTEMPTED += missingCount;
    for (let i = questions.length + 1; i <= N; i++) {
      totalDiagnosticWeight += 1.0;
      items.push({
        qno: i,
        timeTakenSeconds: 0,
        ets: 60,
        multiplier: 0,
        ratio: 0,
        qi: 0,
        score: 0,
        category: 'UNATTEMPTED',
        label: 'Unattempted',
        rating: 'Needs Intervention',
        isGuesswork: false,
        attempted: false,
        isCorrect: false,
      });
    }
  }

  // Final Metric: TMS (%) calculated based on diagnostic weights:
  // TMS (%) = (Σ (Qi * Wi) / Σ Wi) * 100
  const finalScorePercent =
    totalDiagnosticWeight > 0
      ? Number(((totalWeightedQi / totalDiagnosticWeight) * 100).toFixed(1))
      : 0;
  const roundedScorePercent = Math.round(finalScorePercent);
  const rating = classifyTimeManagementBand(roundedScorePercent);

  return {
    totalScore: Number(totalWeightedQi.toFixed(2)),
    maxPossibleScore: Number(totalDiagnosticWeight.toFixed(2)),
    finalScorePercent: roundedScorePercent,
    tmsScore: finalScorePercent,
    rating,
    band: rating,
    attemptedCount,
    totalQuestions: N,
    categoryCounts,
    guessworkQuestions,
    items,
  };
}

export function classifySkillValue(percentage: number): SkillValueCategory {
  if (percentage > (2 / 3) * 100) return 'Good';
  if (percentage > (1 / 3) * 100) return 'Average';
  return 'Needs Strengthening';
}

export function classifyPreparationLevel(bri: number): PreparationLevel {
  if (bri >= 70) return 'High achievement Potential';
  if (bri >= 50) return 'Conceptually Strong';
  if (bri >= 20) return 'Basic';
  return 'Foundational';
}

export function classifyPriority(percentage: number): PriorityLevel {
  if (percentage < 25) return 'High Priority';
  if (percentage <= 35) return 'Medium Priority';
  return 'Low Priority';
}

/**
 * Main evaluation function
 */
export function evaluateDiagnosticReport(
  metadata: QuestionMetadataItem[],
  student: StudentResponsePayload,
): DiagnosticEvaluationResult {
  const respMap = new Map<number, StudentQuestionResponse>();
  for (const r of student.responses) {
    respMap.set(r.qno, r);
  }

  const N = metadata.length;
  let totalRawScore = 0;
  let totalDiagnosticWeight = 0;
  let totalWeightedScore = 0;
  let totalAttempted = 0;
  let totalCorrect = 0;

  type EvaluatedQ = {
    meta: QuestionMetadataItem;
    attempted: boolean;
    selectedOption: string | null;
    timeTakenSeconds: number;
    isCorrect: boolean;
    weight: number;
    upperLimit: number;
    benchmarkTime: number;
  };

  const evaluatedQuestions: EvaluatedQ[] = [];

  for (const q of metadata) {
    const r = respMap.get(q.qno);
    const attempted = Boolean(r?.attempted && r?.selectedOption !== null && r?.selectedOption !== undefined);
    const selected = r?.selectedOption ? String(r.selectedOption).trim().toUpperCase() : null;
    const correctAns = String(q.answer).trim().toUpperCase();
    const isCorrect = attempted && selected === correctAns;
    const weight = Number(q.diagnosticWeight ?? 1);
    const timeTaken = Number(r?.timeTakenSeconds ?? 0);
    const range = parseExpectedTimeRange(q.expectedTime);
    const upperLimit = range.upperBound;
    const benchmarkTime = range.mean;

    totalDiagnosticWeight += weight;
    if (attempted) totalAttempted++;
    if (isCorrect) {
      totalRawScore += 1;
      totalCorrect += 1;
      totalWeightedScore += weight;
    }

    evaluatedQuestions.push({
      meta: q,
      attempted,
      selectedOption: selected,
      timeTakenSeconds: timeTaken,
      isCorrect,
      weight,
      upperLimit,
      benchmarkTime,
    });
  }

  // Board Readiness Index (BRI) Score (%)
  const briScore =
    totalDiagnosticWeight > 0
      ? Math.round((totalWeightedScore / totalDiagnosticWeight) * 1000) / 10
      : 0;

  const levelOfPreparation = classifyPreparationLevel(briScore);

  // Subject breakdowns
  const mathsQs = evaluatedQuestions.filter(
    (eq) => eq.meta.subject.toLowerCase() === 'maths' || eq.meta.subject.toLowerCase() === 'mathematics',
  );
  const scienceQs = evaluatedQuestions.filter((eq) =>
    ['physics', 'chemistry', 'biology', 'science'].includes(eq.meta.subject.toLowerCase()),
  );

  const mathsScore = mathsQs.filter((q) => q.isCorrect).length;
  const scienceScore = scienceQs.filter((q) => q.isCorrect).length;

  // Science Sub-divisions (Physics, Chemistry, Biology)
  const physicsQs = evaluatedQuestions.filter((eq) => eq.meta.subject.toLowerCase() === 'physics');
  const chemistryQs = evaluatedQuestions.filter((eq) => eq.meta.subject.toLowerCase() === 'chemistry');
  const biologyQs = evaluatedQuestions.filter((eq) => eq.meta.subject.toLowerCase() === 'biology');

  const physicsScore = physicsQs.filter((q) => q.isCorrect).length;
  const chemistryScore = chemistryQs.filter((q) => q.isCorrect).length;
  const biologyScore = biologyQs.filter((q) => q.isCorrect).length;

  const mathsPerf: AreaPerformance = {
    score: mathsScore,
    totalQuestions: mathsQs.length,
    percentage: mathsQs.length > 0 ? Math.round((mathsScore / mathsQs.length) * 100) : 0,
  };

  const sciencePerf: AreaPerformance = {
    score: scienceScore,
    totalQuestions: scienceQs.length,
    percentage: scienceQs.length > 0 ? Math.round((scienceScore / scienceQs.length) * 100) : 0,
  };

  const physicsPerf: AreaPerformance = {
    score: physicsScore,
    totalQuestions: physicsQs.length,
    percentage: physicsQs.length > 0 ? Math.round((physicsScore / physicsQs.length) * 100) : 0,
  };

  const chemistryPerf: AreaPerformance = {
    score: chemistryScore,
    totalQuestions: chemistryQs.length,
    percentage: chemistryQs.length > 0 ? Math.round((chemistryScore / chemistryQs.length) * 100) : 0,
  };

  const biologyPerf: AreaPerformance = {
    score: biologyScore,
    totalQuestions: biologyQs.length,
    percentage: biologyQs.length > 0 ? Math.round((biologyScore / biologyQs.length) * 100) : 0,
  };

  // Difficulty breakdowns
  const isEasy = (d: string) => d.toLowerCase() === 'easy' || d === '1';
  const isMed = (d: string) => d.toLowerCase() === 'medium' || d === '2';
  const isDiff = (d: string) => d.toLowerCase() === 'difficult' || d.toLowerCase() === 'hard' || d === '3';

  const easyQs = evaluatedQuestions.filter((q) => isEasy(String(q.meta.difficulty)));
  const medQs = evaluatedQuestions.filter((q) => isMed(String(q.meta.difficulty)));
  const diffQs = evaluatedQuestions.filter((q) => isDiff(String(q.meta.difficulty)));

  const easyScore = easyQs.filter((q) => q.isCorrect).length;
  const medScore = medQs.filter((q) => q.isCorrect).length;
  const diffScore = diffQs.filter((q) => q.isCorrect).length;

  const easyPerf: AreaPerformance = {
    score: easyScore,
    totalQuestions: easyQs.length,
    percentage: easyQs.length > 0 ? Math.round((easyScore / easyQs.length) * 100) : 0,
  };
  const medPerf: AreaPerformance = {
    score: medScore,
    totalQuestions: medQs.length,
    percentage: medQs.length > 0 ? Math.round((medScore / medQs.length) * 100) : 0,
  };
  const diffPerf: AreaPerformance = {
    score: diffScore,
    totalQuestions: diffQs.length,
    percentage: diffQs.length > 0 ? Math.round((diffScore / diffQs.length) * 100) : 0,
  };

  // Subject Difficulty breakdowns (Mathematics and Science)
  const mathsEasyQs = mathsQs.filter((q) => isEasy(String(q.meta.difficulty)));
  const mathsMedQs = mathsQs.filter((q) => isMed(String(q.meta.difficulty)));
  const mathsDiffQs = mathsQs.filter((q) => isDiff(String(q.meta.difficulty)));

  const mathsEasyScore = mathsEasyQs.filter((q) => q.isCorrect).length;
  const mathsMedScore = mathsMedQs.filter((q) => q.isCorrect).length;
  const mathsDiffScore = mathsDiffQs.filter((q) => q.isCorrect).length;

  const scienceEasyQs = scienceQs.filter((q) => isEasy(String(q.meta.difficulty)));
  const scienceMedQs = scienceQs.filter((q) => isMed(String(q.meta.difficulty)));
  const scienceDiffQs = scienceQs.filter((q) => isDiff(String(q.meta.difficulty)));

  const scienceEasyScore = scienceEasyQs.filter((q) => q.isCorrect).length;
  const scienceMedScore = scienceMedQs.filter((q) => q.isCorrect).length;
  const scienceDiffScore = scienceDiffQs.filter((q) => q.isCorrect).length;

  const subjectDifficultyBreakdowns: SubjectDifficultyBreakdowns = {
    mathematics: {
      easy: {
        level: 'Easy',
        score: mathsEasyScore,
        total: mathsEasyQs.length,
        percentage: mathsEasyQs.length > 0 ? Math.round((mathsEasyScore / mathsEasyQs.length) * 100) : 0,
      },
      medium: {
        level: 'Medium',
        score: mathsMedScore,
        total: mathsMedQs.length,
        percentage: mathsMedQs.length > 0 ? Math.round((mathsMedScore / mathsMedQs.length) * 100) : 0,
      },
      hard: {
        level: 'Hard',
        score: mathsDiffScore,
        total: mathsDiffQs.length,
        percentage: mathsDiffQs.length > 0 ? Math.round((mathsDiffScore / mathsDiffQs.length) * 100) : 0,
      },
    },
    science: {
      easy: {
        level: 'Easy',
        score: scienceEasyScore,
        total: scienceEasyQs.length,
        percentage: scienceEasyQs.length > 0 ? Math.round((scienceEasyScore / scienceEasyQs.length) * 100) : 0,
      },
      medium: {
        level: 'Medium',
        score: scienceMedScore,
        total: scienceMedQs.length,
        percentage: scienceMedQs.length > 0 ? Math.round((scienceMedScore / scienceMedQs.length) * 100) : 0,
      },
      hard: {
        level: 'Hard',
        score: scienceDiffScore,
        total: scienceDiffQs.length,
        percentage: scienceDiffQs.length > 0 ? Math.round((scienceDiffScore / scienceDiffQs.length) * 100) : 0,
      },
    },
  };

  // Primary Skills Weighted Calculations
  function computeWeightedSkill(
    filterFn: (q: EvaluatedQ) => boolean,
    name: string,
  ): SkillProfileItem {
    const subset = evaluatedQuestions.filter(filterFn);
    const sumTotalWeight = subset.reduce((acc, curr) => acc + curr.weight, 0);
    const sumEarnedWeight = subset.reduce(
      (acc, curr) => acc + (curr.isCorrect ? curr.weight : 0),
      0,
    );
    const pct = sumTotalWeight > 0 ? Math.round((sumEarnedWeight / sumTotalWeight) * 1000) / 10 : 0;
    return {
      name,
      scorePercent: pct,
      category: classifySkillValue(pct),
      earnedWeight: sumEarnedWeight,
      totalWeight: sumTotalWeight,
    };
  }

  const conceptualQs = evaluatedQuestions.filter(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'conceptual foundation',
  );
  const conceptualFoundation = computeWeightedSkill(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'conceptual foundation',
    'Conceptual Foundation',
  );

  const applicationQs = evaluatedQuestions.filter(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'concept application',
  );
  const conceptApplication = computeWeightedSkill(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'concept application',
    'Concept Application Skill',
  );

  const problemSolvingQs = evaluatedQuestions.filter(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'problem solving',
  );
  const problemSolving = computeWeightedSkill(
    (q) => q.meta.primarySkill.trim().toLowerCase() === 'problem solving',
    'Problem Solving Skill',
  );

  // Raw Accuracy
  const rawAccuracyPercent =
    totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 1000) / 10 : 0;
  const accuracyCategory = classifySkillValue(rawAccuracyPercent);

  // Question Interpretation Skill
  // Filter questions matching ANY of:
  // - Secondary Skill contains "Interpretation" or "Visual Interpretation" (case-insensitive)
  // - Question Structure contains "Data-based" or "Diagram-based" (case-insensitive)
  // - Visual Dependency == "High" (case-insensitive)
  const isInterpMatch = (q: EvaluatedQ) => {
    const sec = (q.meta.secondarySkill ?? '').toLowerCase();
    const struc = (q.meta.questionStructure ?? '').toLowerCase();
    const vis = (q.meta.visualDependency ?? '').toLowerCase();

    const matchesSec = sec.includes('interpretation');
    const matchesStruc = struc.includes('data-based') || struc.includes('diagram-based');
    const matchesVis = vis === 'high';

    return matchesSec || matchesStruc || matchesVis;
  };

  const interpQs = evaluatedQuestions.filter(isInterpMatch);
  const questionInterpretation = computeWeightedSkill(isInterpMatch, 'Question Interpretation Skill');

  // Time Management & Pacing Evaluation (TMS Scoring Engine)
  const timeManagement = evaluateTimeManagement(
    evaluatedQuestions.map((eq) => ({
      qno: eq.meta.qno,
      attempted: eq.attempted,
      timeTakenSeconds: eq.timeTakenSeconds,
      expectedUpperBoundS: eq.benchmarkTime,
      benchmarkTimeS: eq.benchmarkTime,
      isCorrect: eq.isCorrect,
      diagnosticWeight: eq.weight,
    })),
    N,
  );

  // Question Structure Performance (5 Performance Patterns: Direct, Multi-step, Diagram-based, Application-based, Word Problem)
  const STRUCTURAL_TYPES = [
    { key: 'Direct', label: 'Direct', regex: /\bdirect\b/i },
    { key: 'Multi-step', label: 'Multi-step', regex: /\bmulti[- ]step\b/i },
    { key: 'Diagram-based', label: 'Diagram-based', regex: /\bdiagram[- ]based\b/i },
    { key: 'Application-based', label: 'Application-based', regex: /\bapplication[- ]based\b/i },
    { key: 'Word problem', label: 'Word Problem', regex: /\bword problem\b/i },
  ];

  const structures: QuestionStructurePerformance[] = STRUCTURAL_TYPES.map((st) => {
    const matching = evaluatedQuestions.filter((q) =>
      st.regex.test(q.meta.questionStructure ?? ''),
    );
    const corr = matching.filter((q) => q.isCorrect).length;
    const tot = matching.length;
    return {
      type: st.label,
      correct: corr,
      total: tot,
      percentage: tot > 0 ? Math.round((corr / tot) * 100) : 0,
    };
  });

  // Chapter-level performance for Strengths & Gaps
  const chapterMap = new Map<string, { correct: number; total: number; subject: string }>();
  for (const eq of evaluatedQuestions) {
    const ch = eq.meta.chapter?.trim() || 'General';
    if (!chapterMap.has(ch)) {
      chapterMap.set(ch, { correct: 0, total: 0, subject: eq.meta.subject });
    }
    const c = chapterMap.get(ch)!;
    c.total += 1;
    if (eq.isCorrect) c.correct += 1;
  }

  const chapterList = Array.from(chapterMap.entries()).map(([ch, val]) => ({
    name: ch,
    subject: val.subject,
    correct: val.correct,
    total: val.total,
    percentage: Math.round((val.correct / val.total) * 100),
  }));



  // 5 Core Academic Strengths Engine (strictly limited to core academic categories; Time Management is featured in its own dedicated section)
  interface CandidateStrength {
    id: string;
    strongName: string;
    developingName: string;
    percentage: number;
    totalTested: number;
    strongReason: string;
    developingReason: string;
  }

  const strengthCandidates: CandidateStrength[] = [
    {
      id: 'concept_clarity',
      strongName: 'CONCEPT CLARITY',
      developingName: 'CONCEPT CLARITY',
      percentage: conceptualFoundation.scorePercent,
      totalTested: conceptualFoundation.totalWeight,
      strongReason:
        'You understand Class X board concepts well and have built a strong base to build upon. Keep deepening your understanding—you’re on the right track!',
      developingReason:
        'This is one of your stronger areas right now. With focused practice, you can build even greater clarity here.',
    },
    {
      id: 'concept_application',
      strongName: 'CONCEPT APPLICATION',
      developingName: 'CONCEPT APPLICATION',
      percentage: conceptApplication.scorePercent,
      totalTested: conceptApplication.totalWeight,
      strongReason:
        'You are good at putting what you learn into practice. Keep exploring unfamiliar questions to make this strength even stronger!',
      developingReason:
        'You are showing a promising start in applying concepts. More practice with varied questions can strengthen this further.',
    },
    {
      id: 'problem_solving',
      strongName: 'PROBLEM SOLVING SKILL',
      developingName: 'PROBLEM SOLVING',
      percentage: problemSolving.scorePercent,
      totalTested: problemSolving.totalWeight,
      strongReason:
        'You show good logical thinking and can work through challenging problems. Keep challenging yourself—you have a strong problem-solving foundation!',
      developingReason:
        'You show a developing ability to work through problems. Regular practice can help you become more confident and effective.',
    },
    {
      id: 'visual_understanding',
      strongName: 'VISUAL UNDERSTANDING SKILL',
      developingName: 'VISUAL UNDERSTANDING',
      percentage: questionInterpretation.scorePercent,
      totalTested: questionInterpretation.totalWeight,
      strongReason:
        'You are comfortable understanding information through diagrams, graphs and figures. Use this strength to tackle more challenging visual and application-based questions!',
      developingReason:
        'You are showing a good starting point with visual information. More exposure to graphs, diagrams and figures can strengthen this skill.',
    },
    {
      id: 'accuracy',
      strongName: 'ACCURACY',
      developingName: 'ACCURACY',
      percentage: rawAccuracyPercent,
      totalTested: totalAttempted,
      strongReason:
        'You answer questions with good care and precision. Keep building this strength while maintaining your solving speed!',
      developingReason:
        'Your accuracy is currently among your better-performing areas. With careful practice, you can make this an even stronger skill.',
    },
  ];

  // Sort descending by percentage, then by totalTested
  const sortedStrengths = [...strengthCandidates].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return b.totalTested - a.totalTested;
  });

  const eligibleStrengths = sortedStrengths.filter((item) => item.percentage >= 50);
  const top3Selected = eligibleStrengths.slice(0, 3);
  const strongCount = top3Selected.filter((item) => item.percentage >= 70).length;

  let strengthsTitle = 'YOUR STRENGTHS';
  if (top3Selected.length === 0) {
    strengthsTitle = 'AREAS WITH MOST POTENTIAL';
  } else if (strongCount >= 3) {
    strengthsTitle = 'YOUR STRENGTHS';
  } else if (strongCount === 1 || strongCount === 2) {
    strengthsTitle = 'YOUR EMERGING STRENGTHS';
  } else {
    strengthsTitle = 'AREAS WITH MOST POTENTIAL';
  }

  const top3Strengths: StrengthItem[] = top3Selected.map((item, idx) => {
    const isStrong = item.percentage >= 70;
    const isPotential = item.percentage < 60;
    const tag = isStrong
      ? 'Verified Core Strength'
      : isPotential
        ? 'Areas with Most Potential'
        : 'Emerging Strength';
    return {
      rank: idx + 1,
      name: isStrong ? item.strongName : item.developingName,
      scoreDetails: `${item.percentage}%`,
      percentage: item.percentage,
      reason: isStrong ? item.strongReason : item.developingReason,
      isEmerging: !isStrong,
      tag,
    };
  });

  // ---------------------------------------------------------------------------
  // 9-Label Weakness Engine (Priority Gaps strictly generated from 9 labels only)
  // ---------------------------------------------------------------------------
  interface WeaknessCandidate {
    name: string;
    scorePercent: number;
    priority: PriorityLevel;
    message: string;
    triggerReason: string;
    totalTested: number;
  }

  const weaknessCandidates: WeaknessCandidate[] = [];

  // Question Structure stats
  const directQs = evaluatedQuestions.filter((q) => /\bdirect\b/i.test(q.meta.questionStructure ?? ''));
  const directTotal = directQs.length;
  const directCorrect = directQs.filter((q) => q.isCorrect).length;
  const directScore = directTotal > 0 ? Math.round((directCorrect / directTotal) * 100) : 0;

  const multiStepQs = evaluatedQuestions.filter((q) => /\bmulti[- ]step\b/i.test(q.meta.questionStructure ?? ''));
  const multiStepTotal = multiStepQs.length;
  const multiStepCorrect = multiStepQs.filter((q) => q.isCorrect).length;
  const multiStepScore = multiStepTotal > 0 ? Math.round((multiStepCorrect / multiStepTotal) * 100) : 0;
  const multiStepTotalWeight = multiStepQs.reduce((acc, q) => acc + q.weight, 0);
  const multiStepEarnedWeight = multiStepQs.reduce((acc, q) => acc + (q.isCorrect ? q.weight : 0), 0);
  const multiStepWeightedScore = multiStepTotalWeight > 0 ? Math.round((multiStepEarnedWeight / multiStepTotalWeight) * 100) : 0;

  const appStructureQs = evaluatedQuestions.filter((q) => /\bapplication[- ]based\b/i.test(q.meta.questionStructure ?? ''));
  const appStructureTotal = appStructureQs.length;
  const appStructureCorrect = appStructureQs.filter((q) => q.isCorrect).length;
  const appStructureScore = appStructureTotal > 0 ? Math.round((appStructureCorrect / appStructureTotal) * 100) : 0;

  // Primary Skill = Application / Concept Application
  const appSkillQs = evaluatedQuestions.filter((q) => {
    const ps = (q.meta.primarySkill ?? '').trim().toLowerCase();
    return ps === 'application' || ps === 'concept application' || ps.includes('application');
  });
  const appSkillTotalWeight = appSkillQs.reduce((acc, q) => acc + q.weight, 0);
  const appSkillEarnedWeight = appSkillQs.reduce((acc, q) => acc + (q.isCorrect ? q.weight : 0), 0);
  const appSkillScore = appSkillTotalWeight > 0 ? Math.round((appSkillEarnedWeight / appSkillTotalWeight) * 100) : 0;

  // -------------------------------------------------------------------------
  // A. Conceptual Understanding
  // -------------------------------------------------------------------------
  // Primary Skill = Conceptual Foundation
  // Conceptual Score = (sum(Correct * Weight) / sum(Weight)) * 100
  if (conceptualFoundation.totalWeight > 0 && conceptualFoundation.scorePercent < 50) {
    weaknessCandidates.push({
      name: 'Conceptual Understanding',
      scorePercent: Math.round(conceptualFoundation.scorePercent),
      priority: classifyPriority(conceptualFoundation.scorePercent),
      message: 'You need to strengthen some fundamental concepts before moving confidently to more advanced questions.',
      triggerReason: `Conceptual Foundation score is ${Math.round(conceptualFoundation.scorePercent)}% (< 50%)`,
      totalTested: conceptualFoundation.totalWeight,
    });
  }

  // -------------------------------------------------------------------------
  // B. Application Skill
  // -------------------------------------------------------------------------
  // Primary Skill = Application
  // Application Score = (sum(Correct * Weight) / sum(Weight)) * 100
  if (appSkillTotalWeight > 0 && appSkillScore < 50) {
    weaknessCandidates.push({
      name: 'Application Skill',
      scorePercent: appSkillScore,
      priority: classifyPriority(appSkillScore),
      message: 'Your basic understanding is developing, but you need more practice using concepts in unfamiliar and application-based situations.',
      triggerReason: `Application score is ${appSkillScore}% (< 50%)`,
      totalTested: appSkillTotalWeight,
    });
  }

  // -------------------------------------------------------------------------
  // C. Problem Solving Skill
  // -------------------------------------------------------------------------
  // Primary Skill = Problem Solving, Multi-step question performance
  // Primary score: ProblemSolving Score = (sum(Correct * Weight) / sum(Weight)) * 100
  // Also calculate: MultiStep Score = (sum(Correct * Weight) / sum(Weight)) * 100
  // Trigger: Problem Solving < 50% OR Multi-step < 50% OR Direct - Multi-step >= 20 percentage points
  const hasPS = problemSolving.totalWeight > 0;
  const hasMS = multiStepTotal > 0;
  const hasDir = directTotal > 0;
  const psScore = hasPS ? Math.round(problemSolving.scorePercent) : 0;
  const msScoreToUse = multiStepTotalWeight > 0 ? multiStepWeightedScore : multiStepScore;

  const isPSTriggered =
    hasPS &&
    (psScore < 50 ||
      (hasMS && msScoreToUse < 50) ||
      (hasDir && hasMS && directScore - msScoreToUse >= 20));

  let chosenPSScore = psScore;
  if (chosenPSScore >= 50 && hasMS && msScoreToUse < 50) {
    chosenPSScore = msScoreToUse;
  }

  if (isPSTriggered) {
    if (chosenPSScore < 50) {
      weaknessCandidates.push({
        name: 'Problem Solving Skill',
        scorePercent: chosenPSScore,
        priority: classifyPriority(chosenPSScore),
        message: 'You need more practice breaking complex problems into manageable steps and connecting ideas systematically.',
        triggerReason: psScore < 50
          ? `Problem Solving score is ${psScore}% (< 50%)`
          : hasMS && msScoreToUse < 50
            ? `Multi-step score is ${msScoreToUse}% (< 50%)`
            : `Direct (${directScore}%) - Multi-step (${msScoreToUse}%) >= 20 pts`,
        totalTested: problemSolving.totalWeight,
      });
    }
  }

  // -------------------------------------------------------------------------
  // D. Question Interpretation Skill
  // -------------------------------------------------------------------------
  // Primary/Secondary Skill = Interpretation / Visual Interpretation
  // OR Visual Dependency = High OR Question Structure = Data-based / Diagram-based
  // Trigger: Interpretation < 50%, with sufficient evidence
  if (questionInterpretation.totalWeight > 0 && questionInterpretation.scorePercent < 50) {
    const interpScore = Math.round(questionInterpretation.scorePercent);
    weaknessCandidates.push({
      name: 'Question Interpretation Skill',
      scorePercent: interpScore,
      priority: classifyPriority(interpScore),
      message: 'Practise reading diagrams and data carefully, identifying the relevant information and using it correctly to reach the answer.',
      triggerReason: `Interpretation score is ${interpScore}% (< 50%)`,
      totalTested: questionInterpretation.totalWeight,
    });
  }

  // -------------------------------------------------------------------------
  // E. Accuracy
  // -------------------------------------------------------------------------
  // Accuracy = (Correct / Attempted) * 100
  // Trigger when: Accuracy < 50% AND conceptual/application performance is >= 50%
  const hasConceptualOrAppMastery =
    (conceptualFoundation.totalWeight > 0 && conceptualFoundation.scorePercent >= 50) ||
    (appSkillTotalWeight > 0 && appSkillScore >= 50);

  if (totalAttempted > 0 && rawAccuracyPercent < 50 && hasConceptualOrAppMastery) {
    const roundedAcc = Math.round(rawAccuracyPercent);
    weaknessCandidates.push({
      name: 'Accuracy',
      scorePercent: roundedAcc,
      priority: classifyPriority(roundedAcc),
      message: 'You appear to understand several of the concepts tested, but avoidable errors may be costing you marks. Focus on careful calculation, reading and checking.',
      triggerReason: `Accuracy is ${roundedAcc}% (< 50%) despite conceptual/application competence (>= 50%)`,
      totalTested: totalAttempted,
    });
  }

  // -------------------------------------------------------------------------
  // F. Difficulty Readiness
  // -------------------------------------------------------------------------
  // Easy Score, Medium Score, Difficult Score
  // Trigger: Easy >= 50% AND Medium/Difficult performance drops significantly (Easy - Medium >= 20 or Easy - Difficult >= 30)
  const easyPct = easyPerf.percentage;
  const medPct = medPerf.percentage;
  const diffPct = diffPerf.percentage;

  const hasMedDrop = medPerf.totalQuestions > 0 && easyPct - medPct >= 20;
  const hasDiffDrop = diffPerf.totalQuestions > 0 && easyPct - diffPct >= 30;

  const medDiffTotal = medPerf.totalQuestions + diffPerf.totalQuestions;
  const medDiffCorrect = medPerf.score + diffPerf.score;
  const medDiffScore = medDiffTotal > 0 ? Math.round((medDiffCorrect / medDiffTotal) * 100) : (medPerf.totalQuestions > 0 ? medPct : diffPct);

  if (easyPerf.totalQuestions > 0 && easyPct >= 50 && (hasMedDrop || hasDiffDrop)) {
    if (medDiffScore < 50) {
      weaknessCandidates.push({
        name: 'Difficulty Readiness',
        scorePercent: medDiffScore,
        priority: classifyPriority(medDiffScore),
        message: 'Your foundation is developing well, but you need to gradually build confidence with more challenging questions.',
        triggerReason: hasMedDrop && hasDiffDrop
          ? `Easy (${easyPct}%) drops by >=20 on Medium (${medPct}%) and >=30 on Difficult (${diffPct}%)`
          : hasMedDrop
            ? `Easy (${easyPct}%) - Medium (${medPct}%) = ${easyPct - medPct} (>= 20)`
            : `Easy (${easyPct}%) - Difficult (${diffPct}%) = ${easyPct - diffPct} (>= 30)`,
        totalTested: medDiffTotal,
      });
    }
  }

  // -------------------------------------------------------------------------
  // G. Multi-Step Question Skill
  // -------------------------------------------------------------------------
  // MultiStep = (Correct MultiStep / Total MultiStep) * 100
  // MultiStep Gap = DirectScore - MultiStepScore
  // Trigger: Direct - Multi-step >= 20 (or MultiStep < 50 with Direct >= 50) AND MultiStep < 50
  const isMultiStepGapTriggered =
    multiStepTotal > 0 &&
    multiStepScore < 50 &&
    ((directTotal > 0 && directScore - multiStepScore >= 20) || (multiStepScore < 50 && (directTotal === 0 || directScore >= 50)));

  if (isMultiStepGapTriggered) {
    weaknessCandidates.push({
      name: 'Multi-Step Question Skill',
      scorePercent: multiStepScore,
      priority: classifyPriority(multiStepScore),
      message: 'You are comfortable with direct questions, but questions requiring several connected steps are currently more challenging.',
      triggerReason: directTotal > 0
        ? `Direct (${directScore}%) - Multi-step (${multiStepScore}%) = ${directScore - multiStepScore} pts (>= 20)`
        : `Multi-step score is ${multiStepScore}% (< 50%)`,
      totalTested: multiStepTotal,
    });
  }

  // -------------------------------------------------------------------------
  // H. Application-Based Question Skill
  // -------------------------------------------------------------------------
  // Question Structure = Application-based
  // ApplicationQuestionScore = (Correct ApplicationQuestions / Total ApplicationQuestions) * 100
  // Trigger: Direct - ApplicationQuestionScore >= 20 (or AppScore < 50 with Direct >= 50) AND AppScore < 50
  const isAppQuestionGapTriggered =
    appStructureTotal > 0 &&
    appStructureScore < 50 &&
    ((directTotal > 0 && directScore - appStructureScore >= 20) || (appStructureScore < 50 && (directTotal === 0 || directScore >= 50)));

  if (isAppQuestionGapTriggered) {
    weaknessCandidates.push({
      name: 'Application-Based Question Skill',
      scorePercent: appStructureScore,
      priority: classifyPriority(appStructureScore),
      message: 'You handle direct questions well. Your next step is to practise applying the same concepts in unfamiliar situations.',
      triggerReason: directTotal > 0
        ? `Direct (${directScore}%) - Application-based (${appStructureScore}%) = ${directScore - appStructureScore} pts (>= 20)`
        : `Application-based question score is ${appStructureScore}% (< 50%)`,
      totalTested: appStructureTotal,
    });
  }

  // -------------------------------------------------------------------------
  // I. Direct-Question Dependency
  // -------------------------------------------------------------------------
  // DirectDependency = DirectScore - Average(ApplicationScore, MultiStepScore)
  // Trigger: difference >= 20 percentage points (and Direct >= 50%)
  let nonDirectAvg = 0;
  if (appStructureTotal > 0 && multiStepTotal > 0) {
    nonDirectAvg = (appStructureScore + multiStepScore) / 2;
  } else if (appStructureTotal > 0) {
    nonDirectAvg = appStructureScore;
  } else {
    nonDirectAvg = multiStepScore;
  }
  const directDependencyDiff = directScore - nonDirectAvg;
  const roundedNonDirect = Math.round(nonDirectAvg);

  if (directTotal > 0 && directScore >= 50 && (appStructureTotal > 0 || multiStepTotal > 0)) {
    if (directDependencyDiff >= 20 && roundedNonDirect < 50) {
      weaknessCandidates.push({
        name: 'Direct-Question Dependency',
        scorePercent: roundedNonDirect,
        priority: classifyPriority(roundedNonDirect),
        message: 'You are comfortable with familiar question formats. Your next step is to become equally confident with application-based and multi-step questions.',
        triggerReason: `Direct (${directScore}%) - Avg(App, MultiStep) (${roundedNonDirect}%) = ${Math.round(directDependencyDiff)} pts (>= 20)`,
        totalTested: appStructureTotal + multiStepTotal,
      });
    }
  }

  // -------------------------------------------------------------------------
  // Weakness Selection Logic:
  // 1. First 6 (A to F): Conceptual Understanding, Application Skill, Problem Solving Skill,
  //    Question Interpretation Skill, Accuracy, Difficulty Readiness
  // 2. Rest 3 (G to I): Multi-Step Question Skill, Application-Based Question Skill,
  //    Direct-Question Dependency
  // Mutual exclusion pairs (similar types):
  // - Problem Solving Skill & Multi-Step Question Skill -> do not both highlight
  // - Application Skill & Application-Based Question Skill -> do not both highlight
  // - Question Interpretation Skill & Direct-Question Dependency -> do not both highlight
  //
  // Strategy: Try to get up to 4 weaknesses from the First 6 (A to F) first.
  // Then consider the Rest 3 as long as their similar counterpart is not already included.
  // If fewer than 4 are found, display how much ever you got.
  // If none (0) found, check if any question took more time than expected.
  // If not, congratulate the student as before.
  // -------------------------------------------------------------------------
  const FIRST_6_NAMES = new Set([
    'Conceptual Understanding',
    'Application Skill',
    'Problem Solving Skill',
    'Question Interpretation Skill',
    'Accuracy',
    'Difficulty Readiness',
  ]);

  const candidatesFirst6 = weaknessCandidates
    .filter((c) => FIRST_6_NAMES.has(c.name))
    .sort((a, b) => {
      if (a.scorePercent !== b.scorePercent) return a.scorePercent - b.scorePercent;
      return b.totalTested - a.totalTested;
    });

  const candidatesRest3 = weaknessCandidates
    .filter((c) => !FIRST_6_NAMES.has(c.name))
    .sort((a, b) => {
      if (a.scorePercent !== b.scorePercent) return a.scorePercent - b.scorePercent;
      return b.totalTested - a.totalTested;
    });

  const selectedGaps: WeaknessCandidate[] = [];

  // Step 1: Take up to 4 from First 6
  for (const c of candidatesFirst6) {
    if (selectedGaps.length >= 4) break;
    selectedGaps.push(c);
  }

  // Step 2: If < 4, consider candidates from Rest 3 (G, H, I) as long as similar pair is not in selectedGaps
  const hasSelected = (name: string) => selectedGaps.some((g) => g.name === name);

  for (const c of candidatesRest3) {
    if (selectedGaps.length >= 4) break;

    // Check similarity exclusions:
    // Problem Solving Skill & Multi-Step Question Skill -> do not both highlight
    if (
      c.name === 'Multi-Step Question Skill' &&
      (hasSelected('Problem Solving Skill') || hasSelected('Problem-Solving Gap'))
    ) {
      continue;
    }
    // Application Skill & Application-Based Question Skill -> do not both highlight
    if (
      c.name === 'Application-Based Question Skill' &&
      (hasSelected('Application Skill') || hasSelected('Application Gap'))
    ) {
      continue;
    }
    // Question Interpretation Skill & Direct-Question Dependency -> do not both highlight
    if (
      c.name === 'Direct-Question Dependency' &&
      (hasSelected('Question Interpretation Skill') || hasSelected('Interpretation Gap'))
    ) {
      continue;
    }

    selectedGaps.push(c);
  }

  // Note: Time Management is evaluated in its own dedicated section (Page 2 for TMS >= 70%,
  // Page 3 for TMS < 70%) and is not included as a card in Priority Gaps (Weaknesses).
  // If 0 academic gaps < 50% are found, student receives the celebratory "No Weakness Areas Detected" achievement card.

  // Display only categories < 50% (up to 4)
  const priorityGaps: PriorityGapItem[] = selectedGaps
    .filter((item) => item.scorePercent < 50)
    .slice(0, 4)
    .map((item, idx) => ({
      rank: idx + 1,
      name: item.name,
      scorePercent: item.scorePercent,
      priority: item.priority,
      message: item.message,
      triggerReason: item.triggerReason,
    }));

  // Topics to Revisit
  // Rules:
  // 1. Unattempted questions: Flagged as 'Unattempted' (competency cannot be assessed without an attempt).
  // 2. Severe overtime (>= 2x limit): Flagged as 'Too Slow' (pacing bottleneck).
  // 3. Rushed response (< 8s) & Incorrect: Flagged as 'Too Fast but Incorrect' (rapid guesswork/hasty error).
  // 4. Normal pacing incorrect: Flagged as 'Conceptual / Calculation Gap'.
  // 5. Correct response within time limits or fast mastered: Excluded from revisit.
  const topicsToRevisit: TopicToRevisitItem[] = [];

  for (const q of evaluatedQuestions) {
    // 1. Unattempted
    if (!q.attempted || q.timeTakenSeconds === 0) {
      topicsToRevisit.push({
        qno: q.meta.qno,
        subject: q.meta.subject,
        chapter: q.meta.chapter,
        topic: q.meta.topic,
        issueObserved:
          'Unattempted. Since this question was not attempted, competency in this chapter could not be assessed.',
        category: 'Unattempted',
        recommendedFocusArea:
          q.meta.conceptTested || q.meta.prerequisiteConcept || q.meta.topic,
        timeTaken: q.timeTakenSeconds,
        expectedLimit: q.upperLimit,
        isCorrect: false,
        attempted: false,
      });
      continue;
    }

    // 2. Severe Overtime (>= 2x limit) -> 'Too Slow'
    if (q.timeTakenSeconds >= 2 * q.upperLimit) {
      const issueObserved = q.isCorrect
        ? `Too Slow: Correct response but required ${q.timeTakenSeconds}s (limit: ${q.upperLimit}s). Requires pacing refinement.`
        : `Too Slow: Required ${q.timeTakenSeconds}s (limit: ${q.upperLimit}s) and incorrect. High friction & deep conceptual bottleneck.`;

      const recommendedFocusArea = q.isCorrect
        ? q.meta.conceptTested || q.meta.topic || 'Solving Routine & Speed Drills'
        : q.meta.prerequisiteConcept || q.meta.conceptTested || q.meta.topic;

      topicsToRevisit.push({
        qno: q.meta.qno,
        subject: q.meta.subject,
        chapter: q.meta.chapter,
        topic: q.meta.topic,
        issueObserved,
        category: 'Too Slow',
        recommendedFocusArea,
        timeTaken: q.timeTakenSeconds,
        expectedLimit: q.upperLimit,
        isCorrect: q.isCorrect,
        attempted: true,
      });
      continue;
    }

    // 3. Too Fast & Incorrect (< 8s and incorrect) -> 'Too Fast but Incorrect'
    if (q.timeTakenSeconds < 8 && !q.isCorrect) {
      topicsToRevisit.push({
        qno: q.meta.qno,
        subject: q.meta.subject,
        chapter: q.meta.chapter,
        topic: q.meta.topic,
        issueObserved: `Too Fast but Incorrect: Answered in ${q.timeTakenSeconds}s (limit: ${q.upperLimit}s) and incorrect. Indicates rushed attempt or rapid guesswork.`,
        category: 'Too Fast but Incorrect',
        recommendedFocusArea:
          q.meta.prerequisiteConcept || q.meta.conceptTested || q.meta.topic,
        timeTaken: q.timeTakenSeconds,
        expectedLimit: q.upperLimit,
        isCorrect: false,
        attempted: true,
      });
      continue;
    }

    // 4. Normal pacing incorrect -> 'Conceptual / Calculation Gap'
    if (!q.isCorrect) {
      const category: RevisitCategory = 'Conceptual / Calculation Gap';

      const recommendedFocusArea =
        q.meta.prerequisiteConcept && q.meta.prerequisiteConcept.trim().length > 0
          ? `${q.meta.prerequisiteConcept} (Prerequisite Foundation)`
          : q.meta.conceptTested && q.meta.conceptTested.trim().length > 0
            ? q.meta.conceptTested
            : q.meta.topic;

      topicsToRevisit.push({
        qno: q.meta.qno,
        subject: q.meta.subject,
        chapter: q.meta.chapter,
        topic: q.meta.topic,
        issueObserved: `Incorrect response under normal pacing (${q.timeTakenSeconds}s). Indicates misconception or calculation error.`,
        category,
        recommendedFocusArea,
        timeTaken: q.timeTakenSeconds,
        expectedLimit: q.upperLimit,
        isCorrect: q.isCorrect,
        attempted: q.attempted,
      });
    }
  }

  // Dynamic Narrative Generation: Page 1 "YOUR KEY INSIGHT"
  let keyInsight = '';
  if (levelOfPreparation === 'Foundational') {
    keyInsight =
      'Every big achievement begins with a single step. This diagnostic test was designed to highlight where to begin your preparation, not to measure what you are capable of achieving. Board exams are structured and predictable, and with calm, step-by-step guidance starting from textbook basics, you will see your confidence and marks grow rapidly. Read through your report to discover your personalized comeback plan.';
  } else if (levelOfPreparation === 'Basic') {
    keyInsight =
      'You have started building your foundation for the Boards, and this is a good time to strengthen it further. Some gaps are currently making it difficult to consistently convert your understanding into marks. The good news is that these areas can be improved with focused practice. Read the report further to know where you can improve and how to perform better';
  } else {
    // Conceptually Strong or High achievement Potential
    keyInsight =
      'You have built a strong understanding of your Board-level concepts. Your next step is to turn this strong conceptual base into consistently high performance by practising questions that require deeper application, multiple steps and careful interpretation. Read the report further to identify the areas that can help you take your preparation to the next level.';
  }

  // Dynamic Narrative Generation: Page 2 "WHAT THIS TELLS YOU"
  const directPerf = structures.find((s) => s.type === 'Direct')?.percentage ?? 0;
  const multiStepPerf = structures.find((s) => s.type === 'Multi-step')?.percentage ?? 0;
  const diagramPerf = structures.find((s) => s.type === 'Diagram-based')?.percentage ?? 0;

  let performancePatternInsight = '';
  if (directPerf > multiStepPerf + 20) {
    performancePatternInsight = `You do very well on direct questions (${directPerf}%), but find long, multi-step problems challenging (${multiStepPerf}%). This shows you remember facts, definitions, and basic formulas well. However, when a question has 2 or 3 steps or long calculations, small mistakes happen. To score higher in Boards, practice breaking big questions into simple step-by-step parts and check your work at each step.`;
  } else if (diagramPerf < directPerf - 20) {
    performancePatternInsight = `You are comfortable with direct word problems, but lose marks on questions with diagrams and figures (${diagramPerf}%). This means reading values and clues from drawings or graphs needs more practice. In Science and Maths, regularly drawing and labelling ray diagrams, electric circuits, and geometric figures will help you answer these questions quickly and accurately.`;
  } else if (multiStepPerf >= 65 && directPerf >= 65) {
    performancePatternInsight = `You show strong balance across both direct questions (${directPerf}%) and multi-step problems (${multiStepPerf}%). You understand the concepts well and can apply them without just memorising. Moving forward, focus on managing your time better so you have enough time left in the exam to attempt tough questions calmly and recheck your answers.`;
  } else {
    performancePatternInsight = `You attempt straightforward questions with good confidence, but accuracy drops when questions become lengthy or combine multiple ideas. Practising more multi-step questions and diagram problems regularly will build your confidence and help you score more consistently across all chapters.`;
  }

  // Page 4: Detailed Diagnostic Calculation Steps & Audit Trail (Dev/Audit Mode)
  const calculationSteps: DiagnosticCalculationSteps = {
    scoring: {
      totalQuestionsN: N,
      rawScoreSum: totalRawScore,
      diagnosticWeightSum: totalDiagnosticWeight,
      weightedScoreSum: totalWeightedScore,
      briFraction: `${totalWeightedScore} / ${totalDiagnosticWeight}`,
      briResult: briScore,
      levelRule:
        briScore >= 70
          ? 'BRI >= 70% -> High achievement Potential'
          : briScore >= 50
            ? '50% <= BRI < 70% -> Conceptually Strong'
            : briScore >= 20
              ? '20% <= BRI < 50% -> Basic'
              : 'BRI < 20% -> Foundational',
      levelResult: levelOfPreparation,
    },
    breakdowns: [
      {
        area: 'Mathematics',
        filterCondition: "Subject == 'Maths'",
        matchingQuestions: mathsQs.map((q) => q.meta.qno),
        score: mathsPerf.score,
        total: mathsPerf.totalQuestions,
        formula: `(${mathsPerf.score} / ${mathsPerf.totalQuestions}) * 100%`,
        percentage: mathsPerf.percentage,
      },
      {
        area: 'Science',
        filterCondition: "Subject in ['Physics', 'Chemistry', 'Biology']",
        matchingQuestions: scienceQs.map((q) => q.meta.qno),
        score: sciencePerf.score,
        total: sciencePerf.totalQuestions,
        formula: `(${sciencePerf.score} / ${sciencePerf.totalQuestions}) * 100%`,
        percentage: sciencePerf.percentage,
      },
      {
        area: 'Easy Questions',
        filterCondition: "Difficulty == 'Easy'",
        matchingQuestions: easyQs.map((q) => q.meta.qno),
        score: easyPerf.score,
        total: easyPerf.totalQuestions,
        formula: `(${easyPerf.score} / ${easyPerf.totalQuestions}) * 100%`,
        percentage: easyPerf.percentage,
      },
      {
        area: 'Medium Questions',
        filterCondition: "Difficulty == 'Medium'",
        matchingQuestions: medQs.map((q) => q.meta.qno),
        score: medPerf.score,
        total: medPerf.totalQuestions,
        formula: `(${medPerf.score} / ${medPerf.totalQuestions}) * 100%`,
        percentage: medPerf.percentage,
      },
      {
        area: 'Difficult Questions',
        filterCondition: "Difficulty == 'Difficult'",
        matchingQuestions: diffQs.map((q) => q.meta.qno),
        score: diffPerf.score,
        total: diffPerf.totalQuestions,
        formula: `(${diffPerf.score} / ${diffPerf.totalQuestions}) * 100%`,
        percentage: diffPerf.percentage,
      },
    ],
    skills: [
      {
        skillName: 'Conceptual Foundation',
        filterCondition: "Primary Skill == 'Conceptual Foundation'",
        matchingQuestions: conceptualQs.map((q) => q.meta.qno),
        earnedWeights: conceptualFoundation.earnedWeight,
        totalWeights: conceptualFoundation.totalWeight,
        formula: `(${conceptualFoundation.earnedWeight} / ${conceptualFoundation.totalWeight}) * 100%`,
        percentage: conceptualFoundation.scorePercent,
        categoryRule: `Score > 66.67% ? Good : Score > 33.33% ? Average : Needs Strengthening`,
        categoryResult: conceptualFoundation.category,
      },
      {
        skillName: 'Concept Application Skill',
        filterCondition: "Primary Skill == 'Concept Application'",
        matchingQuestions: applicationQs.map((q) => q.meta.qno),
        earnedWeights: conceptApplication.earnedWeight,
        totalWeights: conceptApplication.totalWeight,
        formula: `(${conceptApplication.earnedWeight} / ${conceptApplication.totalWeight}) * 100%`,
        percentage: conceptApplication.scorePercent,
        categoryRule: `Score > 66.67% ? Good : Score > 33.33% ? Average : Needs Strengthening`,
        categoryResult: conceptApplication.category,
      },
      {
        skillName: 'Problem Solving Skill',
        filterCondition: "Primary Skill == 'Problem Solving'",
        matchingQuestions: problemSolvingQs.map((q) => q.meta.qno),
        earnedWeights: problemSolving.earnedWeight,
        totalWeights: problemSolving.totalWeight,
        formula: `(${problemSolving.earnedWeight} / ${problemSolving.totalWeight}) * 100%`,
        percentage: problemSolving.scorePercent,
        categoryRule: `Score > 66.67% ? Good : Score > 33.33% ? Average : Needs Strengthening`,
        categoryResult: problemSolving.category,
      },
      {
        skillName: 'Accuracy',
        filterCondition: 'Attempted == True',
        matchingQuestions: evaluatedQuestions.filter((q) => q.attempted).map((q) => q.meta.qno),
        earnedWeights: totalCorrect,
        totalWeights: totalAttempted,
        formula: `(${totalCorrect} / ${totalAttempted}) * 100%`,
        percentage: rawAccuracyPercent,
        categoryRule: `Accuracy > 66.67% ? Good : Accuracy > 33.33% ? Average : Needs Strengthening`,
        categoryResult: accuracyCategory,
      },
      {
        skillName: 'Question Interpretation Skill',
        filterCondition:
          'Secondary Skill contains "Interpretation" OR Structure contains "Data-based" / "Diagram-based" OR Visual Dependency == "High"',
        matchingQuestions: interpQs.map((q) => q.meta.qno),
        earnedWeights: questionInterpretation.earnedWeight,
        totalWeights: questionInterpretation.totalWeight,
        formula: `(${questionInterpretation.earnedWeight} / ${questionInterpretation.totalWeight}) * 100%`,
        percentage: questionInterpretation.scorePercent,
        categoryRule: `Score > 66.67% ? Good : Score > 33.33% ? Average : Needs Strengthening`,
        categoryResult: questionInterpretation.category,
      },
    ],
    structures: structures.map((st) => {
      const matchQs = evaluatedQuestions
        .filter((eq) => eq.meta.questionStructure.toLowerCase().includes(st.type.toLowerCase()))
        .map((eq) => eq.meta.qno);
      return {
        structureType: st.type,
        matchingQuestions: matchQs,
        correctCount: st.correct,
        totalCount: st.total,
        formula: `(${st.correct} / ${st.total}) * 100%`,
        percentage: st.percentage,
      };
    }),
    scienceDisciplineBreakdowns: [
      {
        discipline: 'Physics',
        score: physicsPerf.score,
        total: physicsPerf.totalQuestions,
        percentage: physicsPerf.percentage,
        formula: `(${physicsPerf.score} / ${physicsPerf.totalQuestions}) * 100%`,
        matchingQuestions: physicsQs.map((q) => q.meta.qno),
      },
      {
        discipline: 'Chemistry',
        score: chemistryPerf.score,
        total: chemistryPerf.totalQuestions,
        percentage: chemistryPerf.percentage,
        formula: `(${chemistryPerf.score} / ${chemistryPerf.totalQuestions}) * 100%`,
        matchingQuestions: chemistryQs.map((q) => q.meta.qno),
      },
      {
        discipline: 'Biology',
        score: biologyPerf.score,
        total: biologyPerf.totalQuestions,
        percentage: biologyPerf.percentage,
        formula: `(${biologyPerf.score} / ${biologyPerf.totalQuestions}) * 100%`,
        matchingQuestions: biologyQs.map((q) => q.meta.qno),
      },
    ],
    subjectDifficultyMatrix: [
      {
        subject: 'Mathematics',
        difficulty: 'Easy',
        score: mathsEasyScore,
        total: mathsEasyQs.length,
        percentage: mathsEasyQs.length > 0 ? Math.round((mathsEasyScore / mathsEasyQs.length) * 100) : 0,
        formula: `(${mathsEasyScore} / ${mathsEasyQs.length}) * 100%`,
      },
      {
        subject: 'Mathematics',
        difficulty: 'Medium',
        score: mathsMedScore,
        total: mathsMedQs.length,
        percentage: mathsMedQs.length > 0 ? Math.round((mathsMedScore / mathsMedQs.length) * 100) : 0,
        formula: `(${mathsMedScore} / ${mathsMedQs.length}) * 100%`,
      },
      {
        subject: 'Mathematics',
        difficulty: 'Difficult',
        score: mathsDiffScore,
        total: mathsDiffQs.length,
        percentage: mathsDiffQs.length > 0 ? Math.round((mathsDiffScore / mathsDiffQs.length) * 100) : 0,
        formula: `(${mathsDiffScore} / ${mathsDiffQs.length}) * 100%`,
      },
      {
        subject: 'Science',
        difficulty: 'Easy',
        score: scienceEasyScore,
        total: scienceEasyQs.length,
        percentage: scienceEasyQs.length > 0 ? Math.round((scienceEasyScore / scienceEasyQs.length) * 100) : 0,
        formula: `(${scienceEasyScore} / ${scienceEasyQs.length}) * 100%`,
      },
      {
        subject: 'Science',
        difficulty: 'Medium',
        score: scienceMedScore,
        total: scienceMedQs.length,
        percentage: scienceMedQs.length > 0 ? Math.round((scienceMedScore / scienceMedQs.length) * 100) : 0,
        formula: `(${scienceMedScore} / ${scienceMedQs.length}) * 100%`,
      },
      {
        subject: 'Science',
        difficulty: 'Difficult',
        score: scienceDiffScore,
        total: scienceDiffQs.length,
        percentage: scienceDiffQs.length > 0 ? Math.round((scienceDiffScore / scienceDiffQs.length) * 100) : 0,
        formula: `(${scienceDiffScore} / ${scienceDiffQs.length}) * 100%`,
      },
    ],
    strengthsRanking: top3Strengths.map((s) => ({
      rank: s.rank,
      name: s.name,
      percentage: s.percentage,
      scoreDetails: s.scoreDetails,
      reason: s.reason,
      tag: s.tag,
      isEmerging: s.isEmerging,
    })),
    priorityGapsRanking: priorityGaps.map((g) => ({
      rank: g.rank,
      name: g.name,
      scorePercent: g.scorePercent,
      priority: g.priority,
      ruleApplied:
        g.triggerReason ||
        (g.scorePercent < 25
          ? 'Score < 25% -> High Priority'
          : g.scorePercent <= 35
            ? '25% <= Score <= 35% -> Medium Priority'
            : '35% < Score < 50% -> Low Priority'),
      message: g.message,
    })),
    allWeaknessEvaluations: (() => {
      const getGapStatus = (
        name: string,
        isTriggered: boolean,
        score: number,
        pairCounterpartSelected?: boolean,
      ): {
        status: WeaknessEvaluationAuditItem['status'];
        selectedRank?: number;
        priority: PriorityLevel | 'Benchmark Met (>= 50%)';
      } => {
        const selectedGap = priorityGaps.find((g) => g.name === name);
        if (selectedGap) {
          return {
            status: 'Selected Priority Gap',
            selectedRank: selectedGap.rank,
            priority: selectedGap.priority,
          };
        }
        if (isTriggered) {
          if (pairCounterpartSelected) {
            return {
              status: 'Suppressed: Pair Exclusion',
              priority: classifyPriority(score),
            };
          }
          return {
            status: 'Suppressed: Top 4 Limit',
            priority: classifyPriority(score),
          };
        }
        if (score >= 50) {
          return {
            status: 'Benchmark Met (>= 50%)',
            priority: 'Benchmark Met (>= 50%)',
          };
        }
        return {
          status: 'Not Triggered',
          priority: classifyPriority(score),
        };
      };

      const items: WeaknessEvaluationAuditItem[] = [];

      // 1. Conceptual Understanding
      const concScore = Math.round(conceptualFoundation.scorePercent);
      const concTriggered = conceptualFoundation.totalWeight > 0 && conceptualFoundation.scorePercent < 50;
      const concStatus = getGapStatus('Conceptual Understanding', concTriggered, concScore);
      items.push({
        id: 'conceptual_gap',
        name: 'Conceptual Understanding',
        categoryType: 'Primary Skill',
        evaluatedScore: concScore,
        formula: conceptualFoundation.totalWeight > 0
          ? `(${conceptualFoundation.earnedWeight} / ${conceptualFoundation.totalWeight}) * 100%`
          : 'No items tested',
        thresholdCondition: 'Conceptual Foundation score < 50%',
        isTriggered: concTriggered,
        priority: concStatus.priority,
        status: concStatus.status,
        selectedRank: concStatus.selectedRank,
        triggerReason: conceptualFoundation.totalWeight > 0
          ? (concTriggered
              ? `Conceptual Foundation score is ${concScore}% (< 50%)`
              : `Conceptual Foundation score is ${concScore}% (>= 50% benchmark satisfied)`)
          : 'No conceptual foundation questions tested',
        message: 'You need to strengthen some fundamental concepts before moving confidently to more advanced questions.',
        totalTested: conceptualFoundation.totalWeight,
      });

      // 2. Application Skill
      const appTriggered = appSkillTotalWeight > 0 && appSkillScore < 50;
      const appPairSelected = hasSelected('Application-Based Question Skill') || hasSelected('Application-Based Question Gap');
      const appStatus = getGapStatus('Application Skill', appTriggered, appSkillScore, appPairSelected);
      items.push({
        id: 'application_gap',
        name: 'Application Skill',
        categoryType: 'Primary Skill',
        evaluatedScore: appSkillScore,
        formula: appSkillTotalWeight > 0
          ? `(${appSkillEarnedWeight} / ${appSkillTotalWeight}) * 100%`
          : 'No items tested',
        thresholdCondition: 'Concept Application score < 50%',
        isTriggered: appTriggered,
        priority: appStatus.priority,
        status: appStatus.status,
        selectedRank: appStatus.selectedRank,
        triggerReason: appSkillTotalWeight > 0
          ? (appTriggered
              ? `Application score is ${appSkillScore}% (< 50%)`
              : `Application score is ${appSkillScore}% (>= 50% benchmark satisfied)`)
          : 'No application questions tested',
        message: 'Your basic understanding is developing, but you need more practice using concepts in unfamiliar and application-based situations.',
        totalTested: appSkillTotalWeight,
      });

      // 3. Problem Solving Skill
      const psTriggered = Boolean(isPSTriggered && chosenPSScore < 50);
      const psPairSelected = hasSelected('Multi-Step Question Skill') || hasSelected('Multi-Step Question Gap');
      const psStatus = getGapStatus('Problem Solving Skill', psTriggered, chosenPSScore, psPairSelected);
      items.push({
        id: 'problem_solving_gap',
        name: 'Problem Solving Skill',
        categoryType: 'Cognitive Execution',
        evaluatedScore: chosenPSScore,
        formula: psScore < 50
          ? `(${problemSolving.earnedWeight} / ${problemSolving.totalWeight}) * 100%`
          : multiStepTotalWeight > 0
            ? `(${multiStepEarnedWeight} / ${multiStepTotalWeight}) * 100%`
            : `(${multiStepCorrect} / ${multiStepTotal}) * 100%`,
        thresholdCondition: 'PS < 50% OR MultiStep < 50% OR Direct - MultiStep >= 20%',
        isTriggered: psTriggered,
        priority: psStatus.priority,
        status: psStatus.status,
        selectedRank: psStatus.selectedRank,
        triggerReason: psTriggered
          ? (psScore < 50
              ? `Problem Solving score is ${psScore}% (< 50%)`
              : hasMS && msScoreToUse < 50
                ? `Multi-step score is ${msScoreToUse}% (< 50%)`
                : `Direct (${directScore}%) - Multi-step (${msScoreToUse}%) >= 20 pts`)
          : `Problem Solving score is ${chosenPSScore}% (>= 50% benchmark satisfied)`,
        message: 'You need more practice breaking complex problems into manageable steps and connecting ideas systematically.',
        totalTested: problemSolving.totalWeight,
      });

      // 4. Question Interpretation Skill
      const interpScore = Math.round(questionInterpretation.scorePercent);
      const interpTriggered = questionInterpretation.totalWeight > 0 && questionInterpretation.scorePercent < 50;
      const interpPairSelected = hasSelected('Direct-Question Dependency');
      const interpStatus = getGapStatus('Question Interpretation Skill', interpTriggered, interpScore, interpPairSelected);
      items.push({
        id: 'interpretation_gap',
        name: 'Question Interpretation Skill',
        categoryType: 'Visual & Data Skill',
        evaluatedScore: interpScore,
        formula: questionInterpretation.totalWeight > 0
          ? `(${questionInterpretation.earnedWeight} / ${questionInterpretation.totalWeight}) * 100%`
          : 'No items tested',
        thresholdCondition: 'Interpretation score < 50%',
        isTriggered: interpTriggered,
        priority: interpStatus.priority,
        status: interpStatus.status,
        selectedRank: interpStatus.selectedRank,
        triggerReason: questionInterpretation.totalWeight > 0
          ? (interpTriggered
              ? `Interpretation score is ${interpScore}% (< 50%)`
              : `Interpretation score is ${interpScore}% (>= 50% benchmark satisfied)`)
          : 'No visual or interpretation questions tested',
        message: 'Practise reading diagrams and data carefully, identifying the relevant information and using it correctly to reach the answer.',
        totalTested: questionInterpretation.totalWeight,
      });

      // 5. Accuracy
      const roundedAcc = Math.round(rawAccuracyPercent);
      const accTriggered = Boolean(totalAttempted > 0 && rawAccuracyPercent < 50 && hasConceptualOrAppMastery);
      const accStatus = getGapStatus('Accuracy', accTriggered, roundedAcc);
      items.push({
        id: 'accuracy_risk',
        name: 'Accuracy',
        categoryType: 'Execution Discipline',
        evaluatedScore: roundedAcc,
        formula: totalAttempted > 0 ? `(${totalCorrect} / ${totalAttempted}) * 100%` : '0%',
        thresholdCondition: 'Accuracy < 50% AND (Conceptual >= 50% OR Application >= 50%)',
        isTriggered: accTriggered,
        priority: accStatus.priority,
        status: accStatus.status,
        selectedRank: accStatus.selectedRank,
        triggerReason: accTriggered
          ? `Accuracy is ${roundedAcc}% (< 50%) despite conceptual/application competence (>= 50%)`
          : roundedAcc >= 50
            ? `Accuracy is ${roundedAcc}% (>= 50% benchmark satisfied)`
            : 'Accuracy criteria not triggered',
        message: 'You appear to understand several of the concepts tested, but avoidable errors may be costing you marks. Focus on careful calculation, reading and checking.',
        totalTested: totalAttempted,
      });

      // 6. Difficulty Readiness
      const diffReadyTriggered = Boolean(easyPerf.totalQuestions > 0 && easyPct >= 50 && (hasMedDrop || hasDiffDrop) && medDiffScore < 50);
      const diffReadyStatus = getGapStatus('Difficulty Readiness', diffReadyTriggered, medDiffScore);
      items.push({
        id: 'difficulty_readiness_gap',
        name: 'Difficulty Readiness',
        categoryType: 'Difficulty Progression',
        evaluatedScore: medDiffScore,
        formula: `Easy (${easyPct}%) vs Med (${medPct}%) & Diff (${diffPct}%)`,
        thresholdCondition: 'Easy >= 50% AND (Easy - Med >= 20% OR Easy - Diff >= 30%) AND Med/Diff < 50%',
        isTriggered: diffReadyTriggered,
        priority: diffReadyStatus.priority,
        status: diffReadyStatus.status,
        selectedRank: diffReadyStatus.selectedRank,
        triggerReason: diffReadyTriggered
          ? (hasMedDrop && hasDiffDrop
              ? `Easy (${easyPct}%) drops by >=20 on Medium (${medPct}%) and >=30 on Difficult (${diffPct}%)`
              : hasMedDrop
                ? `Easy (${easyPct}%) - Medium (${medPct}%) = ${easyPct - medPct} (>= 20)`
                : `Easy (${easyPct}%) - Difficult (${diffPct}%) = ${easyPct - diffPct} (>= 30)`)
          : medDiffScore >= 50
            ? `Medium/Difficult score is ${medDiffScore}% (>= 50% benchmark satisfied)`
            : 'No steep drop between Easy and Medium/Difficult questions',
        message: 'Your foundation is developing well, but you need to gradually build confidence with more challenging questions.',
        totalTested: medDiffTotal,
      });

      // 7. Multi-Step Question Skill
      const msPairExcluded = hasSelected('Problem Solving Skill') || hasSelected('Problem-Solving Gap');
      const msStatus = getGapStatus('Multi-Step Question Skill', isMultiStepGapTriggered, multiStepScore, msPairExcluded);
      items.push({
        id: 'multi_step_gap',
        name: 'Multi-Step Question Skill',
        categoryType: 'Question Architecture',
        evaluatedScore: multiStepScore,
        formula: multiStepTotal > 0 ? `(${multiStepCorrect} / ${multiStepTotal}) * 100%` : 'No items tested',
        thresholdCondition: 'MultiStep < 50% AND (Direct - MultiStep >= 20% OR Direct >= 50%)',
        isTriggered: Boolean(isMultiStepGapTriggered),
        priority: msStatus.priority,
        status: msStatus.status,
        selectedRank: msStatus.selectedRank,
        triggerReason: isMultiStepGapTriggered
          ? (directTotal > 0
              ? `Direct (${directScore}%) - Multi-step (${multiStepScore}%) = ${directScore - multiStepScore} pts (>= 20)`
              : `Multi-step score is ${multiStepScore}% (< 50%)`)
          : multiStepScore >= 50
            ? `Multi-step score is ${multiStepScore}% (>= 50% benchmark satisfied)`
            : 'Multi-step criteria not triggered',
        message: 'You are comfortable with direct questions, but questions requiring several connected steps are currently more challenging.',
        totalTested: multiStepTotal,
      });

      // 8. Application-Based Question Skill
      const appStructPairExcluded = hasSelected('Application Skill') || hasSelected('Application Gap');
      const appStructStatus = getGapStatus('Application-Based Question Skill', isAppQuestionGapTriggered, appStructureScore, appStructPairExcluded);
      items.push({
        id: 'application_based_gap',
        name: 'Application-Based Question Skill',
        categoryType: 'Question Architecture',
        evaluatedScore: appStructureScore,
        formula: appStructureTotal > 0 ? `(${appStructureCorrect} / ${appStructureTotal}) * 100%` : 'No items tested',
        thresholdCondition: 'AppStructure < 50% AND (Direct - AppStructure >= 20% OR Direct >= 50%)',
        isTriggered: Boolean(isAppQuestionGapTriggered),
        priority: appStructStatus.priority,
        status: appStructStatus.status,
        selectedRank: appStructStatus.selectedRank,
        triggerReason: isAppQuestionGapTriggered
          ? (directTotal > 0
              ? `Direct (${directScore}%) - Application-based (${appStructureScore}%) = ${directScore - appStructureScore} pts (>= 20)`
              : `Application-based question score is ${appStructureScore}% (< 50%)`)
          : appStructureScore >= 50
            ? `Application-based question score is ${appStructureScore}% (>= 50% benchmark satisfied)`
            : 'Application question criteria not triggered',
        message: 'You handle direct questions well. Your next step is to practise applying the same concepts in unfamiliar situations.',
        totalTested: appStructureTotal,
      });

      // 9. Direct-Question Dependency
      const directDepTriggered = Boolean(
        directTotal > 0 && directScore >= 50 && (appStructureTotal > 0 || multiStepTotal > 0) && directDependencyDiff >= 20 && roundedNonDirect < 50,
      );
      const directDepPairExcluded = hasSelected('Question Interpretation Skill') || hasSelected('Interpretation Gap');
      const directDepStatus = getGapStatus('Direct-Question Dependency', directDepTriggered, roundedNonDirect, directDepPairExcluded);
      items.push({
        id: 'direct_question_dependency',
        name: 'Direct-Question Dependency',
        categoryType: 'Structural Dependency',
        evaluatedScore: roundedNonDirect,
        formula: `Direct (${directScore}%) - Avg(App, MultiStep) (${roundedNonDirect}%) = ${Math.round(directDependencyDiff)} pts`,
        thresholdCondition: 'Direct >= 50% AND Direct - Avg >= 20% AND Avg < 50%',
        isTriggered: directDepTriggered,
        priority: directDepStatus.priority,
        status: directDepStatus.status,
        selectedRank: directDepStatus.selectedRank,
        triggerReason: directDepTriggered
          ? `Direct (${directScore}%) - Avg(App, MultiStep) (${roundedNonDirect}%) = ${Math.round(directDependencyDiff)} pts (>= 20)`
          : roundedNonDirect >= 50
            ? `Non-direct question average is ${roundedNonDirect}% (>= 50% benchmark satisfied)`
            : 'Direct-question dependency criteria not triggered',
        message: 'You are comfortable with familiar question formats. Your next step is to become equally confident with application-based and multi-step questions.',
        totalTested: appStructureTotal + multiStepTotal,
      });

      // 10. Pacing / Time Management (Fallback)
      const pacingGap = selectedGaps.find((g) => g.name === 'Pacing / Time Management');
      if (pacingGap) {
        items.push({
          id: 'pacing_time_management',
          name: 'Pacing / Time Management',
          categoryType: 'Pacing / Speed',
          evaluatedScore: pacingGap.scorePercent,
          formula: 'Limit / Time Taken * 100%',
          thresholdCondition: 'Fallback gap when 0 primary gaps found & question took severe overtime',
          isTriggered: true,
          priority: pacingGap.priority,
          status: 'Selected Priority Gap',
          selectedRank: 1,
          triggerReason: pacingGap.triggerReason,
          message: pacingGap.message,
          totalTested: 1,
        });
      }

      return items;
    })(),
    allChapterScores: chapterList.map((c) => ({
      chapter: c.name,
      subject: c.subject,
      correct: c.correct,
      total: c.total,
      percentage: c.percentage,
      priority: classifyPriority(c.percentage),
    })),
    timeManagement: {
      attemptedCount: timeManagement.attemptedCount,
      totalQuestions: timeManagement.totalQuestions,
      totalScore: timeManagement.totalScore,
      maxPossibleScore: timeManagement.maxPossibleScore,
      formula: `(${timeManagement.totalScore} / ${timeManagement.maxPossibleScore}) * 100%`,
      finalScorePercent: timeManagement.finalScorePercent,
      ratingRule: '>=85% Optimal, 70-84.99% Good, 50-69.99% Moderate, <50% Needs Intervention',
      ratingResult: timeManagement.rating,
      guessworkQuestions: timeManagement.guessworkQuestions,
      categoryCounts: timeManagement.categoryCounts,
    },
    questionAudit: evaluatedQuestions.map((eq) => {
      const isOvertime = eq.timeTakenSeconds > eq.upperLimit;
      const revisitItem = topicsToRevisit.find((t) => t.qno === eq.meta.qno);
      const timeItem = timeManagement.items.find((t) => t.qno === eq.meta.qno);

      return {
        qno: eq.meta.qno,
        subject: eq.meta.subject,
        chapter: eq.meta.chapter,
        topic: eq.meta.topic,
        difficulty: eq.meta.difficulty,
        primarySkill: eq.meta.primarySkill,
        secondarySkill: eq.meta.secondarySkill ?? null,
        questionStructure: eq.meta.questionStructure,
        visualDependency: eq.meta.visualDependency,
        expectedTimeRaw: eq.meta.expectedTime,
        expectedUpperBoundS: eq.upperLimit,
        expectedBenchmarkS: eq.benchmarkTime,
        timeTakenS: eq.timeTakenSeconds,
        timeLimitExceeded: isOvertime,
        timeManagementScore: timeItem?.score,
        timeManagementQi: timeItem?.qi,
        timeManagementCategory: timeItem?.category,
        timeManagementLabel: timeItem?.label,
        isGuesswork: timeItem?.isGuesswork,
        correctAnswer: eq.meta.answer,
        selectedOption: eq.selectedOption,
        attempted: eq.attempted,
        isCorrect: eq.isCorrect,
        diagnosticWeight: eq.weight,
        weightedScore: eq.isCorrect ? eq.weight : 0,
        revisitIssue: revisitItem ? revisitItem.issueObserved : null,
        revisitCategory: revisitItem ? revisitItem.category : null,
      };
    }),
  };

  // Generate Exact Plain Text Report Layout per Section 3 & Section 4 (Audit)
  const plainTextReport = generateReportPlainTextFormat({
    studentName: student.studentName,
    totalRawScore,
    totalQuestions: N,
    totalWeightedScore,
    totalDiagnosticWeight,
    briScore,
    levelOfPreparation,
    mathsScore: mathsPerf.score,
    mathsTotalQuestions: mathsPerf.totalQuestions,
    mathsPercentage: mathsPerf.percentage,
    scienceScore: sciencePerf.score,
    scienceTotalQuestions: sciencePerf.totalQuestions,
    sciencePercentage: sciencePerf.percentage,
    physicsPercentage: physicsPerf.percentage,
    chemistryPercentage: chemistryPerf.percentage,
    biologyPercentage: biologyPerf.percentage,
    easyScore: easyPerf.score,
    easyTotalQuestions: easyPerf.totalQuestions,
    mediumScore: medPerf.score,
    mediumTotalQuestions: medPerf.totalQuestions,
    difficultScore: diffPerf.score,
    difficultTotalQuestions: diffPerf.totalQuestions,
    conceptualFoundationCategory: conceptualFoundation.category,
    conceptApplicationCategory: conceptApplication.category,
    problemSolvingCategory: problemSolving.category,
    accuracyCategory,
    questionInterpretationCategory: questionInterpretation.category,
    keyInsight,
    strengthsTitle,
    top3Strengths,
    structures,
    performancePatternInsight,
    priorityGaps,
    topicsToRevisit,
    timeManagement,
    subjectDifficultyBreakdowns,
    calculationSteps,
  });

  return {
    studentName: student.studentName,
    studentGender: student.studentGender ?? null,
    totalQuestions: N,
    totalRawScore,
    totalDiagnosticWeight,
    totalWeightedScore,
    briScore,
    levelOfPreparation,
    breakdown: {
      mathematics: mathsPerf,
      science: sciencePerf,
      physics: physicsPerf,
      chemistry: chemistryPerf,
      biology: biologyPerf,
      easy: easyPerf,
      medium: medPerf,
      difficult: diffPerf,
      difficultyBySubject: subjectDifficultyBreakdowns,
    },
    subjectDifficultyBreakdowns,
    skills: {
      conceptualFoundation,
      conceptApplication,
      problemSolving,
      accuracy: {
        scorePercent: rawAccuracyPercent,
        category: accuracyCategory,
        correctCount: totalCorrect,
        attemptedCount: totalAttempted,
      },
      questionInterpretation,
    },
    structures,
    strengthsTitle,
    strengths: top3Strengths,
    priorityGaps,
    topicsToRevisit,
    timeManagement,
    keyInsight,
    performancePatternInsight,
    plainTextReport,
    calculationSteps,
  };
}

function generateReportPlainTextFormat(data: {
  studentName: string;
  totalRawScore: number;
  totalQuestions: number;
  totalWeightedScore: number;
  totalDiagnosticWeight: number;
  briScore: number;
  levelOfPreparation: PreparationLevel;
  mathsScore: number;
  mathsTotalQuestions: number;
  mathsPercentage: number;
  scienceScore: number;
  scienceTotalQuestions: number;
  sciencePercentage: number;
  physicsPercentage: number;
  chemistryPercentage: number;
  biologyPercentage: number;
  easyScore: number;
  easyTotalQuestions: number;
  mediumScore: number;
  mediumTotalQuestions: number;
  difficultScore: number;
  difficultTotalQuestions: number;
  conceptualFoundationCategory: SkillValueCategory;
  conceptApplicationCategory: SkillValueCategory;
  problemSolvingCategory: SkillValueCategory;
  accuracyCategory: SkillValueCategory;
  questionInterpretationCategory: SkillValueCategory;
  keyInsight: string;
  strengthsTitle?: string;
  top3Strengths: StrengthItem[];
  structures: QuestionStructurePerformance[];
  performancePatternInsight: string;
  priorityGaps: PriorityGapItem[];
  topicsToRevisit: TopicToRevisitItem[];
  timeManagement?: TimeManagementSummary;
  subjectDifficultyBreakdowns?: SubjectDifficultyBreakdowns;
  calculationSteps: DiagnosticCalculationSteps;
}): string {
  const lines: string[] = [];

  // PAGE 1
  lines.push('================================================================================');
  lines.push('PAGE 1: JEE ONLINE TEST REPORT');
  lines.push('================================================================================');
  lines.push('');
  lines.push('JEE ONLINE TEST REPORT');
  lines.push('');
  lines.push("For Parents: This report is best used as a starting point for understanding your child's current preparation and identifying where focused support can make the greatest difference.");
  lines.push('');
  lines.push(`Dear ${data.studentName},`);
  lines.push('');
  lines.push(
    'Congratulations on taking this first step towards becoming more Board-ready! Taking this diagnostic test shows that you care about your preparation and are willing to find out where you stand and how you can improve. Go through this report carefully—it will help you understand your strengths, identify the areas that need more attention, and know what to do next. If you use these insights well you can put yourself in a strong position to excel in your Class X Board examinations. Go ahead and explore further!',
  );
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('PERSONAL DIAGNOSTIC REPORT');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('');
  lines.push('YOUR BOARD READINESS SNAPSHOT');
  lines.push(`OVERALL RAW SCORE: ${data.totalRawScore} / ${data.totalQuestions}`);
  lines.push(`BOARD READINESS INDEX: ${data.briScore} / 100`);
  lines.push(`LEVEL OF PREPARATION: ${data.levelOfPreparation}`);
  if (data.timeManagement) {
    lines.push(
      `TIME MANAGEMENT SCORE: ${data.timeManagement.finalScorePercent}% (${data.timeManagement.rating} — ${data.timeManagement.totalScore}/${data.timeManagement.maxPossibleScore} pts on ${data.timeManagement.attemptedCount} attempted questions)`,
    );
  }
  lines.push('');
  lines.push('| Subject              | Score (%)                                    |');
  lines.push('|----------------------|----------------------------------------------|');
  lines.push(`| Mathematics          | ${String(data.mathsPercentage + '%').padEnd(44)} |`);
  lines.push(`| Science              | ${String(data.sciencePercentage + '%').padEnd(44)} |`);
  lines.push(`|   • Physics          | ${String(data.physicsPercentage + '%').padEnd(44)} |`);
  lines.push(`|   • Chemistry        | ${String(data.chemistryPercentage + '%').padEnd(44)} |`);
  lines.push(`|   • Biology          | ${String(data.biologyPercentage + '%').padEnd(44)} |`);
  lines.push('');
  const subjectInsight =
    data.mathsPercentage > data.sciencePercentage
      ? 'You seem to be doing better in Maths compared to Science.'
      : data.sciencePercentage > data.mathsPercentage
        ? 'You seem to be doing better in Science compared to Maths.'
        : 'Your performance in Maths and Science seems to be well balanced.';
  lines.push(`SUBJECT INSIGHT: ${subjectInsight}`);

  if (data.subjectDifficultyBreakdowns) {
    lines.push('');
    lines.push('DIFFICULTY LEVEL PERFORMANCE (PERCENTAGE SOLVED)');
    lines.push(
      `Mathematics: Easy: ${data.subjectDifficultyBreakdowns.mathematics.easy.percentage}%, Medium: ${data.subjectDifficultyBreakdowns.mathematics.medium.percentage}%, Hard: ${data.subjectDifficultyBreakdowns.mathematics.hard.percentage}%`,
    );
    lines.push(
      `Science: Easy: ${data.subjectDifficultyBreakdowns.science.easy.percentage}%, Medium: ${data.subjectDifficultyBreakdowns.science.medium.percentage}%, Hard: ${data.subjectDifficultyBreakdowns.science.hard.percentage}%`,
    );
  }

  if (data.timeManagement && data.timeManagement.guessworkQuestions.length > 0) {
    lines.push('');
    lines.push(
      `⚠️ GUESSWORK OBSERVATION: There is possibility of guesswork being done in answering Q${data.timeManagement.guessworkQuestions.join(', Q')} (response submitted in under 8s).`,
    );
  }

  lines.push('');
  lines.push('YOUR KEY INSIGHT');
  lines.push(data.keyInsight);
  lines.push('');

  // PAGE 2
  lines.push('================================================================================');
  lines.push('PAGE 2: YOUR STRENGTHS');
  lines.push('================================================================================');
  lines.push('');
  lines.push(data.strengthsTitle || 'YOUR STRENGTHS');
  data.top3Strengths.forEach((s) => {
    lines.push(`${s.rank}. ${s.name}: ${s.scoreDetails} — ${s.reason}`);
  });
  lines.push('');
  lines.push('YOUR PERFORMANCE PATTERN');
  lines.push('| Question Type     | Rating (up to 5 Stars)                         |');
  lines.push('|-------------------|------------------------------------------------|');
  data.structures.forEach((st) => {
    const starVal = Math.round((st.percentage / 100) * 5 * 10) / 10;
    const filledCount = Math.round(starVal);
    const starIcons = '★'.repeat(filledCount) + '☆'.repeat(5 - filledCount);
    lines.push(
      `| ${st.type.padEnd(17)} | ${(`${starIcons} (${starVal}/5 Stars)`).padEnd(46)} |`,
    );
  });
  lines.push('');
  lines.push('WHAT THIS TELLS YOU');
  lines.push(data.performancePatternInsight);
  lines.push('');

  // PAGE 3
  lines.push('================================================================================');
  lines.push('PAGE 3: WHERE SHOULD YOU IMPROVE?');
  lines.push('================================================================================');
  lines.push('');
  lines.push('Page 3: WHERE SHOULD YOU IMPROVE?');
  lines.push('');
  lines.push('YOUR PRIORITY GAPS');
  if (data.priorityGaps.length === 0) {
    lines.push('🎉 Congratulations! Outstanding performance — no weakness areas detected (< 50%). All evaluated categories scored 50% or above.');
  } else {
    data.priorityGaps.forEach((g) => {
      lines.push(`${g.rank}. ${g.name}: ${g.scorePercent}% — Priority: ${g.priority.replace(' Priority', '')}`);
      if (g.message) {
        lines.push(`   Guidance: ${g.message}`);
      }
    });
  }
  lines.push('');
  lines.push('TOPICS TO REVISIT');
  lines.push('List of topics where pacing or accuracy issues occurred during the test:');
  lines.push('');
  lines.push('| Q# | Subject | Chapter | Topic | Category |');
  lines.push('|---|---|---|---|---|');
  data.topicsToRevisit.forEach((t) => {
    lines.push(
      `| ${t.qno} | ${t.subject} | ${t.chapter} | ${t.topic} | ${t.category} |`,
    );
  });
  lines.push('');
  lines.push('*Topic observations are based only on the questions tested.*');
  lines.push('');

  // PAGE 4: RECOMMENDATIONS
  lines.push('================================================================================');
  lines.push('PAGE 4: RECOMMENDATIONS');
  lines.push('================================================================================');
  lines.push('');
  lines.push('PAGE 4: RECOMMENDATIONS');
  lines.push('');
  const prepNorm = String(data.levelOfPreparation || '').trim().toLowerCase();
  const isHighPrep = prepNorm.includes('high achievement') || prepNorm === 'advanced' || data.briScore >= 70;
  const isConceptuallyStrong = !isHighPrep && (prepNorm.includes('conceptually strong') || prepNorm === 'proficient' || data.briScore >= 50);
  const isVeryLow = !isHighPrep && !isConceptuallyStrong && (data.briScore < 20 || prepNorm.includes('foundational'));

  if (isHighPrep) {
    lines.push('HOW TO MOVE FROM STRONG TO EXCELLENT');
    lines.push('① Challenge yourself');
    lines.push('Do not spend all your practice time on questions you can already solve. Regularly include unfamiliar and higher-order problems.');
    lines.push('② Practise mixed problems');
    lines.push('Combine concepts from different chapters so that you practise identifying the method, not just applying a memorised formula.');
    lines.push('③ Analyse mistakes deeply');
    lines.push('When you make an error, understand the exact reason: conceptual gap, misinterpretation, or careless execution.');
    lines.push('④ Take timed practice seriously');
    lines.push('Simulate exam conditions with time-bound sets to build speed and accuracy under pressure.');
    lines.push('⑤ Polish presentation');
    lines.push('Write structured, step-by-step solutions following CBSE marking schemes.');
  } else if (isConceptuallyStrong) {
    lines.push('TURN YOUR CURRENT PERFORMANCE INTO STRONGER BOARD PREPARATION');
    lines.push('① Move beyond direct questions');
    lines.push('For every chapter you study, include application-based and multi-step questions—not only straightforward exercises.');
    lines.push('② Rework every important mistake');
    lines.push('After a test, first attempt the incorrect question again without seeing the solution. Then identify whether the issue was:');
    lines.push('Concept • Application • Accuracy • Interpretation');
    lines.push('③ Practise consistently');
    lines.push('A manageable amount of focused practice every day is more valuable than occasional long study sessions.');
    lines.push('④ Test yourself every 1–2 weeks');
    lines.push('Use mixed, timed questions to check whether your improvement is carrying across chapters.');
    lines.push('⑤ Shift towards Board-style practice');
    lines.push('As the examination approaches, progressively increase your practice of sample papers, case-based questions and mixed-chapter questions.');
  } else if (!isVeryLow) {
    lines.push('HOW TO BUILD A SOLID FOUNDATION');
    lines.push('① Focus on NCERT textbook fundamentals');
    lines.push('Master definitions, formulas, and solved examples before attempting advanced questions.');
    lines.push('② Targeted chapter-wise practice');
    lines.push('Strengthen high-weightage chapters first where marks can be gained quickly.');
    lines.push('③ Maintain a mistake notebook');
    lines.push('For every important mistake, record:');
    lines.push('What did I get wrong? → Why? → What is the correct approach?');
    lines.push('④ Test yourself regularly');
    lines.push('Take a short mixed test every 1–2 weeks and track whether the same mistakes are recurring.');
    lines.push('⑤ Master your prescribed textbook');
    lines.push('Become confident with examples and exercises before moving extensively to additional or advanced material.');
  } else {
    lines.push('START FRESH: BUILD YOUR BOARD CONFIDENCE');
    lines.push('① Reframe your starting baseline');
    lines.push('A diagnostic test is simply a tool to identify where to begin, not a measure of what you can achieve. Focus on steady improvement without exam anxiety.');
    lines.push('② Target quick-win chapters first');
    lines.push('Focus your initial effort on high-weightage, predictable chapters (such as Real Numbers and Statistics in Maths, and Chemical Reactions and Environment in Science) to lock in initial marks.');
    lines.push('③ Master NCERT solved examples by hand');
    lines.push('Put advanced reference books aside. Practice textbook solved examples line-by-line—writing the formula and given data alone secures valuable step marks in CBSE.');
    lines.push('④ Keep practice calm and consistent');
    lines.push('Avoid long, stressful study sessions. Solving just 3 to 5 simple textbook problems every day builds steady momentum and eliminates fear.');
    lines.push('⑤ Seek guidance without hesitation');
    lines.push('Most roadblocks come from minor past gaps that can be resolved quickly. Ask teachers or mentors early—difficult ideas become simple once explained clearly.');
  }
  lines.push('');
  lines.push('A NOTE FOR PARENTS');
  lines.push("Your child's report is meant to identify where their preparation stands today—not to label their ability.");
  if (isVeryLow) {
    lines.push("A special note for parents: A lower initial diagnostic score under timer pressure is completely normal. It is not a measure of your child's capability. With patient encouragement, regular daily practice, and small wins, students from this baseline routinely make fast, significant gains in marks.");
  }
  lines.push("The most useful support at this stage is to understand the areas highlighted in the report, encourage regular practice, and help your child maintain consistency without unnecessary pressure or comparison. Every student develops at a different pace. With the right guidance, focused practice and timely feedback, identified gaps can be strengthened significantly.");
  lines.push('');
  lines.push("We hope Shri Ram Smart Minds Academy could provide you and your child a good plan of action for Class X Board Exams. Wish you all the best! You may contact us if you need any further guidance for your child. Thanks!");
  lines.push('');

  // PAGE 5: NEED STRUCTURED SUPPORT? — SRSMA BOARD MASTERY COURSE
  lines.push('================================================================================');
  lines.push('PAGE 5: NEED STRUCTURED SUPPORT? — SRSMA BOARD MASTERY COURSE');
  lines.push('================================================================================');
  lines.push('Page 5: NEED STRUCTURED SUPPORT?');
  lines.push('We recommend joining our Board Mastery Course to excel in the upcoming Board Exams. Online, Offline and Combined Batches begin from 26th October onwards.');
  lines.push('SRSMA BOARD MASTERY COURSE');
  lines.push('');
  lines.push('WHY THIS COURSE?');
  lines.push('Knowing a chapter is not enough. Students must learn to solve unfamiliar, application-based questions.');
  lines.push('SRSMA Way: From knowing the chapter to confidently solving what comes next.');
  lines.push('');
  lines.push('THE CLASS X GAP');
  lines.push('School teaches the chapter → Basic examples are understood → Routine questions get done → Unfamiliar questions feel difficult');
  lines.push('• "I know the formula... but don\'t know when to use it."');
  lines.push('• "I understood the chapter... but can\'t solve a new question."');
  lines.push('• "I can score in familiar tests... but lose marks in tougher papers."');
  lines.push('SRSMA BOARD MASTERY COURSE CLOSES THIS GAP!');
  lines.push('');
  lines.push('THIS PROGRAMME IS IDEAL FOR STUDENTS WHO:');
  lines.push('✓ Have conceptual gaps');
  lines.push('✓ Want to improve Board marks');
  lines.push('✓ Find Maths or Science difficult');
  lines.push('✓ Want structured preparation outside school');
  lines.push('✓ Want stronger fundamentals before Class XI');
  lines.push('(Especially valuable for students who plan to choose MPC / BiPC after Class X)');
  lines.push('');
  lines.push('THE FOUR PILLARS OF THIS COURSE:');
  lines.push('1. Concept Clarity: Identify weak fundamentals and rebuild them from the ground up.');
  lines.push('2. Deep Practice: Move from basic → application → higher-order → Board-level questions.');
  lines.push('3. Performance Feedback: Tests reveal exactly where the student is losing marks — and what to improve.');
  lines.push('4. Exam Skills: Learn to approach questions, manage time & present answers effectively.');
  lines.push('');
  lines.push('THE 100 HOUR ROADMAP (100 hours. 12 weeks. One clear goal.):');
  lines.push('1. UNDERSTAND (Close the gaps — Maths & Science):');
  lines.push('   01. Strengthen weak fundamentals | 02. Understand concepts from first principles');
  lines.push('   03. Learn the why, not just the formula | 04. Connect concepts across chapters');
  lines.push('   05. Develop clear methods for solving problems');
  lines.push('2. MASTER (Practise. Apply. Solve.):');
  lines.push('   1. Basic: Concept-First questions | 2. Application: Exam-Style problems');
  lines.push('   3. Higher-Order: Competency questions | 4. Board Pattern: High-impact PYQs');
  lines.push('3. PERFORM (Test. Analyse. Improve.):');
  lines.push('   6 Full-Length Mock Tests (3 Maths + 3 Science)');
  lines.push('   Attempt → Analyse → Identify Mistakes → Correct → Improve');
  lines.push('NOT 100 HOURS OF LECTURES. IT\'S 100 HOURS OF GUIDED PREPARATION!');
  lines.push('');
  lines.push('STAR FACULTY GUIDING YOUR CHILD:');
  lines.push('• Mr. Amal M Das (B.Tech, IIT KGP | Program Coordinator & Maths HOD)');
  lines.push('• Mr. Brajesh (B.Tech, IIT Madras | Physics HOD)');
  lines.push('• Mr. Ninad (B.Tech, IIT Madras | Chemistry HOD)');
  lines.push('• Mr. Thirumala (M.Tech, NIT Warangal | Maths Faculty)');
  lines.push('');

  // PAGE 6 (DEVELOPMENT ONLY: DETAILED CALCULATION STEPS & AUDIT)
  const cs = data.calculationSteps;
  lines.push('================================================================================');
  lines.push('PAGE 6: DIAGNOSTIC AUDIT & CALCULATION STEPS (DEVELOPMENT ONLY)');
  lines.push('================================================================================');
  lines.push('');
  lines.push('PAGE 6 — DIAGNOSTIC AUDIT & CALCULATION STEPS');
  lines.push('DEVELOPMENT & AUDIT MODE: VERIFICATION TRACE FOR EVALUATION LOGIC');
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('1. SCORING & BOARD READINESS INDEX (BRI) CALCULATION STEPS');
  lines.push('--------------------------------------------------------------------------------');
  lines.push(`• Total Questions Evaluated (N): ${cs.scoring.totalQuestionsN}`);
  lines.push(`• Scoring Condition: Si = 1 if Attempted == true and SelectedOption == Answer; else 0`);
  lines.push(`• Total Raw Score: sum(Si) = ${cs.scoring.rawScoreSum} / ${cs.scoring.totalQuestionsN}`);
  lines.push(`• Total Diagnostic Weight (W_total): sum(Wi) = ${cs.scoring.diagnosticWeightSum} points`);
  lines.push(`• Total Weighted Score: sum(Si * Wi) = ${cs.scoring.weightedScoreSum} points`);
  lines.push(`• Board Readiness Index Formula:`);
  lines.push(`  BRI = (Total Weighted Score / Total Diagnostic Weight) * 100%`);
  lines.push(`  BRI = (${cs.scoring.weightedScoreSum} / ${cs.scoring.diagnosticWeightSum}) * 100% = ${cs.scoring.briResult}%`);
  lines.push(`• Level of Preparation Threshold Rules:`);
  lines.push(`  - BRI >= 70%                     -> High achievement Potential`);
  lines.push(`  - 50% <= BRI < 70%               -> Conceptually Strong`);
  lines.push(`  - 20% <= BRI < 50%               -> Basic`);
  lines.push(`  - BRI < 20%                      -> Foundational`);
  lines.push(`• Applied Rule: ${cs.scoring.levelRule} -> Level: ${cs.scoring.levelResult}`);
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('2. SUBJECT & DIFFICULTY BREAKDOWNS (CALCULATION STEPS)');
  lines.push('--------------------------------------------------------------------------------');
  cs.breakdowns.forEach((b) => {
    lines.push(`• ${b.area}:`);
    lines.push(`  - Filter Rule: ${b.filterCondition}`);
    lines.push(`  - Matching Questions: [${b.matchingQuestions.join(', ')}] (Total: ${b.total})`);
    lines.push(`  - Score: ${b.score} / ${b.total} -> Formula: ${b.formula} = ${b.percentage}%`);
  });
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('3. PRIMARY SKILLS & ACCURACY WEIGHTED DERIVATION STEPS');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('• Classification Thresholds:');
  lines.push('  - Good: Score > 66.67%');
  lines.push('  - Average: 33.33% < Score <= 66.67%');
  lines.push('  - Needs Strengthening: Score <= 33.33%');
  lines.push('');
  cs.skills.forEach((s) => {
    lines.push(`• ${s.skillName}:`);
    lines.push(`  - Filter: ${s.filterCondition}`);
    lines.push(`  - Questions: [${s.matchingQuestions.join(', ')}]`);
    lines.push(`  - Weighted Sum: Earned ${s.earnedWeights} / Total ${s.totalWeights} points`);
    lines.push(`  - Calculation: ${s.formula} = ${s.percentage}% -> Category: ${s.categoryResult}`);
  });
  lines.push('');
  if (cs.timeManagement) {
    lines.push('--------------------------------------------------------------------------------');
    lines.push('4. TIME MANAGEMENT & PACING CALCULATION STEPS (TMS)');
    lines.push('--------------------------------------------------------------------------------');
    lines.push(`• Total Questions (N): ${cs.timeManagement.totalQuestions}`);
    lines.push(`• Total Attempted Questions: ${cs.timeManagement.attemptedCount}`);
    lines.push(`• Piecewise Scoring Rules:`);
    lines.push(`  - Unattempted: Qi = 0.0 (UNATTEMPTED)`);
    lines.push(`  - Correct, ratio <= 1.0: Qi = 1.0 (EFFICIENT_MASTERY)`);
    lines.push(`  - Correct, ratio > 1.0: Qi = max(0.25, 1.0 / ratio) (OVER_INVESTED_SUCCESS)`);
    lines.push(`  - Incorrect, ratio < 0.70: Qi = 0.50 * (ratio / 0.70) (CARELESS_RUSHING)`);
    lines.push(`  - Incorrect, 0.70 <= ratio <= 1.30: Qi = 0.50 (DISCIPLINED_ATTEMPT)`);
    lines.push(`  - Incorrect, ratio > 1.30: Qi = max(0.0, 0.50 - 0.50 * (ratio - 1.30)) (TIME_TRAP)`);
    lines.push(`• Total Qi Score: ${cs.timeManagement.totalScore} / ${cs.timeManagement.maxPossibleScore} points (Diagnostic Weighted)`);
    lines.push(`• Time Management Formula: (Σ (Qi * Wi) / Σ Wi) * 100%`);
    lines.push(`  Calculation: ${cs.timeManagement.formula} = ${cs.timeManagement.finalScorePercent}%`);
    lines.push(`• Rating Bands: >= 85% (Optimal) | 70-84.99% (Good) | 50-69.99% (Moderate) | < 50% (Needs Intervention)`);
    lines.push(`• Final Rating: ${cs.timeManagement.ratingResult}`);
    if (cs.timeManagement.guessworkQuestions.length > 0) {
      lines.push(`• Guesswork Flag (<8s): [Q${cs.timeManagement.guessworkQuestions.join(', Q')}]`);
    } else {
      lines.push(`• Guesswork Flag (<8s): None detected`);
    }
    lines.push('');
  }
  lines.push('--------------------------------------------------------------------------------');
  lines.push('5. 7 QUESTION STRUCTURE PERFORMANCE BREAKDOWN');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('| Question Type     | Matching Questions        | Correct / Total | Performance (%) |');
  lines.push('|-------------------|---------------------------|-----------------|-----------------|');
  cs.structures.forEach((st) => {
    lines.push(
      `| ${st.structureType.padEnd(17)} | ${('Q' + st.matchingQuestions.join(', Q')).padEnd(25)} | ${(st.correctCount + ' / ' + st.totalCount).padEnd(15)} | ${String(st.percentage + '%').padEnd(15)} |`,
    );
  });
  lines.push('');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('6. COMPLETE QUESTION-BY-QUESTION EVALUATION AUDIT');
  lines.push('--------------------------------------------------------------------------------');
  lines.push('| Q# | Subject | Chapter | Weight | Ans | Att? | Sel | Corr? | Spent | ETS | Time Label (Score) | Guess? | Issue |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  cs.questionAudit.forEach((a) => {
    lines.push(
      `| ${a.qno} | ${a.subject} | ${a.chapter} | ${a.diagnosticWeight} | ${a.correctAnswer} | ${a.attempted ? 'Yes' : 'No'} | ${a.selectedOption ?? '—'} | ${a.isCorrect ? 'Yes' : 'No'} | ${a.timeTakenS}s | ${a.expectedUpperBoundS}s | ${a.timeManagementLabel ?? '—'} (${a.timeManagementScore ?? '—'}) | ${a.isGuesswork ? 'YES' : 'No'} | ${a.revisitCategory ?? 'None'} |`,
    );
  });
  lines.push('');
  lines.push('*End of Diagnostic Audit Report (Page 4)*');

  return lines.join('\n');
}

export const SAMPLE_20_METADATA: QuestionMetadataItem[] = [
  {
    qno: 1,
    subject: 'Maths',
    chapter: 'Real Numbers',
    topic: 'HCF & LCM',
    conceptTested: 'Relationship between HCF and LCM',
    prerequisiteConcept: 'HCF/LCM concept',
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '45,60',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 2,
    subject: 'Maths',
    chapter: 'Polynomials',
    topic: 'Zeros of a Polynomial',
    conceptTested: 'Product of roots and zeros of a quadratic polynomial',
    prerequisiteConcept: 'Roots/zeros of quadratic polynomial',
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'C',
    diagnosticWeight: 1,
  },
  {
    qno: 3,
    subject: 'Maths',
    chapter: 'Pair of Linear Equations in Two Variables',
    topic: 'Consistency of Linear Equations',
    conceptTested: 'Condition for infinite solutions',
    prerequisiteConcept: 'Coincident lines / ratios condition',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Calculation',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'C',
    diagnosticWeight: 1,
  },
  {
    qno: 4,
    subject: 'Maths',
    chapter: 'Coordinate Geometry',
    topic: 'Distance Formula',
    conceptTested: 'Distance from origin',
    prerequisiteConcept: 'Distance formula / Pythagoras theorem',
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 5,
    subject: 'Maths',
    chapter: 'Triangles',
    topic: 'Basic Proportionality Theorem (Thales Theorem)',
    conceptTested: 'Application of BPT in a triangle',
    prerequisiteConcept: 'Ratio of sides / Thales theorem',
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '45,60',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 6,
    subject: 'Maths',
    chapter: 'Circles',
    topic: 'Tangents to a Circle',
    conceptTested: 'Equal tangents from an external point',
    prerequisiteConcept: 'Tangent properties / circle geometry',
    difficulty: 'Medium',
    primarySkill: 'Concept Application',
    secondarySkill: 'Visual Interpretation',
    questionStructure: 'Diagram-based, Multi-step',
    visualDependency: 'High',
    expectedTime: '75,90',
    answer: 'A',
    diagnosticWeight: 2,
  },
  {
    qno: 7,
    subject: 'Maths',
    chapter: 'Statistics',
    topic: 'Median & Mode',
    conceptTested: 'Identifying median and modal classes',
    prerequisiteConcept: 'Cumulative frequency / frequency distribution',
    difficulty: 'Medium',
    primarySkill: 'Concept Application',
    secondarySkill: 'Interpretation',
    questionStructure: 'Data-based',
    visualDependency: 'Medium',
    expectedTime: '60,75',
    answer: 'B',
    diagnosticWeight: 2,
  },
  {
    qno: 8,
    subject: 'Maths',
    chapter: 'Quadratic Equations',
    topic: 'Relationship between roots and coefficients',
    conceptTested: 'Relationship between roots and coefficients of the quadratic equation',
    prerequisiteConcept: 'Relationship between roots and coefficients of the quadratic equation',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Calculation',
    questionStructure: 'Multi-step',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 9,
    subject: 'Maths',
    chapter: 'Introduction to Trigonometry',
    topic: 'Trigonometric Ratios',
    conceptTested: 'Finding angle using tan ratio',
    prerequisiteConcept: 'Right triangle / trig ratios',
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Interpretation',
    questionStructure: 'Word problem',
    visualDependency: 'None',
    expectedTime: '60,75',
    answer: 'C',
    diagnosticWeight: 2,
  },
  {
    qno: 10,
    subject: 'Maths',
    chapter: 'Surface Areas & Volumes',
    topic: 'Volume of Combined Solids',
    conceptTested: 'Volume of cone + hemisphere',
    prerequisiteConcept: 'Volume formulas',
    difficulty: 'Difficult',
    primarySkill: 'Problem Solving',
    secondarySkill: 'Calculation',
    questionStructure: 'Multi-step',
    visualDependency: 'Low',
    expectedTime: '90,120',
    answer: 'C',
    diagnosticWeight: 2,
  },
  {
    qno: 11,
    subject: 'Physics',
    chapter: 'Magnetic Effects of Electric Current',
    topic: 'Magnetic field due to current-carrying conductor',
    conceptTested: 'Direction of magnetic field around a straight current-carrying conductor',
    prerequisiteConcept: 'Right-hand thumb rule / magnetic field around current-carrying wire',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Visual Interpretation',
    questionStructure: 'Diagram-based',
    visualDependency: 'High',
    expectedTime: '30,45',
    answer: 'D',
    diagnosticWeight: 1,
  },
  {
    qno: 12,
    subject: 'Physics',
    chapter: 'Light – Reflection and Refraction',
    topic: 'Image formation by concave lens',
    conceptTested: 'Lens formula and image formation by a concave lens',
    prerequisiteConcept: 'Sign convention + lens formula',
    difficulty: 'Medium',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation, Procedural Accuracy',
    questionStructure: 'Direct',
    visualDependency: 'Low',
    expectedTime: '60,75',
    answer: 'C',
    diagnosticWeight: 2,
  },
  {
    qno: 13,
    subject: 'Physics',
    chapter: 'Electricity',
    topic: 'Combination of resistors / effective resistance',
    conceptTested: 'Reduction of complex resistor network + potential difference across a resistor',
    prerequisiteConcept: "Series and parallel combinations; Ohm's law; potential difference",
    difficulty: 'Difficult',
    primarySkill: 'Problem Solving',
    secondarySkill: 'Logical / Analytical Reasoning',
    questionStructure: 'Diagram-based, Multi-step',
    visualDependency: 'High',
    expectedTime: '90,120',
    answer: 'D',
    diagnosticWeight: 3,
  },
  {
    qno: 14,
    subject: 'Physics',
    chapter: 'Electricity',
    topic: 'Power',
    conceptTested: 'Relationship between potential difference, current and resistance',
    prerequisiteConcept: "Ohm's law",
    difficulty: 'Easy',
    primarySkill: 'Concept Application',
    secondarySkill: 'Calculation, Procedural Accuracy',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 15,
    subject: 'Chemistry',
    chapter: 'Chemical Reactions and Equations',
    topic: 'Oxidation and Reduction / Reducing Agent',
    conceptTested: 'Identification of the reducing agent in a redox reaction',
    prerequisiteConcept: 'Oxidation and reduction; electron transfer / oxygen-hydrogen concept',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Logical / Analytical Reasoning',
    questionStructure: 'Direct',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'A',
    diagnosticWeight: 1,
  },
  {
    qno: 16,
    subject: 'Chemistry',
    chapter: 'Acids, Bases and Salts',
    topic: 'pH and Hydrogen Ion Concentration',
    conceptTested: 'Relationship between pH and hydrogen ion concentration',
    prerequisiteConcept: 'pH scale; meaning of acidic/basic strength',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Interpretation',
    questionStructure: 'Data-based',
    visualDependency: 'None',
    expectedTime: '30,45',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 17,
    subject: 'Chemistry',
    chapter: 'Metals and Non-metals',
    topic: 'Thermite Reaction / Reactivity of Metals',
    conceptTested: 'Aluminum displaces iron from iron oxide in a highly exothermic thermite reaction',
    prerequisiteConcept: 'Reactivity series; displacement reactions; properties of metals',
    difficulty: 'Difficult',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Application',
    questionStructure: 'Diagram-based, Application-based',
    visualDependency: 'High',
    expectedTime: '60,90',
    answer: 'C',
    diagnosticWeight: 3,
  },
  {
    qno: 18,
    subject: 'Chemistry',
    chapter: 'Carbon and Its Compounds',
    topic: 'Functional Groups / Carboxylic Acids',
    conceptTested: 'Identification of the functional group that reacts with baking soda to release CO₂',
    prerequisiteConcept: 'Functional groups; properties of carboxylic acids; acid-carbonate reaction',
    difficulty: 'Medium',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Application',
    questionStructure: 'Structure-based',
    visualDependency: 'High',
    expectedTime: '45,60',
    answer: 'D',
    diagnosticWeight: 2,
  },
  {
    qno: 19,
    subject: 'Biology',
    chapter: 'Life Processes',
    topic: 'Stomata and Gaseous Exchange',
    conceptTested: 'Role of water movement and guard-cell turgidity in opening stomata',
    prerequisiteConcept: 'Structure of stomata; guard cells; osmosis / turgidity',
    difficulty: 'Easy',
    primarySkill: 'Conceptual Foundation',
    secondarySkill: 'Visual Interpretation',
    questionStructure: 'Diagram-based',
    visualDependency: 'Low',
    expectedTime: '45,60',
    answer: 'B',
    diagnosticWeight: 1,
  },
  {
    qno: 20,
    subject: 'Biology',
    chapter: 'Heredity and Evolution',
    topic: 'Mendelian Inheritance / Monohybrid Cross',
    conceptTested: 'Expected proportion of heterozygous tall plants in F₂ generation',
    prerequisiteConcept: 'Dominant/recessive traits; genotype; monohybrid cross',
    difficulty: 'Medium',
    primarySkill: 'Concept Application',
    secondarySkill: 'Logical / Analytical Reasoning',
    questionStructure: 'Multi-step, Application-based',
    visualDependency: 'Low',
    expectedTime: '60,75',
    answer: 'B',
    diagnosticWeight: 2,
  },
];

export function getSampleDiagnosticReport(studentName = 'Aarav Sharma'): DiagnosticEvaluationResult {
  const responses: StudentQuestionResponse[] = SAMPLE_20_METADATA.map((m, idx) => {
    if (idx < 5) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer, timeTakenSeconds: 38 };
    }
    if (idx === 5) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer, timeTakenSeconds: 95 };
    }
    if (idx === 6) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer === 'A' ? 'B' : 'A', timeTakenSeconds: 45 };
    }
    if (idx === 7) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer === 'C' ? 'D' : 'C', timeTakenSeconds: 130 };
    }
    if (idx < 12) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer, timeTakenSeconds: 48 };
    }
    if (idx === 12) {
      return { qno: m.qno, attempted: false, selectedOption: null, timeTakenSeconds: 10 };
    }
    if (idx < 16) {
      return { qno: m.qno, attempted: true, selectedOption: m.answer, timeTakenSeconds: 55 };
    }
    return { qno: m.qno, attempted: false, selectedOption: null, timeTakenSeconds: 5 };
  });

  return evaluateDiagnosticReport(SAMPLE_20_METADATA, {
    studentName,
    responses,
  });
}
