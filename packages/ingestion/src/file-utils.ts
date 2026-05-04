import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';

const gunzipAsync = promisify(gunzip);

/**
 * Decompress a single-member gzip buffer to raw bytes.
 */
export async function decompressGzip(buffer: Buffer): Promise<Buffer> {
  return gunzipAsync(buffer);
}

export function isProbablyGzip(buffer: Buffer): boolean {
  return buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/** If buffer looks like gzip (magic bytes), gunzip; otherwise return the same buffer. */
export async function decompressIfGzip(buffer: Buffer): Promise<Buffer> {
  return isProbablyGzip(buffer) ? decompressGzip(buffer) : buffer;
}

/**
 * SHA-256 hex digest of a file buffer (for ingestion dedupe / audit).
 */
export function calculateFileChecksumSha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/** Alias kept for new CLI parity with the original task description. */
export const calculateChecksum = calculateFileChecksumSha256;

export type SaveRawFileOptions = {
  /** Typically repo `data/raw`. */
  rootDir: string;
  retailerKey: string;
  /** Safe basename only (no path segments). */
  fileName: string;
  buffer: Buffer;
};

/**
 * Writes a raw feed under `rootDir/<retailerKey>/<yyyy-mm-dd>/<fileName>`.
 */
export async function saveRawFile(options: SaveRawFileOptions): Promise<string> {
  const safeName = path.basename(options.fileName);
  if (safeName !== options.fileName || safeName.includes('..')) {
    throw new Error(`Unsafe fileName for saveRawFile: ${options.fileName}`);
  }
  const day = new Date().toISOString().slice(0, 10);
  const dir = path.join(options.rootDir, options.retailerKey, day);
  await mkdir(dir, { recursive: true });
  const outPath = path.join(dir, safeName);
  await writeFile(outPath, options.buffer);
  return outPath;
}

/**
 * Writes pretty-printed JSON for processed pipeline output.
 */
export async function saveProcessedJson(outPath: string, data: unknown): Promise<void> {
  const dir = path.dirname(outPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

/**
 * Read entire file as buffer (used by CLI / fixture tooling).
 */
export async function readFileBuffer(filePath: string): Promise<Buffer> {
  return readFile(filePath);
}

/** mkdir -p */
export async function ensureDir(dirPath: string): Promise<string> {
  await mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Write any buffer to disk, ensuring the parent directory exists.
 * Returns the absolute path written.
 */
export async function saveBuffer(absPath: string, buffer: Buffer): Promise<string> {
  await ensureDir(path.dirname(absPath));
  await writeFile(absPath, buffer);
  return absPath;
}

export type FetchRedirectMode = 'follow' | 'error' | 'manual';

export type DownloadFileOptions = {
  /** Extra request headers (e.g. `Cookie`, `User-Agent`). */
  headers?: Record<string, string>;
  /** Abort the request after `timeoutMs` (default: 60_000). */
  timeoutMs?: number;
  /** Set to `'manual'` to inspect 30x responses yourself. */
  redirect?: FetchRedirectMode;
};

/**
 * GET a URL and return the response body as a Buffer. Uses the global
 * `fetch` from Node 18+. Throws on non-2xx unless `redirect: 'manual'`.
 */
export async function downloadFile(url: string, options: DownloadFileOptions = {}): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? 60_000);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'SupermarketAI-Ingestion/1.0 (+https://github.com/)',
        Accept: '*/*',
        ...options.headers,
      },
      redirect: (options.redirect ?? 'follow') as RequestInit['redirect'],
      signal: controller.signal,
    });
    if (options.redirect !== 'manual' && (res.status < 200 || res.status >= 300)) {
      throw new Error(`Download failed: ${res.status} ${res.statusText} for ${url}`);
    }
    const arr = await res.arrayBuffer();
    return Buffer.from(arr);
  } finally {
    clearTimeout(timeout);
  }
}
