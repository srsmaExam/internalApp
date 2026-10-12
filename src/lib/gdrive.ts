import fs from 'node:fs';
import { importPKCS8, SignJWT } from 'jose';

export type GDriveFileMeta = {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  sha256?: string;
  appProperties?: Record<string, string>;
};

let cachedAccessToken: { token: string; expiresAt: number } | null = null;
const keyToFileIdCache = new Map<string, string>();

/**
 * Parses and returns Google Service Account credentials from environment variables.
 */
function getCredentials(): { clientEmail: string; privateKeyPem: string; folderId: string } | null {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

  // 1. Check if GOOGLE_SERVICE_ACCOUNT_KEY is set (JSON string, base64, or file path)
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY?.trim();
  if (rawKey) {
    try {
      let jsonStr = rawKey;
      if (fs.existsSync(rawKey)) {
        jsonStr = fs.readFileSync(rawKey, 'utf8');
      } else if (!rawKey.startsWith('{')) {
        try {
          const decoded = Buffer.from(rawKey, 'base64').toString('utf8');
          if (decoded.startsWith('{')) jsonStr = decoded;
        } catch {
          // not base64
        }
      }
      const parsed = JSON.parse(jsonStr);
      if (parsed.client_email && parsed.private_key) {
        return {
          clientEmail: parsed.client_email,
          privateKeyPem: parsed.private_key.replace(/\\n/g, '\n'),
          folderId,
        };
      }
    } catch {
      // Fall through to individual env vars
    }
  }

  // 2. Check individual environment variables
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim();

  if (clientEmail && privateKeyRaw) {
    return {
      clientEmail,
      privateKeyPem: privateKeyRaw.replace(/\\n/g, '\n'),
      folderId,
    };
  }

  return null;
}

function getOAuthCredentials(): { clientId: string; clientSecret: string; refreshToken: string; folderId: string } | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN?.trim();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';

  if (clientId && clientSecret && refreshToken) {
    return { clientId, clientSecret, refreshToken, folderId };
  }
  return null;
}

export function isGoogleDriveConfigured(): boolean {
  return Boolean(getOAuthCredentials() || getCredentials());
}

export function getGoogleDriveFolderId(): string {
  return process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || '';
}

/**
 * Obtains an OAuth 2.0 access token:
 * 1. Using user OAuth 2.0 Refresh Token (uses personal 2 TB AI Pro storage quota!)
 * 2. Falling back to Service Account RS256 JWT assertion via jose.
 */
async function getAccessToken(): Promise<string> {
  if (cachedAccessToken && Date.now() < cachedAccessToken.expiresAt) {
    return cachedAccessToken.token;
  }

  // 1. User OAuth 2.0 (Prioritized: owns files, consumes user's 2 TB quota!)
  const oauth = getOAuthCredentials();
  if (oauth) {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: oauth.clientId,
        client_secret: oauth.clientSecret,
        refresh_token: oauth.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh Google OAuth token (${res.status}): ${errText}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const expiresAt = Date.now() + Math.max(60, data.expires_in - 120) * 1000;

    cachedAccessToken = {
      token: data.access_token,
      expiresAt,
    };

    return data.access_token;
  }

  // 2. Service Account RS256 JWT assertion fallback
  const creds = getCredentials();
  if (!creds) {
    throw new Error('Google Drive credentials are not configured.');
  }

  const privateKey = await importPKCS8(creds.privateKeyPem, 'RS256');

  const jwt = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/drive',
  })
    .setProtectedHeader({ alg: 'RS256' })
    .setIssuer(creds.clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to obtain Google Drive access token (${res.status}): ${errText}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = Date.now() + Math.max(60, data.expires_in - 120) * 1000;

  cachedAccessToken = {
    token: data.access_token,
    expiresAt,
  };

  return data.access_token;
}

/**
 * Encodes relativeKey into a filesystem-safe file name for Google Drive.
 * E.g. 'papers/1a52b506...pdf' -> 'papers__1a52b506...pdf'
 */
export function sanitizeDriveFileName(relativeKey: string): string {
  return relativeKey.replace(/[\/\\]/g, '__');
}

/**
 * Uploads a file buffer to Google Drive using multipart upload.
 */
export async function uploadToGoogleDrive(
  relativeKey: string,
  buffer: Buffer,
  contentType: string = 'application/pdf',
  sha256?: string
): Promise<{ fileId: string; name: string; size: number }> {
  const creds = getCredentials();
  if (!creds) throw new Error('Google Drive is not configured.');

  const token = await getAccessToken();
  const driveFileName = sanitizeDriveFileName(relativeKey);

  // Check if a file with this name already exists in the folder
  const existing = await findFileInGoogleDrive(relativeKey);
  if (existing) {
    // Delete existing duplicate to ensure a clean overwrite
    await deleteFromGoogleDrive(existing.id).catch(() => {});
  }

  const boundary = `-------SRSMABoundary${Date.now()}`;
  const metadata = {
    name: driveFileName,
    parents: creds.folderId ? [creds.folderId] : undefined,
    appProperties: {
      relativeKey,
      sha256: sha256 || '',
    },
  };

  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaHeader = 'Content-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify(metadata);
  const mediaHeader = `Content-Type: ${contentType}\r\n\r\n`;

  const body = Buffer.concat([
    Buffer.from(delimiter + metaHeader + delimiter + mediaHeader, 'utf-8'),
    buffer,
    Buffer.from(closeDelimiter, 'utf-8'),
  ]);

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Google Drive upload failed (${res.status}): ${errText}`);
  }

  const created = (await res.json()) as { id: string; name: string };
  keyToFileIdCache.set(relativeKey, created.id);

  return {
    fileId: created.id,
    name: created.name,
    size: buffer.length,
  };
}

/**
 * Searches for a file in the Google Drive folder by relativeKey.
 */
export async function findFileInGoogleDrive(relativeKey: string): Promise<GDriveFileMeta | null> {
  const creds = getCredentials();
  if (!creds) return null;

  const driveFileName = sanitizeDriveFileName(relativeKey);
  const token = await getAccessToken();

  const folderQuery = creds.folderId ? `'${creds.folderId}' in parents and ` : '';
  const escapedName = driveFileName.replace(/'/g, "\\'");
  const q = encodeURIComponent(`${folderQuery}name = '${escapedName}' and trashed = false`);

  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,md5Checksum,appProperties)`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as { files?: any[] };
  const file = data.files?.[0];
  if (!file) return null;

  keyToFileIdCache.set(relativeKey, file.id);

  return {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    size: Number(file.size ?? 0),
    sha256: file.appProperties?.sha256,
    appProperties: file.appProperties,
  };
}

/**
 * Fetches file metadata from Google Drive.
 */
export async function getGoogleDriveMetadata(fileIdOrKey: string): Promise<GDriveFileMeta | null> {
  if (!isGoogleDriveConfigured()) return null;

  // If it's a relativeKey, look up or use cache
  let fileId = fileIdOrKey;
  if (fileIdOrKey.includes('/') || fileIdOrKey.includes('\\')) {
    const cachedId = keyToFileIdCache.get(fileIdOrKey);
    if (cachedId) {
      fileId = cachedId;
    } else {
      const found = await findFileInGoogleDrive(fileIdOrKey);
      if (!found) return null;
      fileId = found.id;
    }
  }

  const token = await getAccessToken();
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,md5Checksum,appProperties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!res.ok) return null;

  const data = (await res.json()) as any;
  return {
    id: data.id,
    name: data.name,
    mimeType: data.mimeType,
    size: Number(data.size ?? 0),
    sha256: data.appProperties?.sha256,
    appProperties: data.appProperties,
  };
}

/**
 * Downloads a file buffer from Google Drive.
 */
export async function downloadFromGoogleDrive(
  fileIdOrKey: string
): Promise<{ buffer: Buffer; contentType: string; size: number; sha256?: string } | null> {
  if (!isGoogleDriveConfigured()) return null;

  let fileId = fileIdOrKey;
  let sha256: string | undefined;

  if (fileIdOrKey.includes('/') || fileIdOrKey.includes('\\')) {
    const meta = await findFileInGoogleDrive(fileIdOrKey);
    if (!meta) return null;
    fileId = meta.id;
    sha256 = meta.sha256;
  }

  const token = await getAccessToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return null;

  const contentType = res.headers.get('content-type') || 'application/octet-stream';
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return {
    buffer,
    contentType,
    size: buffer.length,
    sha256,
  };
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFromGoogleDrive(fileIdOrKey: string): Promise<void> {
  if (!isGoogleDriveConfigured()) return;

  let fileId = fileIdOrKey;
  if (fileIdOrKey.includes('/') || fileIdOrKey.includes('\\')) {
    const meta = await findFileInGoogleDrive(fileIdOrKey);
    if (!meta) return;
    fileId = meta.id;
    keyToFileIdCache.delete(fileIdOrKey);
  }

  const token = await getAccessToken();
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => {});
}

/**
 * Deletes files matching a prefix (e.g. 'images__questionId__') from Google Drive.
 */
export async function deletePrefixFromGoogleDrive(prefix: string): Promise<void> {
  const creds = getCredentials();
  if (!creds) return;

  const drivePrefix = sanitizeDriveFileName(prefix);
  const token = await getAccessToken();

  const folderQuery = creds.folderId ? `'${creds.folderId}' in parents and ` : '';
  const q = encodeURIComponent(`${folderQuery}name contains '${drivePrefix}' and trashed = false`);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) return;

  const data = (await res.json()) as { files?: { id: string }[] };
  if (data.files && data.files.length > 0) {
    await Promise.all(
      data.files.map((f) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${f.id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      )
    );
  }
}
