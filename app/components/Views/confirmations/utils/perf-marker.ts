// TEMP perf instrumentation (Remove before merge).
//
// ONE metric: milliseconds from CTA tap (perfCtaPress) to the confirmation
// content becoming visible on screen (perfConfirmationVisible). Emits a single
// [PERF] line per deposit so speed-ups from each change are trivial to compare.
//   T0  perfCtaPress            - CTA tapped
//   T1  perfConfirmationVisible - first onLayout (visible)

let ctaTime: number | null = null;
let reported = false;

// TEMP on-screen readout (Remove before merge). Prod/minified bundles strip
// console.log, so we surface the last CTA->VISIBLE ms via a tiny pub/sub the
// PerfOverlay component subscribes to.
let lastMs: number | null = null;
const listeners = new Set<(ms: number) => void>();

export function subscribePerf(fn: (ms: number) => void): () => void {
  listeners.add(fn);
  if (lastMs !== null) {
    fn(lastMs);
  }
  return () => {
    listeners.delete(fn);
  };
}

export function getLastPerfMs(): number | null {
  return lastMs;
}

/**
 * Mark T0 — the moment the CTA (e.g. deposit "Add money" button) is pressed.
 * Resets the one-shot guard so the next confirmation paint is measured afresh.
 */
export function perfCtaPress(): void {
  ctaTime = Date.now();
  reported = false;
  // TEMP jstrace: begin full-program recording on CTA tap (Remove before merge).
  const g = globalThis as Record<string, unknown>;
  if (typeof g.__jtStart === 'function') {
    (g.__jtStart as () => void)();
  }
}

/**
 * Mark T1 — the confirmation content is visible on screen (first paint / layout).
 * Logs the single CTA->VISIBLE duration exactly once per CTA press.
 */
export function perfConfirmationVisible(): void {
  if (reported || ctaTime === null) {
    return;
  }
  reported = true;
  const ms = Date.now() - ctaTime;
  // eslint-disable-next-line no-console
  console.log(`[PERF] CTA->VISIBLE: ${ms}ms`);
  // TEMP surface to on-screen overlay (Remove before merge).
  lastMs = ms;
  listeners.forEach((fn) => fn(ms));

  // TEMP jstrace: stop recording the INSTANT the confirmation is visible so the
  // trace covers ONLY the CTA->VISIBLE window (no post-paint microtask storm),
  // then dump the Speedscope file (Remove before merge).
  const g = globalThis as Record<string, unknown>;
  if (typeof g.__jtStop === 'function') {
    (g.__jtStop as () => void)();
    if (typeof g.__jtDump === 'function') {
      // Fire-and-forget: status (writing -> written / error) is surfaced to the
      // overlay via the jstrace status pub/sub. Swallow the rejection here so a
      // failed write doesn't become an unhandled promise rejection.
      (g.__jtDump as () => Promise<string>)().catch(() => undefined);
    }
  }
}
