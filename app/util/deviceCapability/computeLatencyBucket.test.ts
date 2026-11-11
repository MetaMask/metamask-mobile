import {
  computeLatencyBucket,
  summarizeLatencySamples,
} from './computeLatencyBucket';
import { LATENCY_THRESHOLDS } from './thresholds';
import type { LatencyBucket, LatencySample } from './types';

const NOW_MS = 1_000_000;

/** Samples spaced by `gapMs`, oldest first, ending at `NOW_MS`. */
const samplesOf = (durations: number[], gapMs = 1000): LatencySample[] =>
  durations.map((durationMs, index) => ({
    atMs: NOW_MS - (durations.length - 1 - index) * gapMs,
    durationMs,
  }));

const bucketFor = (
  durations: number[],
  previous: LatencyBucket = 'unknown',
  thresholds = LATENCY_THRESHOLDS.HIGH,
  gapMs = 1000,
) =>
  computeLatencyBucket({
    previous,
    samples: samplesOf(durations, gapMs),
    thresholds,
  });

describe('computeLatencyBucket', () => {
  describe('on HIGH', () => {
    it('enters slow on two 8000 ms samples among the newest five', () => {
      expect(bucketFor([300, 8000, 300, 8000, 300])).toBe('slow');
    });

    it('enters slow on three 2600 ms samples', () => {
      expect(bucketFor([2600, 2600, 2600])).toBe('slow');
    });

    it('enters slow on three 2600 ms samples one minute apart', () => {
      expect(
        bucketFor(
          [2600, 2600, 2600],
          'unknown',
          LATENCY_THRESHOLDS.HIGH,
          60_000,
        ),
      ).toBe('slow');
    });

    it('gives ok on three 2400 ms samples', () => {
      expect(bucketFor([2400, 2400, 2400])).toBe('ok');
    });

    it('enters slow from ok', () => {
      expect(bucketFor([8000, 8000], 'ok')).toBe('slow');
    });

    it('ignores a hung sample older than the newest five', () => {
      expect(bucketFor([8000, 300, 300, 300, 8000, 300])).toBe('ok');
    });
  });

  describe('on LOW', () => {
    const LOW = LATENCY_THRESHOLDS.LOW;

    it('does not enter slow on two 8000 ms samples', () => {
      expect(bucketFor([8000, 8000], 'unknown', LOW)).not.toBe('slow');
    });

    it('enters slow on two 30000 ms samples', () => {
      expect(bucketFor([30000, 30000], 'unknown', LOW)).toBe('slow');
    });

    it('gives ok on three 3300 ms samples', () => {
      expect(bucketFor([3300, 3300, 3300], 'unknown', LOW)).toBe('ok');
    });
  });

  describe('from slow', () => {
    it('stays slow on two good samples then one hung', () => {
      expect(bucketFor([300, 300, 8000], 'slow')).toBe('slow');
    });

    it('gives ok on three good samples in a row', () => {
      expect(bucketFor([8000, 8000, 300, 300, 300], 'slow')).toBe('ok');
    });

    it('gives ok on three good samples one minute apart', () => {
      expect(
        bucketFor([300, 300, 300], 'slow', LATENCY_THRESHOLDS.HIGH, 60_000),
      ).toBe('ok');
    });

    it('stays slow with fewer than three samples', () => {
      expect(bucketFor([300, 300], 'slow')).toBe('slow');
    });
  });

  it('stays unknown with fewer than three samples from unknown', () => {
    expect(bucketFor([300, 300])).toBe('unknown');
  });
});

describe('summarizeLatencySamples', () => {
  it('returns the median of an odd count', () => {
    const result = summarizeLatencySamples({
      samples: samplesOf([900, 100, 500]),
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result.medianMs).toBe(500);
  });

  it('returns the mean of the two middle values for an even count', () => {
    const result = summarizeLatencySamples({
      samples: samplesOf([100, 400, 600, 9000]),
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result).toEqual(
      expect.objectContaining({ medianMs: 500, hungCount: 1 }),
    );
  });

  it('keeps samples older than sixty seconds among the newest five', () => {
    const result = summarizeLatencySamples({
      samples: [
        { atMs: NOW_MS - 180_000, durationMs: 9000 },
        { atMs: NOW_MS - 120_000, durationMs: 9000 },
        { atMs: NOW_MS - 60_000, durationMs: 100 },
      ],
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result).toEqual({
      recent: [
        { atMs: NOW_MS - 180_000, durationMs: 9000 },
        { atMs: NOW_MS - 120_000, durationMs: 9000 },
        { atMs: NOW_MS - 60_000, durationMs: 100 },
      ],
      hungCount: 2,
      medianMs: 9000,
    });
  });

  it('returns a null median without samples', () => {
    const result = summarizeLatencySamples({
      samples: [],
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result.medianMs).toBeNull();
  });
});
