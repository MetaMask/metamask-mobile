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
}: {
  outcome: FetchOutcome;
  elapsedMs: number;
  hardwareTier?: HardwareTier;
}) =>
  classifyFetchSample({
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

    expect(result).toBe(1200);
  });

  it('records the raw duration for a response without headers', () => {
    const result = classify({ outcome: { response: {} }, elapsedMs: 300 });

    expect(result).toBe(300);
  });

  it('skips a connection failure under hungMs', () => {
    const result = classify({
      outcome: { error: new Error('Cronet failed: net::ERR_TIMED_OUT') },
      elapsedMs: 500,
      hardwareTier: 'LOW',
    });

    expect(result).toBeNull();
  });

  it('keeps a connection failure elapsed time above hungMs', () => {
    const result = classify({
      outcome: { error: new Error('timeout') },
      elapsedMs: 31000,
    });

    expect(result).toBe(31000);
  });

  it('skips an AbortError at 8000 ms on LOW', () => {
    const result = classify({
      outcome: { error: abortError() },
      elapsedMs: 8000,
      hardwareTier: 'LOW',
    });

    expect(result).toBeNull();
  });

  it('records an AbortError at 30000 ms on LOW as 30000 ms', () => {
    const result = classify({
      outcome: { error: abortError() },
      elapsedMs: 30000,
      hardwareTier: 'LOW',
    });

    expect(result).toBe(30000);
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
});
