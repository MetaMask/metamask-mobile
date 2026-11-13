import type { LatencySample, LatencyThresholds } from './types';

export type FetchOutcome =
  | { response: { headers?: Pick<Headers, 'has'> } }
  | { error: unknown };

interface ClassifyFetchSampleInput {
  outcome: FetchOutcome;
  startMs: number;
  endMs: number;
  thresholds: LatencyThresholds;
}

/**
 * Turns one settled `fetch` into a latency sample, or `null` when it must not
 * be recorded. Never reads the URL, headers other than `nitroPrefetched`, or
 * the error message.
 *
 * `TypeError` is a JS pre-flight miss (`blob:`, bad `data:` URL,
 * `redirect: 'error'`). Any other rejection shorter than `hungMs` is dropped:
 * a fast connection failure or a short abort must not count as a good sample.
 * nitro-fetch rejects native transport failures with a plain `Error`.
 */
export function classifyFetchSample({
  outcome,
  startMs,
  endMs,
  thresholds,
}: ClassifyFetchSampleInput): LatencySample | null {
  const elapsedMs = Math.max(0, endMs - startMs);

  if ('response' in outcome) {
    if (outcome.response.headers?.has('nitroPrefetched')) {
      return null;
    }
    return { atMs: endMs, durationMs: elapsedMs };
  }

  const { error } = outcome;
  if (error instanceof TypeError || elapsedMs < thresholds.hungMs) {
    return null;
  }

  return { atMs: endMs, durationMs: elapsedMs };
}
