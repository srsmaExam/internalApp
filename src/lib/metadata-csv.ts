/**
 * Question Metadata CSV parsing, validation, and sample template generator.
 * Aligns with the JEE Online Test question profiling specification.
 */

export interface ParsedMetadataRow {
  qno: number;
  subject?: string;
  chapter?: string | null;
  topic?: string | null;
  difficulty?: number | null; // 1 = Easy, 2 = Medium, 3 = Difficult
  difficultyLabel?: string | null;
  primarySkill?: string | null;
  secondarySkill?: string | null;
  cognitiveLevel?: string | null;
  conceptTested?: string | null;
  prerequisiteConcept?: string | null;
  questionStructure?: string | null;
  visualDependency?: string | null;
  calculationIntensity?: string | null;
  expectedTime?: string | null; // e.g. "45,60" or "60"
  expectedTimeS?: number | null;
  diagnosticWeight?: number | null;
}

export interface MetadataCsvValidationResult {
  validRows: ParsedMetadataRow[];
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
}

/**
 * Splits a CSV line respecting quoted commas.
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

function escapeCsv(val: string | number | null | undefined): string {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function parseDifficulty(raw: string | null | undefined): { level: number; label: string } {
  const norm = (raw ?? '').trim().toLowerCase();
  if (norm === '1' || norm === 'easy') return { level: 1, label: 'Easy' };
  if (norm === '3' || norm === 'difficult' || norm === 'hard') return { level: 3, label: 'Difficult' };
  return { level: 2, label: 'Medium' };
}

export function parseExpectedTime(raw: string | null | undefined): { commaSeparated: string; seconds: number } {
  if (!raw) return { commaSeparated: '60', seconds: 60 };
  const trimmed = raw.trim();
  const match = trimmed.match(/(\d+)\s*[–\-—,]\s*(\d+)/);
  if (match) {
    const min = Number(match[1]);
    const max = Number(match[2]);
    const mean = Math.round((min + max) / 2);
    return {
      commaSeparated: `${min},${max}`,
      seconds: mean,
    };
  }
  const single = trimmed.match(/(\d+)/);
  if (single) {
    const s = single[1];
    return { commaSeparated: s, seconds: Number(s) };
  }
  return { commaSeparated: '60', seconds: 60 };
}

export const CSV_HEADERS = [
  'Qno',
  'Subject',
  'Chapter',
  'Topic',
  'Difficulty',
  'Primary Skill',
  'Secondary Skill',
  'Cognitive Level',
  'Concept Tested',
  'Prerequisite Concept',
  'Question Structure',
  'Visual Dependency',
  'Calculation Intensity',
  'Expected Time',
  'Diagnostic Weight',
] as const;

/**
 * Generates sample CSV template content with realistic guidelines.
 * If existing questions are provided, fills in their Qno and Subject.
 */
export function generateSampleMetadataCsv(
  questions?: Array<{
    position: number;
    subject: string;
    chapter?: string | null;
    topic?: string | null;
    difficulty?: number | null;
    expectedTimeS?: number | null;
    metadata?: any;
  }>,
): string {
  const lines: string[] = [CSV_HEADERS.join(',')];

  if (questions && questions.length > 0) {
    for (const q of questions) {
      const m = q.metadata || {};
      const diffLabel =
        m.difficultyLabel ||
        (q.difficulty === 1 ? 'Easy' : q.difficulty === 3 ? 'Difficult' : 'Medium');
      const timeVal = m.expectedTime || (q.expectedTimeS ? String(q.expectedTimeS) : '60');
      const weight = m.diagnosticWeight != null ? m.diagnosticWeight : 1;

      lines.push(
        [
          q.position,
          escapeCsv(q.subject),
          escapeCsv(q.chapter || ''),
          escapeCsv(q.topic || ''),
          escapeCsv(diffLabel),
          escapeCsv(m.primarySkill || 'Concept Application'),
          escapeCsv(m.secondarySkill || 'Calculation'),
          escapeCsv(m.cognitiveLevel || 'Application'),
          escapeCsv(m.conceptTested || ''),
          escapeCsv(m.prerequisiteConcept || ''),
          escapeCsv(m.questionStructure || 'Direct'),
          escapeCsv(m.visualDependency || 'None'),
          escapeCsv(m.calculationIntensity || 'Medium'),
          escapeCsv(timeVal),
          weight,
        ].join(','),
      );
    }
  } else {
    // Default 3 sample rows
    lines.push(
      [
        1,
        'Maths',
        'Real Numbers',
        'HCF & LCM',
        'Easy',
        'Concept Application',
        'Calculation',
        'Application',
        'Relationship between HCF and LCM',
        'HCF/LCM concept',
        'Direct',
        'None',
        'Low',
        '45,60',
        1,
      ].join(','),
    );
    lines.push(
      [
        2,
        'Physics',
        'Light',
        'Reflection & Refraction',
        'Medium',
        'Analytical Reasoning',
        'Formula Recall',
        'Analysis',
        'Mirror formula and magnification',
        'Sign convention',
        'Multi-step',
        'Low',
        'Medium',
        '60,90',
        2,
      ].join(','),
    );
    lines.push(
      [
        3,
        'Chemistry',
        'Chemical Reactions',
        'Redox Reactions',
        'Difficult',
        'Conceptual Foundation',
        'Elimination',
        'Evaluation',
        'Oxidizing and reducing agents identification',
        'Oxidation states',
        'Direct',
        'None',
        'Low',
        '60,90',
        3,
      ].join(','),
    );
  }

  return lines.join('\r\n');
}

/**
 * Parses uploaded CSV text and maps it to ParsedMetadataRow items.
 */
export function parseMetadataCsv(csvText: string): MetadataCsvValidationResult {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const errors: Array<{ row: number; field: string; message: string }> = [];
  const warnings: Array<{ row: number; field: string; message: string }> = [];
  const validRows: ParsedMetadataRow[] = [];

  if (lines.length < 2) {
    errors.push({ row: 0, field: 'csv', message: 'CSV file is empty or missing headers.' });
    return { validRows, errors, warnings };
  }

  const rawHeader = parseCsvLine(lines[0]);
  const headerMap = new Map<string, number>();

  rawHeader.forEach((col, idx) => {
    const norm = col.toLowerCase().replace(/[^a-z0-9]/g, '');
    headerMap.set(norm, idx);
  });

  // Verify at least Qno column exists
  const qnoIdx = headerMap.get('qno') ?? headerMap.get('q') ?? headerMap.get('questionnumber') ?? headerMap.get('number');
  if (qnoIdx === undefined) {
    errors.push({
      row: 1,
      field: 'header',
      message: 'Header must contain "Qno" or "Question Number" column.',
    });
    return { validRows, errors, warnings };
  }

  const getCol = (cells: string[], names: string[]): string | null => {
    for (const name of names) {
      const idx = headerMap.get(name);
      if (idx !== undefined && idx < cells.length) {
        const val = cells[idx]?.trim();
        if (val) return val;
      }
    }
    return null;
  };

  const seenQnos = new Set<number>();

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

    const rawQno = cells[qnoIdx]?.trim();
    const qnoNum = Number(rawQno?.replace(/^Q/i, ''));

    if (!rawQno || isNaN(qnoNum) || qnoNum <= 0) {
      errors.push({
        row: rowNum,
        field: 'Qno',
        message: `Invalid question number "${rawQno}". Must be a positive number like 1 or Q1.`,
      });
      continue;
    }

    if (seenQnos.has(qnoNum)) {
      warnings.push({
        row: rowNum,
        field: 'Qno',
        message: `Duplicate question number Q${qnoNum}. Later row will overwrite earlier row.`,
      });
    }
    seenQnos.add(qnoNum);

    const subject = getCol(cells, ['subject', 'subj']);
    const chapter = getCol(cells, ['chapter', 'chap']);
    const topic = getCol(cells, ['topic']);
    const rawDiff = getCol(cells, ['difficulty', 'diff', 'difficultylabel']);
    const primarySkill = getCol(cells, ['primaryskill', 'skill', 'skillprimary']);
    const secondarySkill = getCol(cells, ['secondaryskill', 'skillsecondary']);
    const cognitiveLevel = getCol(cells, ['cognitivelevel', 'cognitive', 'bloom']);
    const conceptTested = getCol(cells, ['concepttested', 'concept']);
    const prerequisiteConcept = getCol(cells, ['prerequisiteconcept', 'prerequisite']);
    const questionStructure = getCol(cells, ['questionstructure', 'structure']);
    const visualDependency = getCol(cells, ['visualdependency', 'visual']);
    const calculationIntensity = getCol(cells, ['calculationintensity', 'calculation']);
    const rawExpectedTime = getCol(cells, ['expectedtime', 'time', 'timetaken']);
    const rawWeight = getCol(cells, ['diagnosticweight', 'weight']);

    const { level: diffLevel, label: diffLabel } = parseDifficulty(rawDiff);
    const { commaSeparated: timeStr, seconds: timeS } = parseExpectedTime(rawExpectedTime);

    let weightNum: number | null = null;
    if (rawWeight) {
      const parsedWeight = Number(rawWeight);
      if (!isNaN(parsedWeight) && parsedWeight > 0) {
        weightNum = parsedWeight;
      } else {
        warnings.push({
          row: rowNum,
          field: 'Diagnostic Weight',
          message: `Invalid diagnostic weight "${rawWeight}", defaulted to 1.`,
        });
        weightNum = 1;
      }
    }

    validRows.push({
      qno: qnoNum,
      subject: subject ?? undefined,
      chapter: chapter ?? null,
      topic: topic ?? null,
      difficulty: diffLevel,
      difficultyLabel: diffLabel,
      primarySkill: primarySkill ?? null,
      secondarySkill: secondarySkill ?? null,
      cognitiveLevel: cognitiveLevel ?? null,
      conceptTested: conceptTested ?? null,
      prerequisiteConcept: prerequisiteConcept ?? null,
      questionStructure: questionStructure ?? null,
      visualDependency: visualDependency ?? null,
      calculationIntensity: calculationIntensity ?? null,
      expectedTime: timeStr,
      expectedTimeS: timeS,
      diagnosticWeight: weightNum ?? 1,
    });
  }

  // Sort by qno ascending
  validRows.sort((a, b) => a.qno - b.qno);

  return { validRows, errors, warnings };
}
