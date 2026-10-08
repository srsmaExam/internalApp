import { describe, expect, it } from 'vitest';
import {
  evaluateDiagnosticReport,
  classifySkillValue,
  classifyPreparationLevel,
  classifyPriority,
  parseExpectedTimeUpperBound,
  parseExpectedTimeBenchmark,
  parseExpectedTimeRange,
  getQuestionETS,
  evaluateQuestionTimeManagement,
  classifyTimeManagementBand,
  classifyTimeManagementRating,
  evaluateTimeManagement,
  type QuestionMetadataItem,
  type StudentResponsePayload,
} from './diagnostic-evaluator';

describe('SRSMA Diagnostic Evaluator', () => {
  const sampleMetadata: QuestionMetadataItem[] = [
    {
      qno: 1,
      subject: 'Maths',
      chapter: 'Real Numbers',
      topic: 'HCF & LCM',
      difficulty: 'Easy',
      primarySkill: 'Concept Application',
      secondarySkill: 'Calculation',
      questionStructure: 'Direct',
      visualDependency: 'None',
      expectedTime: '45–60 sec',
      answer: 'B',
      diagnosticWeight: 1,
      conceptTested: 'Relationship between HCF and LCM',
      prerequisiteConcept: 'HCF/LCM concept',
    },
    {
      qno: 2,
      subject: 'Maths',
      chapter: 'Polynomials',
      topic: 'Zeroes of a Polynomial',
      difficulty: 'Easy',
      primarySkill: 'Concept Application',
      secondarySkill: 'Reasoning',
      questionStructure: 'Direct',
      visualDependency: 'None',
      expectedTime: '30–45 sec',
      answer: 'C',
      diagnosticWeight: 1,
      conceptTested: 'Relationship between zeroes and coefficients',
      prerequisiteConcept: 'Quadratic polynomial / factorisation',
    },
    {
      qno: 3,
      subject: 'Maths',
      chapter: 'Triangles',
      topic: 'Similarity of Triangles',
      difficulty: 'Difficult',
      primarySkill: 'Problem Solving',
      secondarySkill: 'Visual Interpretation',
      questionStructure: 'Diagram-based, Multi-step',
      visualDependency: 'High',
      expectedTime: '90–120 sec',
      answer: 'C',
      diagnosticWeight: 3,
      conceptTested: 'Similar triangles / geometric mean relation',
      prerequisiteConcept: 'Similarity criteria, right triangle',
    },
    {
      qno: 4,
      subject: 'Physics',
      chapter: 'Electricity',
      topic: 'Resistors',
      difficulty: 'Difficult',
      primarySkill: 'Problem Solving',
      secondarySkill: 'Logical / Analytical Reasoning',
      questionStructure: 'Diagram-based, Multi-step',
      visualDependency: 'High',
      expectedTime: '90–120 sec',
      answer: 'D',
      diagnosticWeight: 3,
      conceptTested: 'Resistor network reduction',
      prerequisiteConcept: "Ohm's law",
    },
    {
      qno: 5,
      subject: 'Chemistry',
      chapter: 'Chemical Reactions and Equations',
      topic: 'Oxidation and Reduction',
      difficulty: 'Easy',
      primarySkill: 'Conceptual Foundation',
      secondarySkill: 'Interpretation',
      questionStructure: 'Direct',
      visualDependency: 'None',
      expectedTime: '30–45 sec',
      answer: 'A',
      diagnosticWeight: 1,
      conceptTested: 'Reducing agent identification',
      prerequisiteConcept: 'Redox reactions',
    },
  ];

  it('correctly classifies skill values and thresholds', () => {
    expect(classifySkillValue(80)).toBe('Good');
    expect(classifySkillValue(66.7)).toBe('Good');
    expect(classifySkillValue(50)).toBe('Average');
    expect(classifySkillValue(33.34)).toBe('Average');
    expect(classifySkillValue(33.33)).toBe('Needs Strengthening');
    expect(classifySkillValue(20)).toBe('Needs Strengthening');
  });

  it('correctly classifies preparation level', () => {
    expect(classifyPreparationLevel(85)).toBe('High achievement Potential');
    expect(classifyPreparationLevel(80)).toBe('High achievement Potential');
    expect(classifyPreparationLevel(75)).toBe('High achievement Potential');
    expect(classifyPreparationLevel(70)).toBe('High achievement Potential');
    expect(classifyPreparationLevel(69.9)).toBe('Conceptually Strong');
    expect(classifyPreparationLevel(60)).toBe('Conceptually Strong');
    expect(classifyPreparationLevel(50)).toBe('Conceptually Strong');
    expect(classifyPreparationLevel(49.9)).toBe('Basic');
    expect(classifyPreparationLevel(40)).toBe('Basic');
    expect(classifyPreparationLevel(35)).toBe('Basic');
    expect(classifyPreparationLevel(20)).toBe('Basic');
    expect(classifyPreparationLevel(19.9)).toBe('Foundational');
    expect(classifyPreparationLevel(10)).toBe('Foundational');
  });

  it('correctly classifies priority levels', () => {
    expect(classifyPriority(20)).toBe('High Priority');
    expect(classifyPriority(24.9)).toBe('High Priority');
    expect(classifyPriority(25)).toBe('Medium Priority');
    expect(classifyPriority(35)).toBe('Medium Priority');
    expect(classifyPriority(36)).toBe('Low Priority');
    expect(classifyPriority(49.9)).toBe('Low Priority');
  });

  it('parses expected time upper bound correctly', () => {
    expect(parseExpectedTimeUpperBound('45–60 sec')).toBe(60);
    expect(parseExpectedTimeUpperBound('30-45 sec')).toBe(45);
    expect(parseExpectedTimeUpperBound('45,60')).toBe(60);
    expect(parseExpectedTimeUpperBound('90–120 sec')).toBe(120);
    expect(parseExpectedTimeUpperBound('30')).toBe(30);
  });

  it('evaluates student attempt and computes BRI and breakdowns dynamically', () => {
    const studentPayload: StudentResponsePayload = {
      studentName: 'Aarav Sharma',
      responses: [
        { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 40 }, // Correct, within time (40 <= 60) -> Excluded
        { qno: 2, attempted: true, selectedOption: 'C', timeTakenSeconds: 100 }, // Correct, severe overtime (100 >= 2 * 45 = 90s) -> Pacing flag with severe overtime!
        { qno: 3, attempted: true, selectedOption: 'A', timeTakenSeconds: 100 }, // Wrong (A != C), attempted (>10s) -> Conceptual gap
        { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 130 }, // Correct, slight overtime (130 < 240) -> Excluded
        { qno: 5, attempted: false, selectedOption: null, timeTakenSeconds: 0 }, // Unattempted (0s <= 10s) -> Excluded
      ],
    };

    const result = evaluateDiagnosticReport(sampleMetadata, studentPayload);

    // Total questions: 5
    expect(result.totalQuestions).toBe(5);
    // Raw score: Q1, Q2, Q4 are correct => 3
    expect(result.totalRawScore).toBe(3);

    // Total weight: Q1(1) + Q2(1) + Q3(3) + Q4(3) + Q5(1) = 9
    expect(result.totalDiagnosticWeight).toBe(9);
    // Weighted score: Q1(1) + Q2(1) + Q4(3) = 5
    expect(result.totalWeightedScore).toBe(5);

    // BRI = (5 / 9) * 100 = 55.6% (in [50%, 70%) -> Conceptually Strong)
    expect(result.briScore).toBeCloseTo(55.6, 1);
    expect(result.levelOfPreparation).toBe('Conceptually Strong');
    expect(result.keyInsight).toBe(
      'You have built a strong understanding of your Board-level concepts. Your next step is to turn this strong conceptual base into consistently high performance by practising questions that require deeper application, multiple steps and careful interpretation. Read the report further to identify the areas that can help you take your preparation to the next level.',
    );

    // Subject performance:
    // Maths: Q1, Q2, Q3 (total 3). Correct: Q1, Q2 => 2/3
    expect(result.breakdown.mathematics.score).toBe(2);
    expect(result.breakdown.mathematics.totalQuestions).toBe(3);

    // Science: Q4 (Physics), Q5 (Chemistry) (total 2). Correct: Q4 => 1/2
    expect(result.breakdown.science.score).toBe(1);
    expect(result.breakdown.science.totalQuestions).toBe(2);

    // Science Subdivisions (Physics, Chemistry, Biology)
    expect(result.breakdown.physics.score).toBe(1);
    expect(result.breakdown.physics.totalQuestions).toBe(1);
    expect(result.breakdown.physics.percentage).toBe(100);
    expect(result.breakdown.chemistry.score).toBe(0);
    expect(result.breakdown.chemistry.totalQuestions).toBe(1);
    expect(result.breakdown.chemistry.percentage).toBe(0);
    expect(result.breakdown.biology.score).toBe(0);
    expect(result.breakdown.biology.totalQuestions).toBe(0);
    expect(result.breakdown.biology.percentage).toBe(0);

    // Difficult questions: Q3(diff), Q4(diff) => 1/2
    expect(result.breakdown.difficult.score).toBe(1);
    expect(result.breakdown.difficult.totalQuestions).toBe(2);

    // Easy questions: Q1, Q2, Q5 => Q1, Q2 correct => 2/3
    expect(result.breakdown.easy.score).toBe(2);
    expect(result.breakdown.easy.totalQuestions).toBe(3);

    // Question structure performance (Exactly 5 Performance Patterns)
    expect(result.structures.length).toBe(5);
    const patternNames = result.structures.map((s) => s.type);
    expect(patternNames).toEqual([
      'Direct',
      'Multi-step',
      'Diagram-based',
      'Application-based',
      'Word Problem',
    ]);

    // Direct: Q1, Q2, Q5 => total 3. Correct: Q1, Q2 => 2/3 (67%)
    const direct = result.structures.find((s) => s.type === 'Direct');
    expect(direct?.correct).toBe(2);
    expect(direct?.total).toBe(3);

    // Diagram-based: Q3, Q4 => total 2. Correct: Q4 => 1/2 (50%)
    const diagram = result.structures.find((s) => s.type === 'Diagram-based');
    expect(diagram?.correct).toBe(1);
    expect(diagram?.total).toBe(2);

    // Strengths and Priority Gaps: MUST be based on scores and question structures / skills (NO chapters)
    const chapterNames = sampleMetadata.map((m) => m.chapter);
    result.strengths.forEach((s) => {
      expect(chapterNames).not.toContain(s.name);
    });
    // Weakness categories (Priority Gaps) must only include categories where score is < 50%
    result.priorityGaps.forEach((g) => {
      expect(chapterNames).not.toContain(g.name);
      expect(g.scorePercent).toBeLessThan(50);
    });
    expect(result.priorityGaps.length).toBeLessThanOrEqual(4);

    // Flagged topics to revisit:
    // Q1: Correct within time -> Excluded
    // Q2: Severe overtime (100s >= 2 * 45s = 90s) -> Too Slow
    // Q3: Attempted (>10s) and incorrect -> Conceptual / Calculation Gap
    // Q4: Correct, slight overtime (130s < 240s) -> Excluded
    // Q5: Unattempted (0s) -> Unattempted (competency cannot be assessed)
    expect(result.topicsToRevisit.length).toBe(3);

    const q2Flag = result.topicsToRevisit.find((t) => t.qno === 2);
    expect(q2Flag?.category).toBe('Too Slow');
    expect(q2Flag?.issueObserved).toContain('Too Slow');

    const q3Flag = result.topicsToRevisit.find((t) => t.qno === 3);
    expect(q3Flag?.category).toBe('Conceptual / Calculation Gap');

    const q5Flag = result.topicsToRevisit.find((t) => t.qno === 5);
    expect(q5Flag?.category).toBe('Unattempted');
    expect(q5Flag?.issueObserved).toContain('Unattempted');

    // Plain text report generation
    expect(result.plainTextReport).toContain('PAGE 1: JEE ONLINE TEST REPORT');
    expect(result.plainTextReport).toContain('PAGE 2: YOUR STRENGTHS');
    expect(result.plainTextReport).toContain('PAGE 3: WHERE SHOULD YOU IMPROVE?');
    expect(result.plainTextReport).toContain('PAGE 4: RECOMMENDATIONS');
    expect(result.plainTextReport).toContain('PAGE 5: NEED STRUCTURED SUPPORT? — SRSMA BOARD MASTERY COURSE');
    expect(result.plainTextReport).toContain('PAGE 6: DIAGNOSTIC AUDIT & CALCULATION STEPS (DEVELOPMENT ONLY)');
    expect(result.plainTextReport).toContain('TURN YOUR CURRENT PERFORMANCE INTO STRONGER BOARD PREPARATION');
    expect(result.plainTextReport).toContain('Move beyond direct questions');

    // Page 4: Calculation steps audit verification
    expect(result.calculationSteps).toBeDefined();
    expect(result.calculationSteps.scoring.rawScoreSum).toBe(3);
    expect(result.calculationSteps.scoring.diagnosticWeightSum).toBe(9);
    expect(result.calculationSteps.scoring.weightedScoreSum).toBe(5);
    expect(result.calculationSteps.scoring.briResult).toBeCloseTo(55.6, 1);
    expect(result.calculationSteps.breakdowns.length).toBe(5);
    expect(result.calculationSteps.skills.length).toBe(5);
    expect(result.calculationSteps.questionAudit.length).toBe(5);
  });

  it('generates correct key insight for Conceptually Strong and High achievement Potential', () => {
    // 1. High achievement Potential (100% score)
    const highScorerPayload: StudentResponsePayload = {
      studentName: 'Priya Patel',
      responses: [
        { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
        { qno: 2, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
        { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 40 },
        { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 50 },
        { qno: 5, attempted: true, selectedOption: 'A', timeTakenSeconds: 20 },
      ],
    };

    const highResult = evaluateDiagnosticReport(sampleMetadata, highScorerPayload);
    expect(highResult.briScore).toBe(100);
    expect(highResult.levelOfPreparation).toBe('High achievement Potential');
    expect(highResult.keyInsight).toBe(
      'You have built a strong understanding of your Board-level concepts. Your next step is to turn this strong conceptual base into consistently high performance by practising questions that require deeper application, multiple steps and careful interpretation. Read the report further to identify the areas that can help you take your preparation to the next level.',
    );
    // When no categories are < 50%, priorityGaps is empty and congratulations is displayed
    expect(highResult.priorityGaps.length).toBe(0);
    expect(highResult.plainTextReport).toContain(
      'Congratulations! Outstanding performance — no weakness areas detected (< 50%)',
    );

    // 2. Conceptually Strong (e.g. Q1, Q2, Q4 correct: 1 + 1 + 3 = 5/9 = 55.6% BRI, in [50%, 70%))
    const strongScorerPayload: StudentResponsePayload = {
      studentName: 'Rohan Mehta',
      responses: [
        { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 }, // Correct (+1)
        { qno: 2, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 }, // Correct (+1)
        { qno: 3, attempted: true, selectedOption: 'A', timeTakenSeconds: 40 }, // Wrong (0)
        { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 50 }, // Correct (+3)
        { qno: 5, attempted: true, selectedOption: 'B', timeTakenSeconds: 20 }, // Wrong (0)
      ],
    };

    const strongResult = evaluateDiagnosticReport(sampleMetadata, strongScorerPayload);
    expect(strongResult.briScore).toBeCloseTo(55.6, 1);
    expect(strongResult.levelOfPreparation).toBe('Conceptually Strong');
    expect(strongResult.keyInsight).toBe(
      'You have built a strong understanding of your Board-level concepts. Your next step is to turn this strong conceptual base into consistently high performance by practising questions that require deeper application, multiple steps and careful interpretation. Read the report further to identify the areas that can help you take your preparation to the next level.',
    );
  });

  it('generates hope-giving Page 4 recommendations and key insight for students whose BRI is less than 20', () => {
    // 1 correct out of 9 total weight (Q1 weight 1 correct, others wrong) => 1 / 9 = 11.1% BRI (< 20%)
    const lowScorerPayload: StudentResponsePayload = {
      studentName: 'Amit Kumar',
      responses: [
        { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 40 }, // Correct (+1)
        { qno: 2, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 }, // Wrong (0)
        { qno: 3, attempted: false, selectedOption: null, timeTakenSeconds: 0 }, // Unattempted (0)
        { qno: 4, attempted: true, selectedOption: 'A', timeTakenSeconds: 20 }, // Wrong (0)
        { qno: 5, attempted: false, selectedOption: null, timeTakenSeconds: 0 }, // Unattempted (0)
      ],
    };

    const lowResult = evaluateDiagnosticReport(sampleMetadata, lowScorerPayload);
    expect(lowResult.briScore).toBeLessThan(20);
    expect(lowResult.levelOfPreparation).toBe('Foundational');
    expect(lowResult.keyInsight).toContain('Every big achievement begins with a single step');
    expect(lowResult.keyInsight).toContain('personalized comeback plan');

    // Verify Page 4 plain text report recommendations for BRI < 20 (Concise & hope-giving)
    expect(lowResult.plainTextReport).toContain('PAGE 4: RECOMMENDATIONS');
    expect(lowResult.plainTextReport).toContain('START FRESH: BUILD YOUR BOARD CONFIDENCE');
    expect(lowResult.plainTextReport).toContain('① Reframe your starting baseline');
    expect(lowResult.plainTextReport).toContain('② Target quick-win chapters first');
    expect(lowResult.plainTextReport).toContain('③ Master NCERT solved examples by hand');
    expect(lowResult.plainTextReport).toContain('④ Keep practice calm and consistent');
    expect(lowResult.plainTextReport).toContain('⑤ Seek guidance without hesitation');
    expect(lowResult.plainTextReport).toContain('A special note for parents: A lower initial diagnostic score under timer pressure is completely normal');
  });

  it('categorizes rapid incorrect response as Too Fast but Incorrect in topics to revisit', () => {
    const rapidPayload: StudentResponsePayload = {
      studentName: 'Aarav Rapid',
      responses: [
        { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 5 }, // < 8s correct -> Mastered (not in topics to revisit)
        { qno: 2, attempted: true, selectedOption: 'A', timeTakenSeconds: 7 }, // < 8s incorrect -> Too Fast but Incorrect
        { qno: 3, attempted: false, selectedOption: null, timeTakenSeconds: 0 }, // Unattempted -> Unattempted
        { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 12 }, // >= 8s incorrect -> Conceptual / Calculation Gap
      ],
    };

    const res = evaluateDiagnosticReport(sampleMetadata, rapidPayload);
    const q1 = res.topicsToRevisit.find((t) => t.qno === 1);
    const q2 = res.topicsToRevisit.find((t) => t.qno === 2);
    const q3 = res.topicsToRevisit.find((t) => t.qno === 3);
    const q4 = res.topicsToRevisit.find((t) => t.qno === 4);

    expect(q1).toBeUndefined();
    expect(q2?.category).toBe('Too Fast but Incorrect');
    expect(q2?.issueObserved).toContain('Too Fast but Incorrect');
    expect(q3?.category).toBe('Unattempted');
    expect(q4?.category).toBe('Conceptual / Calculation Gap');
  });

  describe('Time Management & Guesswork Scoring Engine (TMS)', () => {
    it('correctly resolves question ETS benchmark as mean of lowerbound and upperbound', () => {
      // Mean of 45 and 60 is 52.5
      expect(parseExpectedTimeBenchmark('45,60')).toBe(52.5);
      expect(getQuestionETS('45,60', null)).toBe(52.5);

      // Mean of 30 and 45 is 37.5
      expect(parseExpectedTimeBenchmark('30–45 sec')).toBe(37.5);
      expect(getQuestionETS('30–45 sec', 60)).toBe(37.5);

      // Range object
      const range = parseExpectedTimeRange('90–120 sec');
      expect(range.lowerBound).toBe(90);
      expect(range.upperBound).toBe(120);
      expect(range.mean).toBe(105);

      // Single values
      expect(getQuestionETS(90, null)).toBe(90);
      expect(getQuestionETS(null, 120)).toBe(120);
      expect(getQuestionETS(undefined, undefined)).toBe(60);

      // Upper bound extraction is still preserved
      expect(parseExpectedTimeUpperBound('45,60')).toBe(60);
      expect(parseExpectedTimeUpperBound('30–45 sec')).toBe(45);
    });

    it('correctly scores all 6 piecewise behavioral categories based on time ratio and correctness', () => {
      const ets = 50; // benchmark time = 50s

      // 1. Unattempted: Qi = 0.0
      expect(evaluateQuestionTimeManagement(0, ets, false, false)).toMatchObject({
        category: 'UNATTEMPTED',
        qi: 0.0,
      });

      // 2. Correct, ratio <= 1.0 -> EFFICIENT_MASTERY (Qi = 1.0)
      const efficient = evaluateQuestionTimeManagement(40, ets, true, true); // r = 40/50 = 0.80 <= 1.0
      expect(efficient.category).toBe('EFFICIENT_MASTERY');
      expect(efficient.qi).toBe(1.0);
      expect(efficient.rating).toBe('Optimal');

      // 3. Correct, ratio > 1.0 -> OVER_INVESTED_SUCCESS (Qi = max(0.25, 1.0 / ratio))
      const overInvested = evaluateQuestionTimeManagement(100, ets, true, true); // r = 100/50 = 2.0
      expect(overInvested.category).toBe('OVER_INVESTED_SUCCESS');
      expect(overInvested.qi).toBe(0.5); // 1.0 / 2.0 = 0.50

      // Over-invested with extreme time caps at 0.25
      const extremeOver = evaluateQuestionTimeManagement(500, ets, true, true); // r = 10.0
      expect(extremeOver.category).toBe('OVER_INVESTED_SUCCESS');
      expect(extremeOver.qi).toBe(0.25);

      // 4. Incorrect, ratio < 0.70 -> CARELESS_RUSHING (Qi = 0.50 * (ratio / 0.70))
      const careless = evaluateQuestionTimeManagement(17.5, ets, false, true); // r = 17.5/50 = 0.35
      expect(careless.category).toBe('CARELESS_RUSHING');
      expect(careless.qi).toBe(0.25); // 0.50 * (0.35 / 0.70) = 0.25
      expect(careless.rating).toBe('Needs Intervention');

      // 5. Incorrect, 0.70 <= ratio <= 1.30 -> DISCIPLINED_ATTEMPT (Qi = 0.50)
      const disciplined = evaluateQuestionTimeManagement(50, ets, false, true); // r = 1.0
      expect(disciplined.category).toBe('DISCIPLINED_ATTEMPT');
      expect(disciplined.qi).toBe(0.50);
      expect(disciplined.rating).toBe('Moderate');

      // 6. Incorrect, ratio > 1.30 -> TIME_TRAP (Qi = max(0.0, 0.50 - 0.50 * (ratio - 1.30)))
      const trap = evaluateQuestionTimeManagement(85, ets, false, true); // r = 85/50 = 1.70. Qi = 0.50 - 0.50*(1.70-1.30) = 0.50 - 0.20 = 0.30
      expect(trap.category).toBe('TIME_TRAP');
      expect(trap.qi).toBe(0.30);

      // Severe time trap reaches 0.0
      const deepTrap = evaluateQuestionTimeManagement(150, ets, false, true); // r = 3.0. Qi = max(0, 0.50 - 0.50*(1.70)) = 0.0
      expect(deepTrap.category).toBe('TIME_TRAP');
      expect(deepTrap.qi).toBe(0.0);
    });

    it('classifies TMS bands (>=85% Optimal, 70-84.99% Good, 50-69.99% Moderate, <50% Needs Intervention)', () => {
      expect(classifyTimeManagementBand(92.5)).toBe('Optimal');
      expect(classifyTimeManagementBand(85.0)).toBe('Optimal');
      expect(classifyTimeManagementBand(84.99)).toBe('Good');
      expect(classifyTimeManagementBand(70.0)).toBe('Good');
      expect(classifyTimeManagementBand(69.99)).toBe('Moderate');
      expect(classifyTimeManagementBand(50.0)).toBe('Moderate');
      expect(classifyTimeManagementBand(49.99)).toBe('Needs Intervention');
      expect(classifyTimeManagementBand(20)).toBe('Needs Intervention');
    });

    it('calculates final TMS (%) = (1 / N * Σ Qi) * 100 and reconciles unattempted missing items', () => {
      // 4 questions provided for a 4-question test
      const testQuestions = [
        { qno: 1, attempted: true, timeTakenSeconds: 6, benchmarkTimeS: 50, isCorrect: true }, // <8s Guesswork! r = 6/50 = 0.12 <= 1.0 -> Qi = 1.0 (EFFICIENT_MASTERY)
        { qno: 2, attempted: true, timeTakenSeconds: 100, benchmarkTimeS: 50, isCorrect: true }, // r = 2.0 -> Qi = 0.50 (OVER_INVESTED_SUCCESS)
        { qno: 3, attempted: true, timeTakenSeconds: 50, benchmarkTimeS: 50, isCorrect: false }, // r = 1.0 -> Qi = 0.50 (DISCIPLINED_ATTEMPT)
        { qno: 4, attempted: false, timeTakenSeconds: 0, benchmarkTimeS: 50, isCorrect: false }, // Unattempted -> Qi = 0.0
      ];

      const tm = evaluateTimeManagement(testQuestions, 4);

      // Attempted count = 3
      expect(tm.attemptedCount).toBe(3);
      // Total Qi = 1.0 + 0.50 + 0.50 + 0.0 = 2.0
      expect(tm.totalScore).toBe(2.0);
      expect(tm.maxPossibleScore).toBe(4);
      // TMS (%) = (2.0 / 4) * 100 = 50%
      expect(tm.finalScorePercent).toBe(50);
      expect(tm.rating).toBe('Moderate');

      // Behavioral category breakdown
      expect(tm.categoryCounts.EFFICIENT_MASTERY).toBe(1);
      expect(tm.categoryCounts.OVER_INVESTED_SUCCESS).toBe(1);
      expect(tm.categoryCounts.DISCIPLINED_ATTEMPT).toBe(1);
      expect(tm.categoryCounts.UNATTEMPTED).toBe(1);

      // Guesswork detection: only attempted with <8s
      expect(tm.guessworkQuestions).toEqual([1]);
    });

    it('integrates TMS scoring engine seamlessly into evaluateDiagnosticReport', () => {
      const payload: StudentResponsePayload = {
        studentName: 'Test Student',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 6 }, // Correct (Ans B). ETS mean: 52.5. r = 6/52.5 = 0.11 -> Qi = 1.0. Guesswork!
          { qno: 2, attempted: true, selectedOption: 'C', timeTakenSeconds: 40 }, // Correct (Ans C). ETS mean: 37.5. r = 40/37.5 = 1.07 -> Qi = 1.0/1.07 = 0.9346
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 250 }, // Correct (Ans C). ETS mean: 105. r = 250/105 = 2.38 -> Qi = 1.0/2.38 = 0.4202
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 250 }, // Correct (Ans D). ETS mean: 105. r = 250/105 = 2.38 -> Qi = 1.0/2.38 = 0.4202
          { qno: 5, attempted: false, selectedOption: null, timeTakenSeconds: 5 }, // Unattempted -> Qi = 0.0
        ],
      };

      const report = evaluateDiagnosticReport(sampleMetadata, payload);

      expect(report.timeManagement).toBeDefined();
      expect(report.timeManagement.attemptedCount).toBe(4);
      expect(report.timeManagement.totalQuestions).toBe(5);

      // Diagnostic Weighted TMS:
      // Q1 (w=1): 1.0 * 1 = 1.0
      // Q2 (w=1): 0.9346 * 1 = 0.9346
      // Q3 (w=3): 0.4202 * 3 = 1.2606
      // Q4 (w=3): 0.4202 * 3 = 1.2606
      // Q5 (w=1): 0 * 1 = 0
      // Sum Weighted Qi = 4.4558 / 9 total weight = 49.508% -> 50% (Moderate)
      expect(report.timeManagement.finalScorePercent).toBe(50);
      expect(report.timeManagement.rating).toBe('Moderate');
      expect(report.timeManagement.guessworkQuestions).toEqual([1]);

      // Category counts
      expect(report.timeManagement.categoryCounts.EFFICIENT_MASTERY).toBe(1);
      expect(report.timeManagement.categoryCounts.OVER_INVESTED_SUCCESS).toBe(3);
      expect(report.timeManagement.categoryCounts.UNATTEMPTED).toBe(1);

      // Report plain text should mention time management & guesswork
      expect(report.plainTextReport).toContain('TIME MANAGEMENT SCORE: 50%');
      expect(report.plainTextReport).toContain('⚠️ GUESSWORK OBSERVATION');
      expect(report.plainTextReport).toContain('Q1');

      // Calculation steps audit should contain time management
      expect(report.calculationSteps.timeManagement).toBeDefined();
      expect(report.calculationSteps.timeManagement?.finalScorePercent).toBe(50);
      expect(report.calculationSteps.timeManagement?.ratingResult).toBe('Moderate');
    });
  });

  describe('Weakness Category (< 50% score) and Congratulations Logic', () => {
    it('only displays categories where score is less than 50%', () => {
      // Create student payload where some categories score < 50% and some >= 50%
      const payload: StudentResponsePayload = {
        studentName: 'Ananya Sharma',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 }, // Q1 wrong
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 }, // Q2 wrong (Application: 0%)
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 }, // Q3 wrong
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 }, // Q4 correct
          { qno: 5, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 }, // Q5 correct (Conceptual: 100%)
        ],
      };

      const report = evaluateDiagnosticReport(sampleMetadata, payload);

      // Every category in priorityGaps MUST be < 50%
      expect(report.priorityGaps.length).toBeGreaterThan(0);
      report.priorityGaps.forEach((gap) => {
        expect(gap.scorePercent).toBeLessThan(50);
      });

      // Categories that scored 100% must NOT be in priority gaps
      const gapNames = report.priorityGaps.map((g) => g.name);
      expect(gapNames).not.toContain('Conceptual Understanding');
    });

    it('displays only the available categories if there are fewer than 4 with score < 50%', () => {
      // 4 questions where Easy is 3/4 = 75%, Direct is 3/4 = 75%, Calculation is 3/3 = 100%,
      // and only Visual Interpretation is 0/1 = 0% (< 50%).
      const customMeta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Triangles',
          topic: 'Similarity',
          difficulty: 'Easy',
          primarySkill: 'Visual Interpretation',
          secondarySkill: 'Visual Interpretation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60 sec',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'HCF',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          secondarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60 sec',
          answer: 'B',
          diagnosticWeight: 1,
        },
        {
          qno: 3,
          subject: 'Maths',
          chapter: 'Polynomials',
          topic: 'Zeroes',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          secondarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60 sec',
          answer: 'C',
          diagnosticWeight: 1,
        },
        {
          qno: 4,
          subject: 'Maths',
          chapter: 'Linear Equations',
          topic: 'Solutions',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          secondarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60 sec',
          answer: 'D',
          diagnosticWeight: 1,
        },
      ];

      const payload: StudentResponsePayload = {
        studentName: 'Vikram Singh',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 }, // Wrong (Visual Interpretation: 0%)
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 }, // Correct
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 }, // Correct
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 }, // Correct
        ],
      };

      const report = evaluateDiagnosticReport(customMeta, payload);

      // Exactly 1 category ('Question Interpretation Skill') has score < 50%
      expect(report.priorityGaps.length).toBe(1);
      expect(report.priorityGaps[0].name).toBe('Question Interpretation Skill');
      expect(report.priorityGaps[0].scorePercent).toBe(0);
      expect(report.priorityGaps[0].priority).toBe('High Priority');
      expect(report.priorityGaps[0].message).toBe(
        'Practise reading diagrams and data carefully, identifying the relevant information and using it correctly to reach the answer.',
      );
    });

    it('congratulates student when there are no categories with score < 50%', () => {
      // 100% correct answers
      const perfectPayload: StudentResponsePayload = {
        studentName: 'Neha Verma',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
        ],
      };

      const report = evaluateDiagnosticReport(sampleMetadata, perfectPayload);

      // Priority gaps must be completely empty
      expect(report.priorityGaps.length).toBe(0);
      // Plain text report must congratulate them
      expect(report.plainTextReport).toContain(
        'Congratulations! Outstanding performance — no weakness areas detected (< 50%)',
      );
    });
  });

  describe('Difficulty Breakdown & Dynamic 6-Candidate Strengths Engine', () => {
    const testMeta: QuestionMetadataItem[] = [
      {
        qno: 1,
        subject: 'Mathematics',
        chapter: 'Real Numbers',
        topic: 'Euclid Division',
        difficulty: 'Easy',
        diagnosticWeight: 1,
        primarySkill: 'Conceptual Foundation',
        secondarySkill: 'Interpretation',
        questionStructure: 'Direct',
        visualDependency: 'None',
        expectedTime: '60 sec',
        answer: 'A',
      },
      {
        qno: 2,
        subject: 'Mathematics',
        chapter: 'Polynomials',
        topic: 'Zeroes',
        difficulty: 'Medium',
        diagnosticWeight: 2,
        primarySkill: 'Concept Application',
        secondarySkill: null,
        questionStructure: 'Multi-step',
        visualDependency: 'None',
        expectedTime: '60 sec',
        answer: 'B',
      },
      {
        qno: 3,
        subject: 'Mathematics',
        chapter: 'Triangles',
        topic: 'Similarity',
        difficulty: 'Hard',
        diagnosticWeight: 3,
        primarySkill: 'Problem Solving',
        secondarySkill: null,
        questionStructure: 'Word Problem',
        visualDependency: 'None',
        expectedTime: '90 sec',
        answer: 'C',
      },
      {
        qno: 4,
        subject: 'Science',
        chapter: 'Light',
        topic: 'Reflection',
        difficulty: 'Easy',
        diagnosticWeight: 1,
        primarySkill: 'Conceptual Foundation',
        secondarySkill: 'Visual Interpretation',
        questionStructure: 'Diagram-based',
        visualDependency: 'High',
        expectedTime: '60 sec',
        answer: 'D',
      },
      {
        qno: 5,
        subject: 'Physics',
        chapter: 'Electricity',
        topic: 'Ohm Law',
        difficulty: 'Medium',
        diagnosticWeight: 2,
        primarySkill: 'Concept Application',
        secondarySkill: null,
        questionStructure: 'Multi-step',
        visualDependency: 'None',
        expectedTime: '60 sec',
        answer: 'A',
      },
      {
        qno: 6,
        subject: 'Chemistry',
        chapter: 'Acids and Bases',
        topic: 'pH scale',
        difficulty: 'Hard',
        diagnosticWeight: 3,
        primarySkill: 'Problem Solving',
        secondarySkill: null,
        questionStructure: 'Application-based',
        visualDependency: 'None',
        expectedTime: '90 sec',
        answer: 'B',
      },
    ];

    it('calculates difficulty breakdown for Mathematics and Science separately', () => {
      // Maths: Q1 correct (Easy), Q2 correct (Med), Q3 wrong (Hard)
      // Science: Q4 correct (Easy), Q5 wrong (Med), Q6 correct (Hard)
      const payload: StudentResponsePayload = {
        studentName: 'Aarav Patel',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 40 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 50 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 40 },
          { qno: 6, attempted: true, selectedOption: 'B', timeTakenSeconds: 50 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, payload);

      // Maths breakdowns
      expect(result.subjectDifficultyBreakdowns.mathematics.easy.percentage).toBe(100);
      expect(result.subjectDifficultyBreakdowns.mathematics.easy.score).toBe(1);
      expect(result.subjectDifficultyBreakdowns.mathematics.easy.total).toBe(1);

      expect(result.subjectDifficultyBreakdowns.mathematics.medium.percentage).toBe(100);
      expect(result.subjectDifficultyBreakdowns.mathematics.medium.score).toBe(1);
      expect(result.subjectDifficultyBreakdowns.mathematics.medium.total).toBe(1);

      expect(result.subjectDifficultyBreakdowns.mathematics.hard.percentage).toBe(0);
      expect(result.subjectDifficultyBreakdowns.mathematics.hard.score).toBe(0);
      expect(result.subjectDifficultyBreakdowns.mathematics.hard.total).toBe(1);

      // Science breakdowns
      expect(result.subjectDifficultyBreakdowns.science.easy.percentage).toBe(100);
      expect(result.subjectDifficultyBreakdowns.science.medium.percentage).toBe(0);
      expect(result.subjectDifficultyBreakdowns.science.hard.percentage).toBe(100);

      // Plain text report check
      expect(result.plainTextReport).toContain('DIFFICULTY LEVEL PERFORMANCE (PERCENTAGE SOLVED)');
      expect(result.plainTextReport).toContain('Mathematics: Easy: 100%, Medium: 100%, Hard: 0%');
      expect(result.plainTextReport).toContain('Science: Easy: 100%, Medium: 0%, Hard: 100%');
    });

    it('assigns YOUR STRENGTHS when >= 3 candidates have score >= 70% and removes marks out of total', () => {
      // Perfect score across all questions
      const payload: StudentResponsePayload = {
        studentName: 'Pooja Nair',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 6, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, payload);

      expect(result.strengthsTitle).toBe('YOUR STRENGTHS');
      expect(result.strengths.length).toBe(3);

      result.strengths.forEach((s) => {
        expect(s.percentage).toBeGreaterThanOrEqual(70);
        expect(s.isEmerging).toBe(false);
        // "In Your Strengths Section remove marks out of Total. just keep the percentage."
        expect(s.scoreDetails).toMatch(/^\d+(\.\d+)?%$/);
        expect(s.scoreDetails).not.toContain('pts');
        expect(s.scoreDetails).not.toContain('/');
      });

      // Verify exact explanation texts when >= 70%
      const clarity = result.strengths.find((s) => s.name === 'CONCEPT CLARITY');
      if (clarity) {
        expect(clarity.reason).toBe(
          'You understand Class X board concepts well and have built a strong base to build upon. Keep deepening your understanding—you’re on the right track!',
        );
      }
    });

    it('assigns YOUR EMERGING STRENGTHS when only 1 or 2 candidates have score >= 70%', () => {
      // Q1, Q4 correct (100%), Q2 correct (50% concept application), others wrong
      const payload: StudentResponsePayload = {
        studentName: 'Rohan Sharma',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 200 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 150 },
          { qno: 6, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 200 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, payload);

      expect(result.strengthsTitle).toBe('YOUR EMERGING STRENGTHS');
      expect(result.strengths.length).toBe(3);

      const strongItems = result.strengths.filter((s) => s.percentage >= 70);
      const emergingItems = result.strengths.filter((s) => s.percentage < 70);

      expect(strongItems.length).toBeGreaterThanOrEqual(1);
      expect(strongItems.length).toBeLessThanOrEqual(2);
      expect(emergingItems.length).toBeGreaterThanOrEqual(1);

      strongItems.forEach((s) => {
        expect(s.isEmerging).toBe(false);
      });

      emergingItems.forEach((s) => {
        expect(s.isEmerging).toBe(true);
      });
    });

    it('assigns AREAS WITH MOST POTENTIAL when 0 candidates have score >= 70% and uses developing text', () => {
      // 50% scores across categories (0 candidates >= 70%, candidates >= 50%)
      const payload: StudentResponsePayload = {
        studentName: 'Kunal Joshi',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 120 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 120 },
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 180 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 50 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 50 },
          { qno: 6, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 70 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, payload);

      expect(result.strengthsTitle).toBe('AREAS WITH MOST POTENTIAL');
      expect(result.strengths.length).toBe(3);

      result.strengths.forEach((s) => {
        expect(s.percentage).toBeLessThan(70);
        expect(s.percentage).toBeGreaterThanOrEqual(50);
        expect(s.isEmerging).toBe(true);
        expect(s.tag).toBe('Areas with Most Potential');
      });

      // Verify developing reason for CONCEPT CLARITY
      const clarity = result.strengths.find((s) => s.name === 'CONCEPT CLARITY');
      if (clarity) {
        expect(clarity.reason).toBe(
          'This is one of your stronger areas right now. With focused practice, you can build even greater clarity here.',
        );
      }
    });

    it('returns empty strengths array when all categories score < 50%', () => {
      const allWrongPayload: StudentResponsePayload = {
        studentName: 'Kunal Joshi',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 130 },
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 130 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 190 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 130 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 130 },
          { qno: 6, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 190 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, allWrongPayload);
      expect(result.strengthsTitle).toBe('AREAS WITH MOST POTENTIAL');
      expect(result.strengths.length).toBe(0);
    });

    it('formats subject comparison insight using "You seem to be doing better in Maths compared to Science"', () => {
      // Maths 100%, Science 0%
      const mathsBetterPayload: StudentResponsePayload = {
        studentName: 'Sanjay Dutt',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 6, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };

      const result = evaluateDiagnosticReport(testMeta, mathsBetterPayload);
      expect(result.plainTextReport).toContain(
        'SUBJECT INSIGHT: You seem to be doing better in Maths compared to Science.',
      );
    });
  });

  describe('9-Label Weakness Evaluation Engine', () => {
    it('evaluates Conceptual Gap when Conceptual Foundation score <= 70%', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Science',
          chapter: 'Life Processes',
          topic: 'Nutrition',
          difficulty: 'Easy',
          primarySkill: 'Conceptual Foundation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Science',
          chapter: 'Life Processes',
          topic: 'Respiration',
          difficulty: 'Easy',
          primarySkill: 'Conceptual Foundation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'B',
          diagnosticWeight: 2,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Aarav',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const gap = report.priorityGaps.find((g) => g.name === 'Conceptual Understanding');
      expect(gap).toBeDefined();
      expect(gap?.scorePercent).toBe(33);
      expect(gap?.priority).toBe('Medium Priority');
      expect(gap?.message).toBe(
        'You need to strengthen some fundamental concepts before moving confidently to more advanced questions.',
      );
    });

    it('evaluates Application Gap when Application skill score < 50%', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Science',
          chapter: 'Light',
          topic: 'Lenses',
          difficulty: 'Medium',
          primarySkill: 'Application',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'C',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Science',
          chapter: 'Light',
          topic: 'Mirrors',
          difficulty: 'Medium',
          primarySkill: 'Concept Application',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'D',
          diagnosticWeight: 2,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Diya',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'C', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const gap = report.priorityGaps.find((g) => g.name === 'Application Skill');
      expect(gap).toBeDefined();
      expect(gap?.scorePercent).toBe(33);
      expect(gap?.priority).toBe('Medium Priority');
      expect(gap?.message).toBe(
        'Your basic understanding is developing, but you need more practice using concepts in unfamiliar and application-based situations.',
      );
    });

    it('evaluates Problem-Solving Gap when Problem Solving < 60% or Multi-step triggers gap', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Triangles',
          topic: 'Pythagoras',
          difficulty: 'Medium',
          primarySkill: 'Problem Solving',
          questionStructure: 'Multi-step',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'B',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Rohan',
        responses: [{ qno: 1, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 50 }],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const gap = report.priorityGaps.find((g) => g.name === 'Problem Solving Skill');
      expect(gap).toBeDefined();
      expect(gap?.scorePercent).toBe(0);
      expect(gap?.message).toBe(
        'You need more practice breaking complex problems into manageable steps and connecting ideas systematically.',
      );
    });

    it('evaluates Accuracy Risk when accuracy < 50% despite conceptual competence >= 50%', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'Euclid',
          difficulty: 'Easy',
          primarySkill: 'Conceptual Foundation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'HCF',
          difficulty: 'Easy',
          primarySkill: 'Conceptual Foundation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'B',
          diagnosticWeight: 1,
        },
        {
          qno: 3,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'LCM',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'C',
          diagnosticWeight: 1,
        },
        {
          qno: 4,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'Primes',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'D',
          diagnosticWeight: 1,
        },
        {
          qno: 5,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'Primes 2',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Priya',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const gap = report.priorityGaps.find((g) => g.name === 'Accuracy');
      expect(gap).toBeDefined();
      expect(gap?.scorePercent).toBe(40);
      expect(gap?.priority).toBe('Low Priority');
      expect(gap?.message).toBe(
        'You appear to understand several of the concepts tested, but avoidable errors may be costing you marks. Focus on careful calculation, reading and checking.',
      );
    });

    it('evaluates Difficulty Readiness Gap when Easy >= 70% and Medium/Difficult drops by >= 20/30 pts', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Trigonometry',
          topic: 'Identities',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Maths',
          chapter: 'Trigonometry',
          topic: 'Heights',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'B',
          diagnosticWeight: 1,
        },
        {
          qno: 3,
          subject: 'Maths',
          chapter: 'Trigonometry',
          topic: 'Proofs',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '90s',
          answer: 'C',
          diagnosticWeight: 1,
        },
        {
          qno: 4,
          subject: 'Maths',
          chapter: 'Trigonometry',
          topic: 'Advanced',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '90s',
          answer: 'D',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Sameer',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const gap = report.priorityGaps.find((g) => g.name === 'Difficulty Readiness');
      expect(gap).toBeDefined();
      expect(gap?.message).toBe(
        'Your foundation is developing well, but you need to gradually build confidence with more challenging questions.',
      );
    });

    it('evaluates Multi-Step Question Gap, Application-Based Question Gap, and Direct-Question Dependency', () => {
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Ohms Law',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Resistance',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'B',
          diagnosticWeight: 1,
        },
        {
          qno: 3,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Circuit',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Multi-step',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'C',
          diagnosticWeight: 1,
        },
        {
          qno: 4,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Power',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Multi-step',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'D',
          diagnosticWeight: 1,
        },
        {
          qno: 5,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Heating Effect',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Application-based',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 6,
          subject: 'Science',
          chapter: 'Electricity',
          topic: 'Household Wiring',
          difficulty: 'Medium',
          primarySkill: 'Calculation',
          questionStructure: 'Application-based',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'B',
          diagnosticWeight: 1,
        },
      ];

      const payload: StudentResponsePayload = {
        studentName: 'Kavya',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 30 },
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
          { qno: 6, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };

      const report = evaluateDiagnosticReport(meta, payload);
      const valid9Labels = [
        'Conceptual Understanding',
        'Application Skill',
        'Problem Solving Skill',
        'Question Interpretation Skill',
        'Accuracy',
        'Difficulty Readiness',
        'Multi-Step Question Skill',
        'Application-Based Question Skill',
        'Direct-Question Dependency',
      ];
      report.priorityGaps.forEach((g) => {
        expect(valid9Labels).toContain(g.name);
        expect(g.message).toBeDefined();
        expect(g.scorePercent).toBeLessThan(50);
      });

      const multiStepGap = report.priorityGaps.find((g) => g.name === 'Multi-Step Question Skill');
      expect(multiStepGap?.message).toBe(
        'You are comfortable with direct questions, but questions requiring several connected steps are currently more challenging.',
      );

      const appGap = report.priorityGaps.find((g) => g.name === 'Application-Based Question Skill');
      if (appGap) {
        expect(appGap.message).toBe(
          'You handle direct questions well. Your next step is to practise applying the same concepts in unfamiliar situations.',
        );
      }

      const depGap = report.priorityGaps.find((g) => g.name === 'Direct-Question Dependency');
      if (depGap) {
        expect(depGap.message).toBe(
          'You are comfortable with familiar question formats. Your next step is to become equally confident with application-based and multi-step questions.',
        );
      }
    });

    it('never highlights both Problem-Solving Gap and Multi-Step Question Gap together', () => {
      // Create a test where both would trigger:
      // Problem Solving primary skill (0%) AND Multi-step structure (0%) with Direct (100%)
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Real Numbers',
          topic: 'Euclid',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Maths',
          chapter: 'Triangles',
          topic: 'Proof',
          difficulty: 'Medium',
          primarySkill: 'Problem Solving',
          questionStructure: 'Multi-step',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'B',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Anil',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const names = report.priorityGaps.map((g) => g.name);

      // Must have Problem Solving Skill (from First 6)
      expect(names).toContain('Problem Solving Skill');
      // Must NOT have Multi-Step Question Skill simultaneously
      expect(names).not.toContain('Multi-Step Question Skill');
    });

    it('never highlights both Application Gap and Application-Based Question Gap together', () => {
      // Primary Skill = Application AND Question Structure = Application-based
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Science',
          chapter: 'Chemical Reactions',
          topic: 'Balancing',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Science',
          chapter: 'Chemical Reactions',
          topic: 'Corrosion',
          difficulty: 'Medium',
          primarySkill: 'Application',
          questionStructure: 'Application-based',
          visualDependency: 'None',
          expectedTime: '120s',
          answer: 'B',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Sunita',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 30 },
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);
      const names = report.priorityGaps.map((g) => g.name);

      // Application Skill is in First 6, so it takes precedence over Application-Based Question Skill
      expect(names).toContain('Application Skill');
      expect(names).not.toContain('Application-Based Question Skill');
    });

    it('falls back to question taking more time than expected when 0 gaps found from 9 labels', () => {
      // Student answers 100% correctly, but Q2 takes 150s (expected 60s)
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Science',
          chapter: 'Life Processes',
          topic: 'Respiration',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
        {
          qno: 2,
          subject: 'Science',
          chapter: 'Life Processes',
          topic: 'Circulation',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'B',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Tarun',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 40 }, // Normal
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 150 }, // Overtime (> 60s)
        ],
      };
      const report = evaluateDiagnosticReport(meta, payload);

      // Time Management is not included as a card in Priority Gaps (Weaknesses).
      // Since all academic skills scored 100%, priorityGaps is empty and congratulations is preserved.
      expect(report.priorityGaps.length).toBe(0);
      expect(
        report.priorityGaps.some((g) => g.name.includes('Pacing') || g.name.includes('Time Management')),
      ).toBe(false);

      // But Q2 (150s >= 2 * 60s) is correctly flagged as 'Too Slow' in Topics to Revisit
      const q2Revisit = report.topicsToRevisit.find((t) => t.qno === 2);
      expect(q2Revisit?.category).toBe('Too Slow');
      expect(q2Revisit?.issueObserved).toContain('Too Slow');
    });

    it('congratulates student when 0 gaps found and no question took more time than expected', () => {
      // 100% correct, all within time limits
      const meta: QuestionMetadataItem[] = [
        {
          qno: 1,
          subject: 'Maths',
          chapter: 'Statistics',
          topic: 'Mean',
          difficulty: 'Easy',
          primarySkill: 'Calculation',
          questionStructure: 'Direct',
          visualDependency: 'None',
          expectedTime: '60s',
          answer: 'A',
          diagnosticWeight: 1,
        },
      ];
      const payload: StudentResponsePayload = {
        studentName: 'Meera',
        responses: [{ qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 }],
      };
      const report = evaluateDiagnosticReport(meta, payload);

      expect(report.priorityGaps.length).toBe(0);
      expect(report.plainTextReport).toContain(
        'Congratulations! Outstanding performance — no weakness areas detected',
      );
    });

    it('populates full calculationSteps audit fields including allWeaknessEvaluations, scienceDisciplineBreakdowns, and subjectDifficultyMatrix', () => {
      const payload: StudentResponsePayload = {
        studentName: 'Aarav Sharma',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 40 },
          { qno: 3, attempted: true, selectedOption: 'A', timeTakenSeconds: 100 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 130 },
          { qno: 5, attempted: false, selectedOption: null, timeTakenSeconds: 0 },
        ],
      };
      const result = evaluateDiagnosticReport(sampleMetadata, payload);

      expect(result.calculationSteps.allWeaknessEvaluations).toBeDefined();
      expect(result.calculationSteps.allWeaknessEvaluations?.length).toBeGreaterThanOrEqual(9);

      // Verify each weakness evaluation item has valid scores, formulas, threshold conditions, and statuses
      result.calculationSteps.allWeaknessEvaluations?.forEach((w) => {
        expect(w.id).toBeDefined();
        expect(w.name).toBeDefined();
        expect(typeof w.evaluatedScore).toBe('number');
        expect(w.formula).toBeDefined();
        expect(w.thresholdCondition).toBeDefined();
        expect(typeof w.isTriggered).toBe('boolean');
        expect(w.priority).toBeDefined();
        expect(w.status).toBeDefined();
        expect(w.triggerReason).toBeDefined();
      });

      // Verify science discipline breakdowns (Physics, Chemistry, Biology)
      expect(result.calculationSteps.scienceDisciplineBreakdowns).toBeDefined();
      expect(result.calculationSteps.scienceDisciplineBreakdowns?.length).toBe(3);
      const disciplines = result.calculationSteps.scienceDisciplineBreakdowns?.map((d) => d.discipline);
      expect(disciplines).toEqual(['Physics', 'Chemistry', 'Biology']);

      // Verify subject difficulty matrix (Maths & Science x Easy, Medium, Difficult)
      expect(result.calculationSteps.subjectDifficultyMatrix).toBeDefined();
      expect(result.calculationSteps.subjectDifficultyMatrix?.length).toBe(6);
      const mathEasy = result.calculationSteps.subjectDifficultyMatrix?.find(
        (m) => m.subject === 'Mathematics' && m.difficulty === 'Easy',
      );
      expect(mathEasy).toBeDefined();
      expect(typeof mathEasy?.percentage).toBe('number');

      // Verify strengths ranking includes tag
      expect(result.calculationSteps.strengthsRanking.length).toBeGreaterThan(0);
      expect(result.calculationSteps.strengthsRanking[0].tag).toBeDefined();
    });

    it('ensures Time Management never appears as a card in Strengths or Weaknesses', () => {
      // High TMS student
      const highTmsPayload: StudentResponsePayload = {
        studentName: 'Priya Fast',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 20 },
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 25 },
          { qno: 3, attempted: true, selectedOption: 'A', timeTakenSeconds: 30 },
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 35 },
          { qno: 5, attempted: true, selectedOption: 'A', timeTakenSeconds: 40 },
        ],
      };
      const highReport = evaluateDiagnosticReport(sampleMetadata, highTmsPayload);

      // Verify strengths cards never contain TIME MANAGEMENT
      highReport.strengths.forEach((s) => {
        expect(s.name).not.toMatch(/time management/i);
      });
      // Verify weakness cards never contain TIME MANAGEMENT or PACING
      highReport.priorityGaps.forEach((g) => {
        expect(g.name).not.toMatch(/time management/i);
        expect(g.name).not.toMatch(/pacing/i);
      });

      // Low TMS student with severe overtime
      const lowTmsPayload: StudentResponsePayload = {
        studentName: 'Sanjay Slow',
        responses: [
          { qno: 1, attempted: true, selectedOption: 'A', timeTakenSeconds: 150 }, // Severe overtime (150 >= 2 * 60)
          { qno: 2, attempted: true, selectedOption: 'B', timeTakenSeconds: 180 }, // Severe overtime (180 >= 2 * 45)
          { qno: 3, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 260 }, // Severe overtime & wrong (260 >= 2 * 120)
          { qno: 4, attempted: true, selectedOption: 'D', timeTakenSeconds: 400 }, // Severe overtime (400 >= 2 * 120)
          { qno: 5, attempted: true, selectedOption: 'Wrong', timeTakenSeconds: 5 }, // Too fast (< 8s) & wrong
        ],
      };
      const lowReport = evaluateDiagnosticReport(sampleMetadata, lowTmsPayload);

      // Strengths & Weaknesses cards must NOT contain Time Management
      lowReport.strengths.forEach((s) => {
        expect(s.name).not.toMatch(/time management/i);
      });
      lowReport.priorityGaps.forEach((g) => {
        expect(g.name).not.toMatch(/time management/i);
        expect(g.name).not.toMatch(/pacing/i);
      });

      // In Topics to Revisit, verify exact issue categories (Too Slow, Too Fast but Incorrect)
      const q1Revisit = lowReport.topicsToRevisit.find((t) => t.qno === 1);
      const q3Revisit = lowReport.topicsToRevisit.find((t) => t.qno === 3);
      const q5Revisit = lowReport.topicsToRevisit.find((t) => t.qno === 5);

      expect(q1Revisit?.category).toBe('Too Slow');
      expect(q3Revisit?.category).toBe('Too Slow');
      expect(q5Revisit?.category).toBe('Too Fast but Incorrect');

      // No topics should have 'Pacing / Time Management' tag
      lowReport.topicsToRevisit.forEach((t) => {
        expect(t.category).not.toBe('Pacing / Time Management');
      });
    });
  });
});

