import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { gunzip } from 'node:zlib';
import { promisify } from 'node:util';
import path from 'node:path';
import { unzipSync } from 'fflate';

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

/** RL (and some other chains) ship `.gz` downloads that are actually ZIP archives. */
export function isProbablyZip(buffer: Buffer): boolean {
  return (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  );
}

/**
 * Extract the PriceFull (or Stores) XML from a single-file ZIP buffer.
 * Typical layout: `PriceFull7290058140886-039-202605180555.xml` inside
 * `pricefull7290058140886-039-202605180555.gz` (mislabeled extension).
 */
export function extractXmlFromZip(buffer: Buffer): Buffer {
  const entries = unzipSync(new Uint8Array(buffer));
  const names = Object.keys(entries).filter((n) => !n.endsWith('/'));
  if (names.length === 0) {
    throw new Error('ZIP archive is empty');
  }
  const xmlName =
    names.find((n) => /\.xml$/i.test(n) && /price|store/i.test(n)) ??
    names.find((n) => /\.xml$/i.test(n)) ??
    names[0];
  if (!xmlName) throw new Error('ZIP archive has no extractable entries');
  const payload = entries[xmlName];
  if (!payload || payload.length === 0) {
    throw new Error(`ZIP entry ${xmlName} is empty`);
  }
  return Buffer.from(payload);
}

/**
 * Decompress Israeli transparency feed bytes to raw XML.
 * Handles true gzip (`0x1f 0x8b`) and ZIP-in-disguise (`.gz` that starts with `PK`).
 */
export async function decompressIfGzip(buffer: Buffer): Promise<Buffer> {
  if (isProbablyGzip(buffer)) return decompressGzip(buffer);
  if (isProbablyZip(buffer)) return extractXmlFromZip(buffer);
  return buffer;
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
