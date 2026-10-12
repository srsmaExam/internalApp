import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { and, eq } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client.js';
import { papers, questions, type QuestionMetadata } from '../src/db/schema.js';

interface SampleReportRow {
  Test_Paper_ID?: string;
  Question_Type?: string;
  Topic?: string;
  Sub_Topic?: string;
  Difficulty_Granular?: number;
  Difficulty_Categorical?: string;
  Phase?: number;
  ETA_Seconds?: number;
}

async function main() {
  const excelPath = path.resolve(process.cwd(), 'SampleReport.xlsx');
  if (!fs.existsSync(excelPath)) {
    console.error(`[attach-metadata] Missing ${excelPath}`);
    process.exitCode = 1;
    return;
  }

  const buf = fs.readFileSync(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const firstSheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[firstSheetName];
  const profilingRows: SampleReportRow[] = XLSX.utils.sheet_to_json(sheet);

  console.log(`[attach-metadata] Loaded ${profilingRows.length} profiling records from ${excelPath}.`);

  const db = await getDb();

  // Find target paper
  const allPapers = await db.select().from(papers);
  if (allPapers.length === 0) {
    console.error('[attach-metadata] No papers found in database.');
    process.exitCode = 1;
    return;
  }

  const paper =
    allPapers.find((p) => p.code === 'PT_01' || p.code === 'JM-1' || p.title.includes('Vectors 3D Statistics')) ??
    allPapers[0];

  console.log(`[attach-metadata] Attaching metadata to paper: [${paper.code}] "${paper.title}" (ID: ${paper.id})`);

  let updatedCount = 0;

  for (let idx = 0; idx < profilingRows.length; idx++) {
    const row = profilingRows[idx];
    const qno = idx + 1;

    const diffGranular = Number(row.Difficulty_Granular) || 7;
    const diffCat = row.Difficulty_Categorical || (diffGranular >= 8 ? 'Hard' : diffGranular <= 4 ? 'Easy' : 'Medium');
    const phase = Number(row.Phase) || 2;
    const etaSeconds = Number(row.ETA_Seconds) || 180;
    const qType = (row.Question_Type ?? 'MCQ').toUpperCase();

    const metadata: QuestionMetadata = {
      testPaperId: row.Test_Paper_ID ?? paper.code ?? 'PT_01',
      questionType: qType,
      topic: row.Topic ?? null,
      subTopic: row.Sub_Topic ?? null,
      difficultyGranular: diffGranular,
      difficultyCategorical: diffCat,
      phase,
      etaSeconds,
      // Backward compatibility fields
      difficultyLabel: diffCat,
      expectedTime: String(etaSeconds),
    };

    const condition = and(eq(questions.paperId, paper.id), eq(questions.sourceQno, qno));
    const [existing] = await db.select({ id: questions.id }).from(questions).where(condition);

    if (!existing) {
      console.warn(`[attach-metadata] Question Q${qno} not found for paper ${paper.code}`);
      continue;
    }

    await db
      .update(questions)
      .set({
        chapter: row.Topic ?? null,
        topic: row.Topic ?? null,
        difficulty: diffGranular,
        expectedTimeS: etaSeconds,
        type: qType === 'NVQ' ? 'integer' : 'mcq',
        metadata,
        updatedAt: new Date(),
      })
      .where(eq(questions.id, existing.id));

    updatedCount++;
    console.log(
      `  ✓ Q${qno.toString().padStart(2, ' ')}: [${qType}] "${row.Topic} > ${row.Sub_Topic}" | Diff: ${diffCat} (${diffGranular}) | Phase: ${phase} | ETA: ${etaSeconds}s`,
    );
  }

  console.log(`\n[attach-metadata] SUCCESS! Attached metadata to ${updatedCount}/${profilingRows.length} questions.`);

  await closeDb();
}

main().catch((err) => {
  console.error('[attach-metadata] FAILED:', err);
  process.exitCode = 1;
});
