import { INTERVAL_MS_TO_TV, detectResolution } from './resolution';
import type { OHLCVBar } from './types';

function makeBar(time: number): OHLCVBar {
  return { time, open: 1, high: 2, low: 0.5, close: 1.5, volume: 100 };
}

function makeBars(
  startMs: number,
  intervalMs: number,
  count: number,
): OHLCVBar[] {
  return Array.from({ length: count }, (_, i) =>
    makeBar(startMs + i * intervalMs),
  );
}

describe('INTERVAL_MS_TO_TV', () => {
  it('maps 1-minute interval', () => {
    expect(INTERVAL_MS_TO_TV[60000]).toBe('1');
  });

  it('maps 1-day interval', () => {
    expect(INTERVAL_MS_TO_TV[86400000]).toBe('1D');
  });

  it('maps 1-week interval', () => {
    expect(INTERVAL_MS_TO_TV[604800000]).toBe('1W');
  });

  it('maps 1-month interval', () => {
    expect(INTERVAL_MS_TO_TV[2592000000]).toBe('1M');
  });
});

describe('detectResolution', () => {
  it('returns "5" for empty data', () => {
    expect(detectResolution([])).toBe('5');
  });

  it('returns "5" for a single bar', () => {
    expect(detectResolution([makeBar(1000)])).toBe('5');
  });

  it('detects 5-minute resolution', () => {
    const bars = makeBars(0, 300000, 20);
    expect(detectResolution(bars)).toBe('5');
  });

  it('detects 1-hour resolution', () => {
    const bars = makeBars(0, 3600000, 20);
    expect(detectResolution(bars)).toBe('60');
  });

  it('detects daily resolution', () => {
    const bars = makeBars(0, 86400000, 20);
    expect(detectResolution(bars)).toBe('1D');
  });

  it('detects weekly resolution', () => {
    const bars = makeBars(0, 604800000, 20);
    expect(detectResolution(bars)).toBe('1W');
  });

  it('uses median to handle outlier gaps', () => {
    // 9 normal 5-min bars + 1 large gap; median should still pick 5m
    const bars = makeBars(0, 300000, 10);
    bars[5] = makeBar(bars[4].time + 86400000); // one day gap
    // Re-sort to keep time-ordered (gap moves bar 5 forward)
    for (let i = 6; i < bars.length; i++) {
      bars[i] = makeBar(bars[5].time + (i - 5) * 300000);
    }
    expect(detectResolution(bars)).toBe('5');
  });

  it('handles only two bars', () => {
    const bars = makeBars(0, 3600000, 2);
    expect(detectResolution(bars)).toBe('60');
  });
});
