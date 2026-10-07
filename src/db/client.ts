import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import type { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzleNodePg } from 'drizzle-orm/node-postgres';
import type { PgliteDatabase } from 'drizzle-orm/pglite';
import * as schema from './schema';
import { MIGRATIONS_DIR, PGDATA_DIR, ensureDataDirs } from '@/lib/paths';
import { sweepExpiredAttempts } from '@/lib/sweep';
import { withDbLock } from '@/lib/db-lock';

const { Pool } = pg;

export type ClientQueryable = {
  query: <T = unknown>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
  exec?: (sql: string) => Promise<unknown>;
};

export type Db = PgliteDatabase<typeof schema> & {
  $client: ClientQueryable;
};

/**
 * Global cache across Next.js dev-mode module reloads and serverless hot lambdas.
 */
const globalForDb = globalThis as unknown as {
  __vtpDb?: Promise<{ client: ClientQueryable; db: Db }>;
  __vtpSweepTimer?: NodeJS.Timeout;
  __vtpPgPool?: pg.Pool;
};

export function isExternalDb(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0);
}

/**
 * Resolves the active PostgreSQL connection URL.
 * Checks for Cloudflare Hyperdrive bindings first (for edge-accelerated Supabase pooling),
 * falling back to process.env.DATABASE_URL.
 */
async function getActiveDatabaseUrl(): Promise<string | null> {
  // 1. Direct process.env check (populated by Node, .env, or Cloudflare vars)
  if (process.env.DATABASE_URL && process.env.DATABASE_URL.trim().length > 0) {
    return process.env.DATABASE_URL.trim();
  }

  // 2. Cloudflare Worker request context (Bindings & Environment Variables)
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    let cfContext: any;
    try {
      cfContext = await getCloudflareContext({ async: true });
    } catch {
      cfContext = getCloudflareContext();
    }
    const cfEnv = cfContext?.env as Record<string, any> | undefined;
    const hyperdrive = cfEnv?.HYPERDRIVE as { connectionString?: string } | undefined;
    const databaseBinding = cfEnv?.DATABASE as { connectionString?: string } | undefined;
    if (hyperdrive?.connectionString) return hyperdrive.connectionString;
    if (databaseBinding?.connectionString) return databaseBinding.connectionString;
    if (typeof cfEnv?.DATABASE_URL === 'string' && cfEnv.DATABASE_URL.trim().length > 0) {
      return cfEnv.DATABASE_URL.trim();
    }
  } catch {
    // Outside of Cloudflare request context
  }

  return null;
}

/**
 * Dual-engine database initialization:
 * 1. If DATABASE_URL or Hyperdrive is available -> connects to production PostgreSQL connection pool (pg.Pool).
 * 2. If DATABASE_URL is unset -> boots in-process PGlite (data/pgdata) with zero configuration.
 */
async function initialise(): Promise<{ client: ClientQueryable; db: Db }> {
  const activeUrl = await getActiveDatabaseUrl();
  if (activeUrl) {
    const isLocalhost = activeUrl.includes('localhost') || activeUrl.includes('127.0.0.1');

    // Strip sslmode query parameter to prevent pg-connection-string from overriding
    // our explicit ssl config with an empty object {} that forces strict CA checking and
    // triggers SELF_SIGNED_CERT_IN_CHAIN on cloud providers like Supabase.
    const sanitizedUrl = activeUrl.replace(/([?&])sslmode=[^&]+(&|$)/, (m, p1, p2) => (p1 === '?' && p2 ? '?' : ''));

    const sslOption =
      process.env.DATABASE_SSL === 'false'
        ? false
        : !isLocalhost || process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : undefined;

    const pool =
      globalForDb.__vtpPgPool ??
      new Pool({
        connectionString: sanitizedUrl,
        ssl: sslOption,
        max: Number(process.env.DATABASE_POOL_MAX ?? 5),
        idleTimeoutMillis: 15_000,
        connectionTimeoutMillis: 10_000,
      });

    pool.on('error', (err) => {
      // In serverless / edge environments (Cloudflare Workers, Vercel), idle TCP connections
      // get quietly severed when isolates sleep. Logging without crashing ensures the pool
      // reconnects on the next query.
      console.warn('[db pool warning]', err.message);
    });

    globalForDb.__vtpPgPool = pool;

    // Skip runtime migrations during serverless cold starts in production unless explicitly enabled
    if (process.env.NODE_ENV !== 'production' || process.env.RUN_MIGRATIONS === 'true') {
      if (process.env.SKIP_RUNTIME_MIGRATIONS !== 'true') await runMigrations(pool);
    }
    const db = drizzleNodePg(pool, { schema }) as Db;
    db.$client = pool;

    // In non-serverless long-running production, initialize sweep interval
    const isServerless = Boolean(
      process.env.VERCEL === '1' ||
      process.env.CF_PAGES === '1' ||
      process.env.CLOUDFLARE === '1' ||
      process.env.DISABLE_SWEEP_TIMER === 'true'
    );
    if (!isServerless) {
      await sweepExpiredAttempts(db).catch((err) => console.error('[sweep] initial run failed', err));

      const SWEEP_INTERVAL_MS = 60_000;
      globalForDb.__vtpSweepTimer = setInterval(() => {
        sweepExpiredAttempts(db).catch((err) => console.error('[sweep] failed', err));
      }, SWEEP_INTERVAL_MS).unref();
    }

    return { client: pool, db };
  }

  // Fallback: Local development with embedded PGlite (never run in production/edge)
  const isServerlessOrProd = Boolean(
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL === '1' ||
    process.env.CF_PAGES === '1' ||
    process.env.CLOUDFLARE === '1' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );

  if (isServerlessOrProd) {
    throw new Error(
      '[db] DATABASE_URL is not configured in Cloudflare. Please set DATABASE_URL in wrangler.jsonc vars or Cloudflare Dashboard > Settings > Variables and Secrets.'
    );
  }

  ensureDataDirs();
  const { PGlite: PGliteClass } = await import('@electric-sql/pglite');
  const { drizzle: drizzlePglite } = await import('drizzle-orm/pglite');

  const pgInstance = await PGliteClass.create(PGDATA_DIR);
  await runMigrations(pgInstance);
  const db = drizzlePglite(pgInstance, { schema }) as Db;
  db.$client = pgInstance;


  await sweepExpiredAttempts(db).catch((err) => console.error('[sweep] initial run failed', err));

  const SWEEP_INTERVAL_MS = 60_000;
  globalForDb.__vtpSweepTimer = setInterval(() => {
    sweepExpiredAttempts(db).catch((err) => console.error('[sweep] failed', err));
  }, SWEEP_INTERVAL_MS).unref();

  return { client: pgInstance, db };
}

/**
 * Every entry point — route handlers, server components, CLI scripts — goes
 * through here.
 */
export function getDbBundle(): Promise<{ client: ClientQueryable; db: Db }> {
  if (!globalForDb.__vtpDb) {
    globalForDb.__vtpDb = initialise().catch((err) => {
      globalForDb.__vtpDb = undefined;
      throw err;
    });
  }
  return globalForDb.__vtpDb;
}

export async function getDb(): Promise<Db> {
  const bundle = await getDbBundle();
  if (process.env.NODE_ENV !== 'production' && !isExternalDb()) {
    await runMigrations(bundle.client).catch((err) => console.error('[db] dev migration check failed', err));
  }
  return bundle.db;
}

export async function getPg(): Promise<PGlite> {
  const bundle = await getDbBundle();
  if ('dumpDataDir' in bundle.client) {
    return bundle.client as PGlite;
  }
  throw new Error('getPg() is only available when running with embedded PGlite (DATABASE_URL unset).');
}

/**
 * Minimal forward-only migrator compatible with both PGlite and PostgreSQL.
 * Applies every drizzle/NNNN_*.sql not already recorded, in filename order.
 */
export async function runMigrations(client: ClientQueryable): Promise<void> {
  return withDbLock(async () => {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name       text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      );
    `);

    const appliedRes = await client.query<{ name: string }>('SELECT name FROM _migrations');
    const applied = new Set(appliedRes.rows.map((r) => r.name));

    const files = fs
      .readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.sql'))
      .map((e) => e.name)
      .sort();

    for (const name of files) {
      if (applied.has(name)) continue;
      const sqlContent = fs.readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8');
      try {
        if (typeof client.exec === 'function') {
          await client.exec(sqlContent);
        } else {
          await client.query(sqlContent);
        }
        await client.query('INSERT INTO _migrations (name) VALUES ($1)', [name]);
        console.log(`[db] applied migration ${name}`);
      } catch (err) {
        throw new Error(`Migration ${name} failed: ${(err as Error).message}`, { cause: err });
      }
    }
  });
}

/** Used by scripts that need to release the database connection before exiting. */
export async function closeDb(): Promise<void> {
  if (globalForDb.__vtpSweepTimer) {
    clearInterval(globalForDb.__vtpSweepTimer);
    globalForDb.__vtpSweepTimer = undefined;
  }
  if (!globalForDb.__vtpDb) return;
  const { client } = await globalForDb.__vtpDb;
  globalForDb.__vtpDb = undefined;
  const candidate = client as { close?: () => Promise<unknown>; end?: () => Promise<unknown> };
  if (typeof candidate.close === 'function') {
    await candidate.close();
  } else if (typeof candidate.end === 'function') {
    await candidate.end();
  }
  globalForDb.__vtpPgPool = undefined;
}
