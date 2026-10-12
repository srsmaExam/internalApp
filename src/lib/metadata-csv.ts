import * as XLSX from 'xlsx';

/**
 * Question Metadata CSV and Excel parsing, validation, and sample template generator.
 * Aligns with the JEE Online Test question profiling specification (SampleReport.xlsx).
 */

export interface ParsedMetadataRow {
  qno: number;
  testPaperId?: string | null;
  questionType?: string | null; // e.g. "MCQ", "NVQ"
  topic?: string | null;
  subTopic?: string | null;
  difficultyGranular?: number | null; // e.g. 1-10 (6, 7, 8, 9)
  difficultyCategorical?: string | null; // e.g. "Easy", "Medium", "Hard"
  phase?: number | null; // e.g. 1, 2, 3
  etaSeconds?: number | null; // e.g. 180 (seconds)

  // Mapped fields for compatibility with questions table and UI
  subject?: string;
  chapter?: string | null;
  difficulty?: number | null;
  difficultyLabel?: string | null;
  expectedTime?: string | null;
  expectedTimeS?: number | null;

  // Legacy fields
  primarySkill?: string | null;
  secondarySkill?: string | null;
  cognitiveLevel?: string | null;
  conceptTested?: string | null;
  prerequisiteConcept?: string | null;
  questionStructure?: string | null;
  visualDependency?: string | null;
  calculationIntensity?: string | null;
  diagnosticWeight?: number | null;
}

export interface MetadataCsvValidationResult {
  validRows: ParsedMetadataRow[];
  errors: Array<{ row: number; field: string; message: string }>;
  warnings: Array<{ row: number; field: string; message: string }>;
  sheetName?: string;
  totalSheets?: number;
}

/**
 * Standard CSV headers matching SampleReport.xlsx
 */
export const CSV_HEADERS = [
  'Question_Type',
  'Topic',
  'Sub_Topic',
  'Difficulty_Granular',
  'Difficulty_Categorical',
  'Phase',
  'ETA_Seconds',
] as const;

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
  if (norm === '3' || norm === 'difficult' || norm === 'hard') return { level: 3, label: 'Hard' };
  return { level: 2, label: 'Medium' };
}

export function parseExpectedTime(raw: string | null | undefined): { commaSeparated: string; seconds: number } {
  if (!raw) return { commaSeparated: '180', seconds: 180 };
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
  return { commaSeparated: '180', seconds: 180 };
}

/**
 * Generates sample CSV template matching SampleReport.xlsx format.
 */
export function generateSampleMetadataCsv(
  questions?: Array<{
    position: number;
    subject: string;
    type?: string;
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
      const qType = m.questionType || (q.type ? q.type.toUpperCase() : 'MCQ');
      const topic = m.topic || q.topic || q.chapter || 'Vector Algebra';
      const subTopic = m.subTopic || '';
      const diffGranular = m.difficultyGranular != null ? m.difficultyGranular : (q.difficulty ?? 7);
      const diffCat = m.difficultyCategorical || m.difficultyLabel || (diffGranular > 7 ? 'Hard' : diffGranular < 5 ? 'Easy' : 'Medium');
      const phase = m.phase != null ? m.phase : (diffGranular >= 8 ? 3 : diffGranular >= 6 ? 2 : 1);
      const etaSeconds = m.etaSeconds != null ? m.etaSeconds : (q.expectedTimeS ?? 180);

      lines.push(
        [
          escapeCsv(qType),
          escapeCsv(topic),
          escapeCsv(subTopic),
          diffGranular,
          escapeCsv(diffCat),
          phase,
          etaSeconds,
        ].join(','),
      );
    }
  } else {
    // Default 3 sample rows matching profiling spec without Test_Paper_ID
    lines.push(['MCQ', '3D Geometry', 'Distance & Lines', 7, 'Medium', 2, 180].join(','));
    lines.push(['MCQ', 'Statistics', 'Altered Data', 7, 'Medium', 2, 180].join(','));
    lines.push(['NVQ', 'Vector Algebra', 'STP Max Value', 7, 'Medium', 2, 150].join(','));
  }

  return lines.join('\r\n');
}

/**
 * Generates an Excel workbook (.xlsx binary as Uint8Array) matching SampleReport.xlsx format.
 */
export function generateMetadataExcel(
  questions?: Array<{
    position: number;
    subject: string;
    type?: string;
    chapter?: string | null;
    topic?: string | null;
    difficulty?: number | null;
    expectedTimeS?: number | null;
    metadata?: any;
  }>,
): Uint8Array {
  const rows: (string | number)[][] = [
    [...CSV_HEADERS],
  ];

  if (questions && questions.length > 0) {
    for (const q of questions) {
      const m = q.metadata || {};
      const qType = m.questionType || (q.type ? q.type.toUpperCase() : 'MCQ');
      const topic = m.topic || q.topic || q.chapter || 'Vector Algebra';
      const subTopic = m.subTopic || '';
      const diffGranular = m.difficultyGranular != null ? m.difficultyGranular : (q.difficulty ?? 7);
      const diffCat = m.difficultyCategorical || m.difficultyLabel || (diffGranular > 7 ? 'Hard' : diffGranular < 5 ? 'Easy' : 'Medium');
      const phase = m.phase != null ? m.phase : (diffGranular >= 8 ? 3 : diffGranular >= 6 ? 2 : 1);
      const etaSeconds = m.etaSeconds != null ? m.etaSeconds : (q.expectedTimeS ?? 180);

      rows.push([
        qType,
        topic,
        subTopic,
        diffGranular,
        diffCat,
        phase,
        etaSeconds,
      ]);
    }
  } else {
    rows.push(['MCQ', '3D Geometry', 'Distance & Lines', 7, 'Medium', 2, 180]);
    rows.push(['MCQ', 'Statistics', 'Altered Data', 7, 'Medium', 2, 180]);
    rows.push(['NVQ', 'Vector Algebra', 'STP Max Value', 7, 'Medium', 2, 150]);
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths for better readability in Excel
  ws['!cols'] = [
    { wch: 15 }, // Question_Type
    { wch: 22 }, // Topic
    { wch: 26 }, // Sub_Topic
    { wch: 18 }, // Difficulty_Granular
    { wch: 22 }, // Difficulty_Categorical
    { wch: 10 }, // Phase
    { wch: 14 }, // ETA_Seconds
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Metadata');
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(buffer);
}

/**
 * Parses uploaded Excel binary buffer (.xlsx or .xls) into MetadataCsvValidationResult
 */
export function parseMetadataExcel(buffer: ArrayBuffer | Uint8Array): MetadataCsvValidationResult {
  try {
    const wb = XLSX.read(buffer, { type: 'array' });
    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return {
        validRows: [],
        errors: [{ row: 0, field: 'excel', message: 'Excel workbook contains no sheets.' }],
        warnings: [],
      };
    }

    // Try to find a sheet matching "Metadata", "Questions", "SampleReport", or fallback to the first sheet
    const targetSheetName =
      wb.SheetNames.find((s) => /metadata|questions|samplereport|sheet1/i.test(s)) ||
      wb.SheetNames[0];

    const sheet = wb.Sheets[targetSheetName];
    if (!sheet) {
      return {
        validRows: [],
        errors: [{ row: 0, field: 'excel', message: `Sheet "${targetSheetName}" not found.` }],
        warnings: [],
      };
    }

    const csvText = XLSX.utils.sheet_to_csv(sheet);
    const parsed = parseMetadataCsv(csvText);
    return {
      ...parsed,
      sheetName: targetSheetName,
      totalSheets: wb.SheetNames.length,
    };
  } catch (err: any) {
    return {
      validRows: [],
      errors: [{ row: 0, field: 'excel', message: `Failed to parse Excel file: ${err.message}` }],
      warnings: [],
    };
  }
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

  // Check headers: must contain at least Qno OR (Topic / Question_Type / Sub_Topic)
  const qnoIdx =
    headerMap.get('qno') ??
    headerMap.get('q') ??
    headerMap.get('questionnumber') ??
    headerMap.get('number');

  const hasNewMetadataHeaders =
    headerMap.has('questiontype') ||
    headerMap.has('qtype') ||
    headerMap.has('type') ||
    headerMap.has('testpaperid') ||
    headerMap.has('topic') ||
    headerMap.has('subtopic') ||
    headerMap.has('difficultygranular');

  if (qnoIdx === undefined && !hasNewMetadataHeaders) {
    errors.push({
      row: 1,
      field: 'header',
      message: 'Header must contain metadata columns such as "Topic", "Sub_Topic", "Question_Type", or "Qno".',
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
  let sequentialQno = 1;

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1;
    const cells = parseCsvLine(lines[i]);
    if (cells.length === 0 || (cells.length === 1 && !cells[0])) continue;

    let qnoNum: number;
    if (qnoIdx !== undefined) {
      const rawQno = cells[qnoIdx]?.trim();
      const parsed = Number(rawQno?.replace(/^Q/i, ''));
      if (!rawQno || isNaN(parsed) || parsed <= 0) {
        errors.push({
          row: rowNum,
          field: 'Qno',
          message: `Invalid question number "${rawQno}". Must be a positive number like 1 or Q1.`,
        });
        continue;
      }
      qnoNum = parsed;
    } else {
      // Automatic sequential Qno matching row position (e.g. SampleReport.xlsx)
      qnoNum = sequentialQno++;
    }

    if (seenQnos.has(qnoNum)) {
      warnings.push({
        row: rowNum,
        field: 'Qno',
        message: `Duplicate question number Q${qnoNum}. Later row will overwrite earlier row.`,
      });
    }
    seenQnos.add(qnoNum);

    // Extract columns
    const testPaperId = getCol(cells, ['testpaperid', 'paperid', 'papercode', 'testid', 'paper', 'testpaper']);
    const rawQuestionType = getCol(cells, ['questiontype', 'qtype', 'type', 'questionkind']);
    const topic = getCol(cells, ['topic', 'chapter', 'mainconcept']);
    const subTopic = getCol(cells, ['subtopic', 'subconcept', 'sub']);

    const rawDiffGranular = getCol(cells, ['difficultygranular', 'diffgranular', 'granular', 'difficulty', 'diff']);
    const rawDiffCat = getCol(cells, ['difficultycategorical', 'diffcategorical', 'difficultylabel', 'categorical']);
    const rawPhase = getCol(cells, ['phase', 'phaseno', 'phaselevel']);
    const rawEta = getCol(cells, ['etaseconds', 'eta', 'expectedtime', 'time', 'timetaken']);

    // Legacy fields fallback
    const primarySkill = getCol(cells, ['primaryskill', 'skill', 'skillprimary']);
    const secondarySkill = getCol(cells, ['secondaryskill', 'skillsecondary']);
    const cognitiveLevel = getCol(cells, ['cognitivelevel', 'cognitive', 'bloom']);
    const conceptTested = getCol(cells, ['concepttested', 'concept']);
    const prerequisiteConcept = getCol(cells, ['prerequisiteconcept', 'prerequisite']);
    const questionStructure = getCol(cells, ['questionstructure', 'structure']);
    const visualDependency = getCol(cells, ['visualdependency', 'visual']);
    const calculationIntensity = getCol(cells, ['calculationintensity', 'calculation']);
    const rawWeight = getCol(cells, ['diagnosticweight', 'weight']);

    // Parse granular difficulty (1-10)
    let difficultyGranular: number | null = null;
    if (rawDiffGranular) {
      const parsedG = Number(rawDiffGranular);
      if (!isNaN(parsedG) && parsedG >= 1 && parsedG <= 10) {
        difficultyGranular = Math.round(parsedG);
      } else if (rawDiffGranular.toLowerCase() === 'easy') {
        difficultyGranular = 3;
      } else if (rawDiffGranular.toLowerCase() === 'medium') {
        difficultyGranular = 6;
      } else if (rawDiffGranular.toLowerCase() === 'hard' || rawDiffGranular.toLowerCase() === 'difficult') {
        difficultyGranular = 8;
      }
    }

    // Parse categorical difficulty
    let difficultyCategorical: string | null = null;
    if (rawDiffCat) {
      const norm = rawDiffCat.trim().toLowerCase();
      if (norm === 'easy') difficultyCategorical = 'Easy';
      else if (norm === 'hard' || norm === 'difficult') difficultyCategorical = 'Hard';
      else difficultyCategorical = 'Medium';
    } else if (difficultyGranular !== null) {
      difficultyCategorical = difficultyGranular >= 8 ? 'Hard' : difficultyGranular <= 4 ? 'Easy' : 'Medium';
    } else {
      difficultyCategorical = 'Medium';
    }

    // Parse phase (1, 2, 3)
    let phaseNum: number | null = null;
    if (rawPhase) {
      const parsedP = Number(rawPhase.replace(/[^0-9]/g, ''));
      if (!isNaN(parsedP) && parsedP >= 1 && parsedP <= 10) {
        phaseNum = parsedP;
      }
    }
    if (phaseNum === null) {
      phaseNum = (difficultyGranular ?? 6) >= 8 ? 3 : (difficultyGranular ?? 6) >= 6 ? 2 : 1;
    }

    // Parse ETA seconds
    let etaSeconds: number | null = null;
    if (rawEta) {
      const { seconds } = parseExpectedTime(rawEta);
      etaSeconds = seconds;
    } else {
      etaSeconds = 180;
    }

    const questionType = rawQuestionType ? rawQuestionType.toUpperCase() : null;

    validRows.push({
      qno: qnoNum,
      testPaperId: testPaperId ?? null,
      questionType: questionType ?? null,
      topic: topic ?? null,
      subTopic: subTopic ?? null,
      difficultyGranular: difficultyGranular ?? 7,
      difficultyCategorical: difficultyCategorical ?? 'Medium',
      phase: phaseNum,
      etaSeconds: etaSeconds ?? 180,

      // Mapped fields
      chapter: topic ?? null,
      difficulty: difficultyGranular ?? 7,
      difficultyLabel: difficultyCategorical ?? 'Medium',
      expectedTime: String(etaSeconds ?? 180),
      expectedTimeS: etaSeconds ?? 180,

      // Preserved legacy fields
      primarySkill: primarySkill ?? null,
      secondarySkill: secondarySkill ?? null,
      cognitiveLevel: cognitiveLevel ?? null,
      conceptTested: conceptTested ?? null,
      prerequisiteConcept: prerequisiteConcept ?? null,
      questionStructure: questionStructure ?? null,
      visualDependency: visualDependency ?? null,
      calculationIntensity: calculationIntensity ?? null,
      diagnosticWeight: rawWeight ? Number(rawWeight) || 1 : 1,
    });
  }

  // Sort by qno ascending
  validRows.sort((a, b) => a.qno - b.qno);

  return { validRows, errors, warnings };
}
