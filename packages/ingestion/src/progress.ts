/**
 * Shared progress reporter for long-running CLIs.
 *
 * Goals:
 *   - Single, consistent format across every ingestion script so logs are
 *     scannable when teeing to a file or watching in tmux.
 *   - When stderr is a TTY (interactive run), print updates **in-place** with
 *     a carriage return so the screen stays clean.
 *   - When stderr is NOT a TTY (e.g. piped to `tee logs.txt`), print one full
 *     line per update so `tail -f` reads naturally and `grep` works.
 *   - Compute ETA from observed throughput, not from a fixed assumption — so
 *     cache hits, retries, and rate-limit pauses all auto-correct.
 *
 * Example:
 *   const p = createProgress({ label: 'shufersal-bfs', total: 1500,
 *                              extra: () => ({ queued: queue.length }) });
 *   while (…) { p.tick(); }
 *   p.finish('crawl complete');
 *
 * Sample output (TTY, updated in place every ~5s):
 *   [shufersal-bfs] 312/1500 (20.8%) elapsed 52m04s ETA 3h18m | queued=487
 */

export type ProgressExtra = Record<string, string | number>;

export type ProgressOptions = {
  /** Tag prefixed to every line so multi-stage logs stay readable. */
  label: string;
  /**
   * Upper bound of expected `tick()` calls. Omit when truly unknown — the
   * reporter will then print rate-only updates without an ETA.
   */
  total?: number;
  /** Throttle: do not reprint more often than this. Default 1000ms. */
  intervalMs?: number;
  /** Where to write. Defaults to `process.stderr`. */
  stream?: NodeJS.WriteStream;
  /**
   * Extra key/value pairs appended to every line (e.g. live queue/matched
   * counters). Re-evaluated on every print so they always reflect "now".
   */
  extra?: () => ProgressExtra;
};

export type ProgressReporter = {
  /** Advance the counter by `n` (default 1). May trigger a print. */
  tick: (n?: number) => void;
  /** Force-print the current state and append a newline. */
  finish: (summary?: string) => void;
  /** Current counter value. */
  current: () => number;
};

/** Format `123` → `"2m03s"`, `4500` → `"1h15m"`. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m${rs.toString().padStart(2, '0')}s`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return `${h}h${rm.toString().padStart(2, '0')}m`;
}

function formatExtras(extras: ProgressExtra | undefined): string {
  if (!extras) return '';
  const parts = Object.entries(extras).map(([k, v]) => `${k}=${v}`);
  return parts.length > 0 ? ` | ${parts.join(' ')}` : '';
}

const LINE_PAD = 120;

export function createProgress(opts: ProgressOptions): ProgressReporter {
  const stream = opts.stream ?? process.stderr;
  const intervalMs = opts.intervalMs ?? 1000;
  const startedAt = Date.now();
  const tty = Boolean(stream.isTTY);
  let count = 0;
  let lastPrintAt = 0;

  const formatLine = () => {
    const elapsedMs = Date.now() - startedAt;
    const elapsedSec = elapsedMs / 1000;
    const rate = count / Math.max(elapsedSec, 0.001);

    const totalStr = opts.total != null ? `/${opts.total}` : '';
    const pctStr =
      opts.total != null && opts.total > 0
        ? ` (${((count / opts.total) * 100).toFixed(1)}%)`
        : '';
    const elapsedStr = ` elapsed ${formatDuration(elapsedSec)}`;
    const etaStr =
      opts.total != null && opts.total > count && rate > 0
        ? ` ETA ${formatDuration((opts.total - count) / rate)}`
        : opts.total == null && rate > 0
          ? ` ${rate.toFixed(1)}/s`
          : '';
    const extraStr = opts.extra ? formatExtras(opts.extra()) : '';
    return `[${opts.label}] ${count}${totalStr}${pctStr}${elapsedStr}${etaStr}${extraStr}`;
  };

  const print = (final = false) => {
    const line = formatLine();
    if (tty) {
      stream.write(`\r${line.padEnd(LINE_PAD)}${final ? '\n' : ''}`);
    } else {
      stream.write(line + '\n');
    }
    lastPrintAt = Date.now();
  };

  return {
    tick(n = 1) {
      count += n;
      const now = Date.now();
      if (now - lastPrintAt >= intervalMs) print();
    },
    finish(summary) {
      print(true);
      if (summary) stream.write(`[${opts.label}] ${summary}\n`);
    },
    current() {
      return count;
    },
  };
}
