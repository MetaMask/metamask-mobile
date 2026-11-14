import {
  computeLatencyBucket,
  summarizeLatencySamples,
} from './computeLatencyBucket';
import { LATENCY_THRESHOLDS } from './thresholds';
import type { LatencyBucket } from './types';

const bucketFor = (
  samples: number[],
  previous: LatencyBucket = 'UNKNOWN',
  thresholds = LATENCY_THRESHOLDS.HIGH,
) =>
  computeLatencyBucket({
    previous,
    samples,
    thresholds,
  });

describe('computeLatencyBucket', () => {
  describe('on HIGH', () => {
    it('enters slow on two 8000 ms samples among the newest five', () => {
      expect(bucketFor([300, 8000, 300, 8000, 300])).toBe('SLOW');
    });

    it('enters slow on three 2600 ms samples', () => {
      expect(bucketFor([2600, 2600, 2600])).toBe('SLOW');
    });

    it('gives ok on three 2400 ms samples', () => {
      expect(bucketFor([2400, 2400, 2400])).toBe('OK');
    });

    it('enters slow from ok', () => {
      expect(bucketFor([8000, 8000], 'OK')).toBe('SLOW');
    });

    it('ignores a hung sample older than the newest five', () => {
      expect(bucketFor([8000, 300, 300, 300, 8000, 300])).toBe('OK');
    });
  });

  describe('on LOW', () => {
    const LOW = LATENCY_THRESHOLDS.LOW;

    it('does not enter slow on two 8000 ms samples', () => {
      expect(bucketFor([8000, 8000], 'UNKNOWN', LOW)).not.toBe('SLOW');
    });

    it('enters slow on two 30000 ms samples', () => {
      expect(bucketFor([30000, 30000], 'UNKNOWN', LOW)).toBe('SLOW');
    });

    it('gives ok on three 3300 ms samples', () => {
      expect(bucketFor([3300, 3300, 3300], 'UNKNOWN', LOW)).toBe('OK');
    });
  });

  describe('from slow', () => {
    it('stays slow on two good samples then one hung', () => {
      expect(bucketFor([300, 300, 8000], 'SLOW')).toBe('SLOW');
    });

    it('gives ok on three good samples in a row', () => {
      expect(bucketFor([8000, 8000, 300, 300, 300], 'SLOW')).toBe('OK');
    });

    it('stays slow with fewer than three samples', () => {
      expect(bucketFor([300, 300], 'SLOW')).toBe('SLOW');
    });
  });

  it('stays unknown with fewer than three samples from unknown', () => {
    expect(bucketFor([300, 300])).toBe('UNKNOWN');
  });
});

describe('summarizeLatencySamples', () => {
  it('returns the median of an odd count', () => {
    const result = summarizeLatencySamples({
      samples: [900, 100, 500],
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result.medianMs).toBe(500);
  });

  it('returns the mean of the two middle values for an even count', () => {
    const result = summarizeLatencySamples({
      samples: [100, 400, 600, 9000],
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result).toEqual(
      expect.objectContaining({ medianMs: 500, hungCount: 1 }),
    );
  });

  it('returns a null median without samples', () => {
    const result = summarizeLatencySamples({
      samples: [],
      thresholds: LATENCY_THRESHOLDS.HIGH,
    });

    expect(result.medianMs).toBeNull();
  });
});
