import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { storedFiles } from '@/db/schema';
import { imageKey, paperKey, resolveDataPath } from './paths';
import {
  isGoogleDriveConfigured,
  uploadToGoogleDrive,
  downloadFromGoogleDrive,
  getGoogleDriveMetadata,
  findFileInGoogleDrive,
  deleteFromGoogleDrive,
  deletePrefixFromGoogleDrive,
} from './gdrive';

export type FileRecord = {
  buffer: Buffer;
  contentType: string;
  size: number;
  sha256: string;
};

export type FileMetadata = {
  contentType: string;
  size: number;
  sha256: string;
};

function isServerlessRuntime(): boolean {
  return Boolean(
    process.env.VERCEL === '1' ||
    process.env.CF_PAGES === '1' ||
    process.env.CLOUDFLARE === '1' ||
    process.env.NODE_ENV === 'production' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );
}

/**
 * Bounded in-memory LRU cache for serverless warm lambdas.
 * Prevents re-querying Google Drive or database for the same images across requests.
 */
const MEMORY_CACHE_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
let currentCacheBytes = 0;
const memoryCache = new Map<string, FileRecord>();

function putMemoryCache(key: string, record: FileRecord) {
  if (record.size > 5 * 1024 * 1024) return; // Don't cache giant files > 5MB
  if (memoryCache.has(key)) {
    const existing = memoryCache.get(key)!;
    currentCacheBytes -= existing.size;
    memoryCache.delete(key);
  }
  while (currentCacheBytes + record.size > MEMORY_CACHE_MAX_BYTES && memoryCache.size > 0) {
    const firstKey = memoryCache.keys().next().value;
    if (!firstKey) break;
    const item = memoryCache.get(firstKey);
    if (item) currentCacheBytes -= item.size;
    memoryCache.delete(firstKey);
  }
  memoryCache.set(key, record);
  currentCacheBytes += record.size;
}

function evictMemoryCache(key: string) {
  const item = memoryCache.get(key);
  if (item) {
    currentCacheBytes -= item.size;
    memoryCache.delete(key);
  }
}

/**
 * Persists a file into Google Drive (or local disk/Postgres fallback).
 */
export async function saveBufferWithHash(
  relativeKey: string,
  bytes: Buffer,
  contentType: string = 'application/pdf',
): Promise<{ absPath: string; sha256: string; size: number }> {
  const sha256 = createHash('sha256').update(bytes).digest('hex');

  // Update in-memory cache
  putMemoryCache(relativeKey, {
    buffer: bytes,
    contentType,
    size: bytes.length,
    sha256,
  });

  let savedToCloud = false;

  // 1. Try Google Drive (2 TB AI Pro Storage)
  if (isGoogleDriveConfigured()) {
    try {
      await uploadToGoogleDrive(relativeKey, bytes, contentType, sha256);
      savedToCloud = true;
    } catch (gdriveErr) {
      console.warn('[storage] failed to write to Google Drive:', gdriveErr);
    }
  }

  // 2. Attempt to mirror to disk (local PC development; skipped in serverless)
  if (!isServerlessRuntime()) {
    try {
      const absPath = resolveDataPath(relativeKey);
      await fsp.mkdir(path.dirname(absPath), { recursive: true });
      await fsp.writeFile(absPath, bytes);
    } catch {
      // Disk write skipped on read-only environments
    }
  }

  // 3. PostgreSQL fallback: only if Google Drive is NOT configured and running in serverless without disk
  if (!savedToCloud && isServerlessRuntime()) {
    try {
      const db = await getDb();
      await db
        .insert(storedFiles)
        .values({
          key: relativeKey,
          data: bytes.toString('base64'),
          contentType,
          sizeBytes: bytes.length,
          sha256,
        })
        .onConflictDoUpdate({
          target: storedFiles.key,
          set: {
            data: bytes.toString('base64'),
            contentType,
            sizeBytes: bytes.length,
            sha256,
            createdAt: new Date(),
          },
        });
    } catch (dbErr) {
      console.warn('[storage] failed to write to database stored_files fallback:', dbErr);
    }
  }

  return { absPath: relativeKey, sha256, size: bytes.length };
}

export function paperAbsPath(relativeKey: string): string {
  return resolveDataPath(relativeKey);
}

/**
 * Reads metadata (content-type, size, sha256) WITHOUT downloading the large binary/base64 payload.
 * Crucial for HTTP conditional requests (ETag / If-None-Match) to avoid bandwidth egress.
 */
export async function getFileMetadata(relativeKey: string): Promise<FileMetadata | null> {
  const cached = memoryCache.get(relativeKey);
  if (cached) {
    return { contentType: cached.contentType, size: cached.size, sha256: cached.sha256 };
  }

  // 1. Try local disk first (fastest for local development)
  if (!isServerlessRuntime()) {
    try {
      const abs = resolveDataPath(relativeKey);
      if (fs.existsSync(abs)) {
        const stat = await fsp.stat(abs);
        const ext = path.extname(abs).toLowerCase();
        const contentType =
          ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
              ? 'application/pdf'
              : 'application/octet-stream';
        const buffer = await fsp.readFile(abs);
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        return { contentType, size: stat.size, sha256 };
      }
    } catch {
      // Disk not available
    }
  }

  // 2. Try Google Drive metadata
  if (isGoogleDriveConfigured()) {
    try {
      const meta = await getGoogleDriveMetadata(relativeKey);
      if (meta) {
        return {
          contentType: meta.mimeType || 'application/octet-stream',
          size: meta.size,
          sha256: meta.sha256 || '',
        };
      }
    } catch (err) {
      console.warn('[storage] Google Drive metadata read error for key:', relativeKey, err);
    }
  }

  // 3. Fallback to PostgreSQL database (for backwards compatibility during migration)
  try {
    const db = await getDb();
    const [row] = await db
      .select({
        contentType: storedFiles.contentType,
        sizeBytes: storedFiles.sizeBytes,
        sha256: storedFiles.sha256,
      })
      .from(storedFiles)
      .where(eq(storedFiles.key, relativeKey))
      .limit(1);

    if (row) {
      return {
        contentType: row.contentType,
        size: Number(row.sizeBytes),
        sha256: row.sha256,
      };
    }
  } catch (err) {
    console.warn('[storage] database metadata read error for key:', relativeKey, err);
  }

  return null;
}

/**
 * Reads a file record from memory cache, disk cache, Google Drive, or database.
 */
export async function readFileRecord(relativeKey: string): Promise<FileRecord | null> {
  const cached = memoryCache.get(relativeKey);
  if (cached) {
    return cached;
  }

  // 1. Try local disk first (fastest for local development)
  if (!isServerlessRuntime()) {
    try {
      const abs = resolveDataPath(relativeKey);
      if (fs.existsSync(abs)) {
        const buffer = await fsp.readFile(abs);
        const ext = path.extname(abs).toLowerCase();
        const contentType =
          ext === '.webp'
            ? 'image/webp'
            : ext === '.pdf'
              ? 'application/pdf'
              : 'application/octet-stream';
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        const rec = { buffer, contentType, size: buffer.length, sha256 };
        putMemoryCache(relativeKey, rec);
        return rec;
      }
    } catch {
      // Disk not available or read error
    }
  }

  // 2. Try Google Drive download
  if (isGoogleDriveConfigured()) {
    try {
      const file = await downloadFromGoogleDrive(relativeKey);
      if (file) {
        const sha256 = file.sha256 || createHash('sha256').update(file.buffer).digest('hex');
        const rec = {
          buffer: file.buffer,
          contentType: file.contentType,
          size: file.size,
          sha256,
        };
        putMemoryCache(relativeKey, rec);
        return rec;
      }
    } catch (err) {
      console.warn('[storage] Google Drive download error for key:', relativeKey, err);
    }
  }

  // 3. Fallback to PostgreSQL database (for backwards compatibility)
  try {
    const db = await getDb();
    const [row] = await db.select().from(storedFiles).where(eq(storedFiles.key, relativeKey)).limit(1);
    if (row) {
      const buffer = Buffer.from(row.data, 'base64');
      const rec = {
        buffer,
        contentType: row.contentType,
        size: Number(row.sizeBytes),
        sha256: row.sha256,
      };
      putMemoryCache(relativeKey, rec);
      return rec;
    }
  } catch (err) {
    console.warn('[storage] database read error for key:', relativeKey, err);
  }

  return null;
}

export async function readBuffer(relativeKey: string): Promise<Buffer> {
  const file = await readFileRecord(relativeKey);
  if (!file) throw new Error(`file_not_found: ${relativeKey}`);
  return file.buffer;
}

export function existsSync(relativeKey: string): boolean {
  if (isServerlessRuntime()) {
    return memoryCache.has(relativeKey);
  }
  try {
    return fs.existsSync(resolveDataPath(relativeKey));
  } catch {
    return false;
  }
}

export async function hasFile(relativeKey: string): Promise<boolean> {
  const meta = await getFileMetadata(relativeKey);
  return Boolean(meta);
}

export async function deleteIfExists(relativeKey: string): Promise<void> {
  evictMemoryCache(relativeKey);

  // 1. Delete from Google Drive
  if (isGoogleDriveConfigured()) {
    try {
      await deleteFromGoogleDrive(relativeKey);
    } catch (gdriveErr) {
      console.warn('[storage] Google Drive delete error for key:', relativeKey, gdriveErr);
    }
  }

  // 2. Delete from database if present
  try {
    const db = await getDb();
    await db.delete(storedFiles).where(eq(storedFiles.key, relativeKey));
  } catch {
    // DB delete failed or table not found
  }

  // 3. Delete from disk if present
  if (!isServerlessRuntime()) {
    try {
      const abs = resolveDataPath(relativeKey);
      await fsp.rm(abs, { force: true });
    } catch {
      // Disk delete failed
    }
  }
}

export async function saveQuestionImage(
  questionId: string,
  placeholderId: string,
  bytes: Buffer,
): Promise<{ relativeKey: string; size: number }> {
  const relativeKey = imageKey(questionId, placeholderId);
  await saveBufferWithHash(relativeKey, bytes, 'image/webp');
  return { relativeKey, size: bytes.length };
}

export async function deleteQuestionImageDir(questionId: string): Promise<void> {
  const prefix = `images/${questionId}/`;
  for (const k of memoryCache.keys()) {
    if (k.startsWith(prefix)) evictMemoryCache(k);
  }

  // 1. Delete from Google Drive
  if (isGoogleDriveConfigured()) {
    try {
      await deletePrefixFromGoogleDrive(prefix);
    } catch (gdriveErr) {
      console.warn('[storage] Google Drive prefix delete error for:', prefix, gdriveErr);
    }
  }

  // 2. Delete from database
  try {
    const db = await getDb();
    await db.delete(storedFiles).where(sql`${storedFiles.key} LIKE ${`images/${questionId}/%`}`);
  } catch {
    // Ignore
  }

  // 3. Delete from disk
  if (!isServerlessRuntime()) {
    try {
      await fsp.rm(resolveDataPath(`images/${questionId}`), { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }
}

export { paperKey };
