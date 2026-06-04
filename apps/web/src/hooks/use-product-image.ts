import { useCallback, useEffect, useState } from 'react';

/**
 * Number of attempts after the first failure before we give up.
 * With exponential backoff this is ~9s of total budget per consumer.
 */
const MAX_IMAGE_RETRIES = 4;
const BASE_BACKOFF_MS = 500;
const MAX_BACKOFF_MS = 4000;

/**
 * Per-probe wall-clock timeout. Retailer CDNs occasionally hang a connection
 * indefinitely; without this, that one stuck request would also stall every
 * probe queued behind it.
 */
const PROBE_TIMEOUT_MS = 12_000;

/**
 * Hard cap on simultaneously in-flight image probes across the whole app.
 * Browsers already limit ~6 connections per origin, but if a single origin
 * stalls under load, requests pile up and time out together. Throttling at
 * the app layer keeps the pipeline healthy when infinite scroll drops a
 * fresh page of two dozen new cards on us.
 */
const MAX_CONCURRENT_PROBES = 8;

type ImageState = 'idle' | 'loading' | 'loaded' | 'failed';
type ProbeResult = 'ok' | 'fail';

const verifiedUrls = new Set<string>();
const inFlightProbes = new Map<string, Promise<ProbeResult>>();

let activeProbeCount = 0;
const probeWaitQueue: Array<() => void> = [];

/**
 * Reserve one slot in the global probe pool. `start()` runs immediately if a
 * slot is free, otherwise it's queued. The returned function MUST be called
 * exactly once when the probe completes or is abandoned, so the next waiter
 * can move in.
 */
function acquireProbeSlot(start: () => void): () => void {
  let started = false;
  let released = false;

  const tryStart = () => {
    if (started || released) return;
    if (activeProbeCount >= MAX_CONCURRENT_PROBES) {
      probeWaitQueue.push(tryStart);
      return;
    }
    started = true;
    activeProbeCount += 1;
    start();
  };

  tryStart();

  return () => {
    if (released) return;
    released = true;
    if (started) {
      activeProbeCount -= 1;
      while (probeWaitQueue.length > 0 && activeProbeCount < MAX_CONCURRENT_PROBES) {
        const next = probeWaitQueue.shift();
        if (next) next();
      }
    } else {
      const idx = probeWaitQueue.indexOf(tryStart);
      if (idx >= 0) probeWaitQueue.splice(idx, 1);
    }
  };
}

/**
 * Resolve once we know whether `url` can be loaded. Multiple callers asking
 * about the same URL share a single in-flight probe, so a hundred cards
 * referencing the same image issue only one network request.
 */
function probeImageOnce(url: string): Promise<ProbeResult> {
  if (verifiedUrls.has(url)) return Promise.resolve('ok');
  const existing = inFlightProbes.get(url);
  if (existing) return existing;

  const promise = new Promise<ProbeResult>((resolve) => {
    let probe: HTMLImageElement | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let releaseSlot: (() => void) | null = null;
    let settled = false;

    const finish = (result: ProbeResult) => {
      if (settled) return;
      settled = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (probe) {
        probe.onload = null;
        probe.onerror = null;
        probe = null;
      }
      if (releaseSlot) {
        releaseSlot();
        releaseSlot = null;
      }
      resolve(result);
    };

    releaseSlot = acquireProbeSlot(() => {
      if (settled) return;
      probe = new Image();
      // Must match the visible <img> referrer policy or the two requests are
      // treated as separate cache entries.
      probe.referrerPolicy = 'no-referrer';
      probe.onload = () => {
        // naturalWidth === 0 catches the "200 OK with broken body" case some
        // CDNs return under stress.
        const ok = (probe?.naturalWidth ?? 0) > 0;
        finish(ok ? 'ok' : 'fail');
      };
      probe.onerror = () => finish('fail');
      timeoutId = setTimeout(() => finish('fail'), PROBE_TIMEOUT_MS);
      probe.src = url;
    });
  });

  inFlightProbes.set(url, promise);
  void promise.then((result) => {
    inFlightProbes.delete(url);
    if (result === 'ok') verifiedUrls.add(url);
  });

  return promise;
}

/**
 * Resilient product image loader.
 *
 * The visible `<img>` only renders after a successful probe, so by the time
 * it hits the DOM the URL is already in the browser cache and paints
 * immediately. If for some reason the cached entry was evicted by the time
 * the `<img>` mounts, `onImageError` re-runs the whole probe cycle.
 */
export function useProductImage(imageUrl: string | undefined, productId?: string) {
  const [state, setState] = useState<ImageState>(() => {
    if (!imageUrl) return 'idle';
    return verifiedUrls.has(imageUrl) ? 'loaded' : 'loading';
  });
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (!imageUrl) {
      setState('idle');
      return;
    }
    if (verifiedUrls.has(imageUrl)) {
      setState('loaded');
      return;
    }

    setState('loading');
    let cancelled = false;

    void (async () => {
      for (let attempt = 0; attempt <= MAX_IMAGE_RETRIES; attempt++) {
        if (attempt > 0) {
          const delay = Math.min(BASE_BACKOFF_MS * 2 ** (attempt - 1), MAX_BACKOFF_MS);
          await new Promise<void>((r) => setTimeout(r, delay));
          if (cancelled) return;
        }
        const result = await probeImageOnce(imageUrl);
        if (cancelled) return;
        if (result === 'ok') {
          setState('loaded');
          return;
        }
      }
      if (!cancelled) setState('failed');
    })();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, productId, retryToken]);

  const onImageError = useCallback(() => {
    if (imageUrl) verifiedUrls.delete(imageUrl);
    setState('loading');
    setRetryToken((n) => n + 1);
  }, [imageUrl]);

  return {
    /** Render the `<img>` — the browser cache is already warm. */
    showImage: state === 'loaded',
    /** Probe still in-flight; show a neutral shimmer, no error text. */
    isLoadingImage: state === 'loading',
    /** Retry budget exhausted; show the "image coming soon" placeholder. */
    imageFailed: state === 'failed',
    /**
     * Wire this to the visible `<img>`'s `onError` so we can recover if the
     * browser evicted the cached image between probe and paint.
     */
    onImageError,
  };
}
