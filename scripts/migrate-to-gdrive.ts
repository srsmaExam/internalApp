import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { getDb, closeDb } from '../src/db/client';
import { resolveDataPath } from '../src/lib/paths';
import {
  isGoogleDriveConfigured,
  uploadToGoogleDrive,
  findFileInGoogleDrive,
} from '../src/lib/gdrive';

type FileToMigrate = {
  key: string;
  source: 'database' | 'disk';
  contentType: string;
  buffer: Buffer;
  sizeBytes: number;
  sha256: string;
};

async function main() {
  const isDryRun = process.argv.includes('--dry-run');
  const cleanDb = process.argv.includes('--clean-db');

  console.log('============================================================');
  console.log('   Google Drive Data Migration Tool — SRSMA TestApp         ');
  console.log('============================================================\n');

  const isConfigured = isGoogleDriveConfigured();

  if (!isConfigured) {
    console.log('⚠️ Google Drive credentials are not yet configured in environment!\n');
    console.log('To migrate existing data to Google Drive, please add these to your .env:');
    console.log('  GOOGLE_SERVICE_ACCOUNT_EMAIL=srsma-storage@your-project.iam.gserviceaccount.com');
    console.log('  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----\\n"');
    console.log('  GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id\n');
    console.log('(Or place your downloaded service-account.json in the project root and set:');
    console.log('  GOOGLE_SERVICE_ACCOUNT_KEY=./service-account.json');
    console.log('  GOOGLE_DRIVE_FOLDER_ID=your_google_drive_folder_id)\n');

    if (!isDryRun) {
      console.log('Run with --dry-run to preview the files waiting for migration:');
      console.log('  npm run migrate:gdrive -- --dry-run\n');
      process.exit(1);
    }
  }

  const filesMap = new Map<string, FileToMigrate>();

  // 1. Gather files from PostgreSQL stored_files
  console.log('[1/4] Checking PostgreSQL database stored_files table...');
  try {
    const db = await getDb();
    const rowsRes = await (db as any).$client.query(
      'SELECT key, content_type, size_bytes, data, sha256 FROM stored_files ORDER BY size_bytes DESC'
    );
    const rows = rowsRes.rows;
    console.log(`  Found ${rows.length} file(s) in database.`);

    for (const row of rows) {
      const buffer = Buffer.from(row.data, 'base64');
      const sha256 = row.sha256 || createHash('sha256').update(buffer).digest('hex');
      filesMap.set(row.key, {
        key: row.key,
        source: 'database',
        contentType: row.content_type || 'application/octet-stream',
        buffer,
        sizeBytes: buffer.length,
        sha256,
      });
    }
  } catch (err) {
    console.warn('  ⚠️ Could not read database stored_files:', err);
  }

  // 2. Gather files from local disk (data/papers and data/images)
  console.log('\n[2/4] Checking local disk storage (data/papers & data/images)...');
  const diskRoots = [
    { dir: resolveDataPath('papers'), prefix: 'papers' },
    { dir: resolveDataPath('images'), prefix: 'images' },
  ];

  for (const { dir, prefix } of diskRoots) {
    if (!fs.existsSync(dir)) continue;

    function walkDir(currentDir: string, currentRel: string) {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        const relPath = path.posix.join(currentRel, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath, relPath);
        } else if (entry.isFile()) {
          if (!filesMap.has(relPath)) {
            const buffer = fs.readFileSync(fullPath);
            const ext = path.extname(entry.name).toLowerCase();
            const contentType =
              ext === '.webp' ? 'image/webp' : ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
            const sha256 = createHash('sha256').update(buffer).digest('hex');
            filesMap.set(relPath, {
              key: relPath,
              source: 'disk',
              contentType,
              buffer,
              sizeBytes: buffer.length,
              sha256,
            });
          }
        }
      }
    }

    walkDir(dir, prefix);
  }

  console.log(`  Total unique files discovered across DB & disk: ${filesMap.size}`);

  let totalBytes = 0;
  for (const file of filesMap.values()) {
    totalBytes += file.sizeBytes;
    console.log(
      `   • ${file.key.padEnd(50)} [${file.source}] ${(file.sizeBytes / 1024).toFixed(1)} KB (${file.contentType})`
    );
  }
  console.log(`\n  Total data payload: ${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);

  if (isDryRun) {
    console.log('\n🔍 [DRY RUN] Completed file inventory. No files were uploaded or deleted.');
    await closeDb();
    return;
  }

  if (!isConfigured) {
    console.error('\n❌ Cannot proceed with upload: Google Drive is not configured.');
    await closeDb();
    process.exit(1);
  }

  // 3. Upload to Google Drive
  console.log('\n[3/4] Uploading files to Google Drive...');
  let successCount = 0;
  let failCount = 0;

  for (const file of filesMap.values()) {
    try {
      console.log(`  Uploading ${file.key} (${(file.sizeBytes / 1024).toFixed(1)} KB)...`);
      const uploaded = await uploadToGoogleDrive(file.key, file.buffer, file.contentType, file.sha256);

      // Verify upload
      const verified = await findFileInGoogleDrive(file.key);
      if (!verified) {
        throw new Error(`Verification failed: file not found in Google Drive after upload`);
      }

      console.log(`    ✅ Uploaded & Verified (Drive File ID: ${uploaded.fileId})`);
      successCount++;
    } catch (err: any) {
      console.error(`    ❌ Failed to upload ${file.key}:`, err?.message || err);
      failCount++;
    }
  }

  console.log(`\nUpload complete: ${successCount} succeeded, ${failCount} failed.`);

  // 4. Cleanup PostgreSQL if requested and successful
  if (cleanDb && successCount > 0 && failCount === 0) {
    console.log('\n[4/4] Cleaning up stored_files from PostgreSQL database to free 500MB storage limit...');
    try {
      const db = await getDb();
      const delRes = await (db as any).$client.query('DELETE FROM stored_files');
      console.log(`  ✅ Successfully purged ${delRes.rowCount ?? successCount} row(s) from stored_files!`);
      console.log('  🎉 Supabase database storage successfully recovered!');
    } catch (cleanErr) {
      console.warn('  ⚠️ Could not clean stored_files table:', cleanErr);
    }
  } else if (!cleanDb) {
    console.log('\n[4/4] PostgreSQL database cleanup skipped (use --clean-db flag once upload is verified).');
  }

  await closeDb();
  console.log('\n============================================================');
  console.log('  Migration process finished successfully!                   ');
  console.log('============================================================\n');
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await closeDb();
  process.exit(1);
});
