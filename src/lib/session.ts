import fs from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { DATA_DIR, ensureDataDirs } from './paths';

export const SESSION_COOKIE = 'vtp_session';
// 90 days persistent session so the browser remembers the user across restarts
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 90;

export type Role = 'teacher' | 'student';

export type Session = {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  // FBR-03: true for self-service phone-login accounts not yet converted to
  // real enrolled students. Absent on cookies issued before this field
  // existed — always treat `undefined` the same as `false` so a live session
  // is never invalidated mid-exam by a shape change.
  isProvisional?: boolean;
};

let cachedKey: Uint8Array | undefined;

/**
 * Zero-config by design: if SESSION_SECRET is unset, generate one and persist it
 * under DATA_DIR so sessions survive a server restart. Setting SESSION_SECRET
 * explicitly makes them survive `npm run reset` too.
 */
function getKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) {
    cachedKey = new TextEncoder().encode(fromEnv);
    return cachedKey;
  }

  const isServerless = Boolean(
    process.env.VERCEL === '1' ||
    process.env.CF_PAGES === '1' ||
    process.env.CLOUDFLARE === '1' ||
    process.env.NODE_ENV === 'production' ||
    typeof (globalThis as any).WebSocketPair !== 'undefined'
  );

  if (isServerless) {
    const fallback = randomBytes(32).toString('base64url');
    cachedKey = new TextEncoder().encode(fallback);
    return cachedKey;
  }

  ensureDataDirs();
  const secretFile = path.join(DATA_DIR, '.session-secret');
  let secret: string;
  if (fs.existsSync(secretFile)) {
    secret = fs.readFileSync(secretFile, 'utf8').trim();
  } else {
    secret = randomBytes(32).toString('base64url');
    try {
      fs.writeFileSync(secretFile, secret, { mode: 0o600 });
      console.log('[auth] generated a session secret at data/.session-secret');
    } catch {
      // Read-only filesystem
    }
  }
  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export async function issueSession(session: Session): Promise<void> {
  const token = await new SignJWT({
    username: session.username,
    fullName: session.fullName,
    role: session.role,
    isProvisional: session.isProvisional ?? false,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(session.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getKey());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    expires: new Date(Date.now() + SESSION_TTL_SECONDS * 1000),
    // The local build is served over plain http on localhost, where a secure
    // cookie would simply never be sent. Anything not-development gets it, and
    // COOKIE_SECURE=true forces it on for a local https reverse proxy.
    secure: process.env.COOKIE_SECURE === 'true' || process.env.NODE_ENV === 'production',
  });
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** Returns the caller's session, or null. Never throws on a bad/expired token. */
export async function getSession(): Promise<Session | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getKey());
    if (!payload.sub || (payload.role !== 'teacher' && payload.role !== 'student')) return null;
    return {
      userId: payload.sub,
      username: String(payload.username ?? ''),
      fullName: String(payload.fullName ?? ''),
      role: payload.role,
      // Missing on cookies issued before FBR-03 — default to false rather
      // than invalidating every live session on deploy.
      isProvisional: payload.isProvisional === true,
    };
  } catch {
    return null;
  }
}
