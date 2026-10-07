import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/db/client';
import { storedFiles } from '@/db/schema';
import { imageKey, paperKey, resolveDataPath } from './paths';

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
 * Prevents re-querying Supabase database for the same images across requests.
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
 * Persists a file into the database (stored_files) and mirrors to disk if writable.
 * This guarantees persistence in serverless environments (Vercel) while maintaining
 * fast local development behavior.
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

  // 1. Persist to PostgreSQL database
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
    console.warn('[storage] failed to write to database stored_files:', dbErr);
  }

  // 2. Attempt to mirror to disk (works on local PC; skipped in serverless / Cloudflare)
  if (!isServerlessRuntime()) {
    try {
      const absPath = resolveDataPath(relativeKey);
      await fsp.mkdir(path.dirname(absPath), { recursive: true });
      await fsp.writeFile(absPath, bytes);
    } catch {
      // Disk write skipped on read-only serverless filesystems
    }
  }

  return { absPath: relativeKey, sha256, size: bytes.length };
}

export function paperAbsPath(relativeKey: string): string {
  return resolveDataPath(relativeKey);
}

/**
 * Reads metadata (content-type, size, sha256) WITHOUT downloading the large binary/base64 payload.
 * Crucial for HTTP conditional requests (ETag / If-None-Match) to avoid Supabase DB egress.
 */
export async function getFileMetadata(relativeKey: string): Promise<FileMetadata | null> {
  const cached = memoryCache.get(relativeKey);
  if (cached) {
    return { contentType: cached.contentType, size: cached.size, sha256: cached.sha256 };
  }

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
        // For disk files, read buffer to get sha256 (local dev is fast)
        const buffer = await fsp.readFile(abs);
        const sha256 = createHash('sha256').update(buffer).digest('hex');
        return { contentType, size: stat.size, sha256 };
      }
    } catch {
      // Disk not available
    }
  }

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
 * Reads a file record from memory cache, disk cache, or database.
 */
export async function readFileRecord(relativeKey: string): Promise<FileRecord | null> {
  const cached = memoryCache.get(relativeKey);
  if (cached) {
    return cached;
  }

  // 1. Try disk first (fastest for local development)
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

  // 2. Fall back to PostgreSQL database
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

  try {
    const db = await getDb();
    await db.delete(storedFiles).where(eq(storedFiles.key, relativeKey));
  } catch {
    // DB delete failed or table not found
  }

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

  try {
    const db = await getDb();
    await db.delete(storedFiles).where(sql`${storedFiles.key} LIKE ${`images/${questionId}/%`}`);
  } catch {
    // Ignore
  }

  if (!isServerlessRuntime()) {
    try {
      await fsp.rm(resolveDataPath(`images/${questionId}`), { recursive: true, force: true });
    } catch {
      // Ignore
    }
  }
}

export { paperKey };

