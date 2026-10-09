import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb, closeDb } from '../src/db/client';
import {
  papers,
  questions,
  questionImages,
  storedFiles,
  tests,
  testQuestions,
  profiles,
} from '../src/db/schema';
import { imageKey, paperKey } from '../src/lib/paths';

const LOCAL_PAPER_DIR = path.resolve(process.cwd(), 'LocalPaper');
const PAPER_JSON_PATH = path.join(LOCAL_PAPER_DIR, 'paper.json');
const IMAGES_DIR = path.join(LOCAL_PAPER_DIR, 'images');
const PDF_PATH = path.join(LOCAL_PAPER_DIR, 'source_paper.pdf');

async function main() {
  // 1. Verify paper.json exists
  if (!fs.existsSync(PAPER_JSON_PATH)) {
    console.error(`[sync-local-paper] Missing ${PAPER_JSON_PATH}`);
    console.log('\nWorkflow reminder:');
    console.log('  1. Start local dev: npm run dev');
    console.log('  2. Ingest your paper and crop images in the verify studio.');
    console.log('  3. Export to code: npm run export:local-paper');
    console.log('  4. Re-run this sync: npm run sync:local-paper');
    process.exitCode = 1;
    return;
  }

  const rawJson = await fsp.readFile(PAPER_JSON_PATH, 'utf8');
  const data = JSON.parse(rawJson);

  const db = await getDb();
  const dbType = process.env.DATABASE_URL ? 'External PostgreSQL / Supabase' : 'Local PGlite';
  console.log(`[sync-local-paper] Connected to database: ${dbType}`);

  // 2. Identify faculty / teacher profile to own this paper
  const teacherRows = await db
    .select({ id: profiles.id, username: profiles.username, email: profiles.email })
    .from(profiles)
    .where(eq(profiles.role, 'teacher'))
    .limit(1);

  let teacherId: string;
  if (teacherRows.length > 0) {
    teacherId = teacherRows[0].id;
    console.log(`[sync-local-paper] Paper registered under faculty: "${teacherRows[0].username}" (${teacherRows[0].email})`);
  } else {
    // If running on a totally fresh database with no teacher, create a default SRSMA teacher
    teacherId = crypto.randomUUID();
    await db.insert(profiles).values({
      id: teacherId,
      username: 'Teacher',
      fullName: 'SRSMA Faculty',
      email: 'exams.srsma@gmail.com',
      role: 'teacher',
      canLogin: true,
    });
    console.log('[sync-local-paper] Provisioned default faculty account for paper ownership.');
  }

  // 3. Upsert Paper
  const p = data.paper;
  const paperId = p.id ?? crypto.randomUUID();
  const relativePdfKey = paperKey(paperId);

  // If source_paper.pdf exists in LocalPaper/, upload it to stored_files
  let pdfSha256 = p.sha256 ?? 'unknown-sha256';
  let pdfSize = Number(p.fileSizeBytes ?? 0);

  if (fs.existsSync(PDF_PATH)) {
    const pdfBytes = await fsp.readFile(PDF_PATH);
    pdfSha256 = createHash('sha256').update(pdfBytes).digest('hex');
    pdfSize = pdfBytes.length;

    await db
      .insert(storedFiles)
      .values({
        key: relativePdfKey,
        data: pdfBytes.toString('base64'),
        contentType: 'application/pdf',
        sizeBytes: pdfSize,
        sha256: pdfSha256,
      })
      .onConflictDoUpdate({
        target: storedFiles.key,
        set: {
          data: pdfBytes.toString('base64'),
          contentType: 'application/pdf',
          sizeBytes: pdfSize,
          sha256: pdfSha256,
          createdAt: new Date(),
        },
      });
    console.log(`[sync-local-paper] Uploaded source PDF (${(pdfSize / 1024).toFixed(1)} KB) to stored_files`);
  }

  await db
    .insert(papers)
    .values({
      id: paperId,
      title: p.title,
      code: p.code,
      examYear: p.examYear ?? new Date().getFullYear(),
      pdfPages: p.pdfPages ?? null,
      registeredBy: teacherId,
      filePath: relativePdfKey,
      originalFilename: p.originalFilename ?? 'source_paper.pdf',
      fileSizeBytes: pdfSize,
      sha256: pdfSha256,
      extractionMeta: p.extractionMeta ?? null,
    })
    .onConflictDoUpdate({
      target: papers.id,
      set: {
        title: p.title,
        code: p.code,
        examYear: p.examYear ?? new Date().getFullYear(),
        pdfPages: p.pdfPages ?? null,
        filePath: relativePdfKey,
        fileSizeBytes: pdfSize,
        sha256: pdfSha256,
        extractionMeta: p.extractionMeta ?? null,
      },
    });

  console.log(`[sync-local-paper] Upserted paper: [${p.code}] "${p.title}"`);

  // 4. Upsert Questions
  const questionRows = data.questions;
  console.log(`[sync-local-paper] Syncing ${questionRows.length} questions...`);

  for (const q of questionRows) {
    await db
      .insert(questions)
      .values({
        id: q.id,
        humanCode: q.humanCode ?? null,
        paperId: paperId,
        sourceQno: q.sourceQno,
        sourcePage: q.sourcePage ?? null,
        subject: q.subject,
        type: q.type,
        status: 'verified',
        body: q.body,
        options: q.options ?? [],
        answer: q.answer ?? null,
        solution: q.solution ?? null,
        difficulty: q.difficulty ?? 2,
        expectedTimeS: q.expectedTimeS ?? 60,
        chapter: q.chapter ?? null,
        topic: q.topic ?? null,
        metadata: q.metadata ?? null,
        verifiedAt: new Date(),
        verifiedBy: teacherId,
        createdBy: teacherId,
        lastEditedBy: teacherId,
      })
      .onConflictDoUpdate({
        target: questions.id,
        set: {
          paperId: paperId,
          sourceQno: q.sourceQno,
          sourcePage: q.sourcePage ?? null,
          subject: q.subject,
          type: q.type,
          status: 'verified',
          body: q.body,
          options: q.options ?? [],
          answer: q.answer ?? null,
          solution: q.solution ?? null,
          difficulty: q.difficulty ?? 2,
          expectedTimeS: q.expectedTimeS ?? 60,
          chapter: q.chapter ?? null,
          topic: q.topic ?? null,
          metadata: q.metadata ?? null,
          verifiedAt: new Date(),
          verifiedBy: teacherId,
          lastEditedBy: teacherId,
          updatedAt: new Date(),
        },
      });
  }

  // 5. Upsert Question Images & Stored Files
  const imageRows = data.questionImages ?? [];
  let syncedImagesCount = 0;

  for (const img of imageRows) {
    const relKey = imageKey(img.questionId, img.placeholderId);

    // Look for image file on disk in LocalPaper/images/<questionId>/<placeholderId>.webp
    // or LocalPaper/images/<placeholderId>.webp
    let foundBytes: Buffer | null = null;
    const pathA = path.join(IMAGES_DIR, img.questionId, `${img.placeholderId}.webp`);
    const pathB = path.join(IMAGES_DIR, `${img.placeholderId}.webp`);

    if (fs.existsSync(pathA)) {
      foundBytes = await fsp.readFile(pathA);
    } else if (fs.existsSync(pathB)) {
      foundBytes = await fsp.readFile(pathB);
    }

    if (foundBytes) {
      const sha256 = createHash('sha256').update(foundBytes).digest('hex');
      // Upsert into stored_files table
      await db
        .insert(storedFiles)
        .values({
          key: relKey,
          data: foundBytes.toString('base64'),
          contentType: 'image/webp',
          sizeBytes: foundBytes.length,
          sha256,
        })
        .onConflictDoUpdate({
          target: storedFiles.key,
          set: {
            data: foundBytes.toString('base64'),
            contentType: 'image/webp',
            sizeBytes: foundBytes.length,
            sha256,
            createdAt: new Date(),
          },
        });
      syncedImagesCount++;
    }

    // Upsert question_images row
    await db
      .insert(questionImages)
      .values({
        id: img.id ?? crypto.randomUUID(),
        questionId: img.questionId,
        placeholderId: img.placeholderId,
        storagePath: relKey,
        altText: img.altText ?? null,
        widthPx: img.widthPx ?? null,
        heightPx: img.heightPx ?? null,
        sourcePage: img.sourcePage ?? null,
        cropRect: img.cropRect ?? null,
      })
      .onConflictDoUpdate({
        target: [questionImages.questionId, questionImages.placeholderId],
        set: {
          storagePath: relKey,
          altText: img.altText ?? null,
          sourcePage: img.sourcePage ?? null,
          cropRect: img.cropRect ?? null,
        },
      });
  }

  console.log(`[sync-local-paper] Synced ${imageRows.length} image references (${syncedImagesCount} binaries uploaded to stored_files).`);

  // 6. Upsert Test with audience = 'public' (JEE Online Test)
  const testConfig = data.test ?? {};
  const testTitle = testConfig.title ?? p.title ?? 'JEE Online Test — Class 10 Diagnostic Test';

  const [existingTest] = await db
    .select({ id: tests.id })
    .from(tests)
    .where(eq(tests.title, testTitle))
    .limit(1);

  let targetTestId = existingTest?.id;

  if (targetTestId) {
    await db
      .update(tests)
      .set({
        title: testTitle,
        description: testConfig.description ?? 'A Diagnostic Test for Class 10 Students.',
        durationS: Number(testConfig.durationS ?? 1200), // default 20 mins
        audience: 'public', // Always ensure public for Board Challenge
        isPublished: true,
        resultsPolicy: testConfig.resultsPolicy ?? 'immediate',
        shuffleQuestions: testConfig.shuffleQuestions ?? false,
        shuffleOptions: testConfig.shuffleOptions ?? false,
      })
      .where(eq(tests.id, targetTestId));
    console.log(`[sync-local-paper] Updated existing test: "${testTitle}" (ID: ${targetTestId})`);
  } else {
    targetTestId = crypto.randomUUID();
    await db.insert(tests).values({
      id: targetTestId,
      title: testTitle,
      description: testConfig.description ?? 'A Diagnostic Test for Class 10 Students.',
      durationS: Number(testConfig.durationS ?? 1200),
      maxAttempts: 1,
      audience: 'public', // CRITICAL for provisional / phone-login students
      isPublished: true,
      resultsPolicy: testConfig.resultsPolicy ?? 'immediate',
      shuffleQuestions: testConfig.shuffleQuestions ?? false,
      shuffleOptions: testConfig.shuffleOptions ?? false,
      createdBy: teacherId,
    });
    console.log(`[sync-local-paper] Created new public test: "${testTitle}" (ID: ${targetTestId})`);
  }

  // 7. Upsert Test Questions
  // Delete existing question mappings for this test to maintain exact position order
  await db.delete(testQuestions).where(eq(testQuestions.testId, targetTestId));

  for (let idx = 0; idx < questionRows.length; idx++) {
    const q = questionRows[idx];
    await db.insert(testQuestions).values({
      testId: targetTestId,
      questionId: q.id,
      position: idx + 1,
      marksCorrect: '4',
      marksWrong: '-1',
      marksUnattempted: '0',
    });
  }

  console.log(`[sync-local-paper] Linked ${questionRows.length} questions to test.`);

  console.log('\n================================================================');
  console.log(' [sync-local-paper] SYNC SUCCESSFUL!');
  console.log('================================================================');
  console.log(`  Target Database:   ${dbType}`);
  console.log(`  Paper Code:        ${p.code}`);
  console.log(`  Test Title:        "${testTitle}"`);
  console.log(`  Audience:          public (Visible to all students & phone logins)`);
  console.log(`  Status:            Published (Ready to take)`);
  console.log(`  Questions:         ${questionRows.length}`);
  console.log(`  Images in DB:      ${syncedImagesCount}`);
  console.log('================================================================\n');

  await closeDb();
}

main().catch((err) => {
  console.error('[sync-local-paper] FAILED:', err);
  process.exitCode = 1;
});
