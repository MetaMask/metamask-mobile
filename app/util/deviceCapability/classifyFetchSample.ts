import { LATENCY_ABORT_MIN_MS } from './thresholds';
import type { LatencySample, LatencyThresholds } from './types';

export type FetchOutcome =
  | { response: { headers?: Pick<Headers, 'has'> } }
  | { error: unknown };

interface ClassifyFetchSampleInput {
  isStream: boolean;
  isTransportNone: boolean;
  outcome: FetchOutcome;
  startMs: number;
  endMs: number;
  thresholds: LatencyThresholds;
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'name' in error &&
    error.name === 'AbortError'
  );
}

/**
 * Turns one settled `fetch` into a latency sample, or `null` when it must not
 * be recorded. Never reads the URL, headers other than `nitroPrefetched`, or
 * the error message.
 *
 * A connection failure is any rejection other than `AbortError` or
 * `TypeError`. nitro-fetch raises `TypeError` for JS pre-flight errors
 * (`blob:`, bad `data:` URL, `redirect: 'error'`), and native transport
 * failures reject with a plain `Error`.
 */
export function classifyFetchSample({
  isStream,
  isTransportNone,
  outcome,
  startMs,
  endMs,
  thresholds,
}: ClassifyFetchSampleInput): LatencySample | null {
  if (isStream || isTransportNone) {
    return null;
  }

  const elapsedMs = Math.max(0, endMs - startMs);

  if ('response' in outcome) {
    if (outcome.response.headers?.has('nitroPrefetched')) {
      return null;
    }
    return { atMs: endMs, durationMs: elapsedMs };
  }

  const { error } = outcome;
  if (isAbortError(error)) {
    if (elapsedMs < LATENCY_ABORT_MIN_MS) {
      return null;
    }
  } else if (error instanceof TypeError) {
    return null;
  }

  return { atMs: endMs, durationMs: Math.max(elapsedMs, thresholds.hungMs) };
}
