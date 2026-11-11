import { classifyFetchSample, type FetchOutcome } from './classifyFetchSample';
import { LATENCY_THRESHOLDS } from './thresholds';
import type { HardwareTier } from './types';

const START_MS = 1000;

const abortError = () => {
  const error = new Error('Aborted');
  error.name = 'AbortError';
  return error;
};

const classify = ({
  outcome,
  elapsedMs,
  hardwareTier = 'HIGH',
  isStream = false,
  isTransportNone = false,
}: {
  outcome: FetchOutcome;
  elapsedMs: number;
  hardwareTier?: HardwareTier;
  isStream?: boolean;
  isTransportNone?: boolean;
}) =>
  classifyFetchSample({
    isStream,
    isTransportNone,
    outcome,
    startMs: START_MS,
    endMs: START_MS + elapsedMs,
    thresholds: LATENCY_THRESHOLDS[hardwareTier],
  });

describe('classifyFetchSample', () => {
  it('records the raw duration for a 4xx response', () => {
    const result = classify({
      outcome: { response: new Response(null, { status: 404 }) },
      elapsedMs: 1200,
    });

    expect(result).toEqual({ atMs: START_MS + 1200, durationMs: 1200 });
  });

  it('records the raw duration for a response without headers', () => {
    const result = classify({ outcome: { response: {} }, elapsedMs: 300 });

    expect(result).toEqual({ atMs: START_MS + 300, durationMs: 300 });
  });

  it.each<[HardwareTier, number]>([
    ['HIGH', 8000],
    ['MID', 15000],
    ['LOW', 30000],
  ])(
    'records a %s connection failure as at least %i ms',
    (hardwareTier, hungMs) => {
      const result = classify({
        outcome: { error: new Error('Cronet failed: net::ERR_TIMED_OUT') },
        elapsedMs: 500,
        hardwareTier,
      });

      expect(result).toEqual({ atMs: START_MS + 500, durationMs: hungMs });
    },
  );

  it('keeps a connection failure elapsed time above hungMs', () => {
    const result = classify({
      outcome: { error: new Error('timeout') },
      elapsedMs: 31000,
    });

    expect(result?.durationMs).toBe(31000);
  });

  it('records an AbortError at 8000 ms as at least hungMs', () => {
    const result = classify({
      outcome: { error: abortError() },
      elapsedMs: 8000,
      hardwareTier: 'LOW',
    });

    expect(result).toEqual({ atMs: START_MS + 8000, durationMs: 30000 });
  });

  it('skips an AbortError at 7999 ms', () => {
    const result = classify({
      outcome: { error: abortError() },
      elapsedMs: 7999,
    });

    expect(result).toBeNull();
  });

  it('skips a TypeError rejection', () => {
    const result = classify({
      outcome: { error: new TypeError('redirect mode is "error"') },
      elapsedMs: 20000,
    });

    expect(result).toBeNull();
  });

  it('skips a nitroPrefetched response', () => {
    const result = classify({
      outcome: {
        response: new Response(null, { headers: { nitroPrefetched: 'true' } }),
      },
      elapsedMs: 5,
    });

    expect(result).toBeNull();
  });

  it('skips a stream fetch', () => {
    const result = classify({
      outcome: { response: new Response(null) },
      elapsedMs: 9000,
      isStream: true,
    });

    expect(result).toBeNull();
  });

  it('skips while the transport is NONE', () => {
    const result = classify({
      outcome: { error: new Error('offline') },
      elapsedMs: 9000,
      isTransportNone: true,
    });

    expect(result).toBeNull();
  });
});
