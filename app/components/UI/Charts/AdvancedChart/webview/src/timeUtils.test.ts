import {
  normalizeChartUnixSec,
  chartRawTimeToUnixMs,
  getApproxBarDurationSec,
  interpolateCloseAlongLineAtTimeMs,
  parseTimeFromTvDataLast,
  parseCloseFromTvDataLast,
} from './timeUtils';
import type { OHLCVBar } from './types';

function makeBar(time: number, close: number): OHLCVBar {
  return { time, open: close, high: close, low: close, close, volume: 0 };
}

describe('normalizeChartUnixSec', () => {
  it('returns seconds as-is when < 1e12', () => {
    expect(normalizeChartUnixSec(1700000000)).toBe(1700000000);
  });

  it('converts ms to seconds when >= 1e12', () => {
    expect(normalizeChartUnixSec(1700000000000)).toBe(1700000000);
  });

  it('returns null for NaN', () => {
    expect(normalizeChartUnixSec(NaN)).toBeNull();
    expect(normalizeChartUnixSec('abc')).toBeNull();
  });
});

describe('chartRawTimeToUnixMs', () => {
  it('returns ms when already ms', () => {
    expect(chartRawTimeToUnixMs(1700000000000)).toBe(1700000000000);
  });

  it('converts seconds to ms', () => {
    expect(chartRawTimeToUnixMs(1700000000)).toBe(1700000000000);
  });

  it('returns null for NaN', () => {
    expect(chartRawTimeToUnixMs('abc')).toBeNull();
  });
});

describe('getApproxBarDurationSec', () => {
  it('returns 300 for empty data', () => {
    expect(getApproxBarDurationSec([])).toBe(300);
  });

  it('returns 300 for single bar', () => {
    expect(getApproxBarDurationSec([makeBar(1000, 1)])).toBe(300);
  });

  it('computes duration from last two bars', () => {
    const bars = [makeBar(1000000, 1), makeBar(1060000, 2)];
    expect(getApproxBarDurationSec(bars)).toBe(60);
  });

  it('enforces minimum of 60 seconds', () => {
    const bars = [makeBar(1000, 1), makeBar(1010, 2)];
    expect(getApproxBarDurationSec(bars)).toBe(60);
  });
});

describe('interpolateCloseAlongLineAtTimeMs', () => {
  const bars = [makeBar(1000, 10), makeBar(2000, 20), makeBar(3000, 30)];

  it('returns first close for time <= first bar', () => {
    expect(interpolateCloseAlongLineAtTimeMs(bars, 500)).toBe(10);
  });

  it('returns last close for time >= last bar', () => {
    expect(interpolateCloseAlongLineAtTimeMs(bars, 5000)).toBe(30);
  });

  it('interpolates linearly between bars', () => {
    expect(interpolateCloseAlongLineAtTimeMs(bars, 1500)).toBe(15);
  });

  it('returns exact close at bar boundary', () => {
    expect(interpolateCloseAlongLineAtTimeMs(bars, 2000)).toBe(20);
  });

  it('returns null for empty data', () => {
    expect(interpolateCloseAlongLineAtTimeMs([], 1000)).toBeNull();
  });
});

describe('parseTimeFromTvDataLast', () => {
  it('parses from array (index 0)', () => {
    expect(parseTimeFromTvDataLast([1700, 0, 0, 0, 100])).toBe(1700);
  });

  it('parses from object with .time', () => {
    expect(parseTimeFromTvDataLast({ time: 1700 })).toBe(1700);
  });

  it('parses from object.value array', () => {
    expect(parseTimeFromTvDataLast({ value: [1700] })).toBe(1700);
  });

  it('returns null for null/undefined', () => {
    expect(parseTimeFromTvDataLast(null)).toBeNull();
    expect(parseTimeFromTvDataLast(undefined)).toBeNull();
  });
});

describe('parseCloseFromTvDataLast', () => {
  it('parses from array (index 4)', () => {
    expect(parseCloseFromTvDataLast([0, 0, 0, 0, 42.5])).toBe(42.5);
  });

  it('parses from object.close', () => {
    expect(parseCloseFromTvDataLast({ close: 99 })).toBe(99);
  });

  it('parses from object.value as number', () => {
    expect(parseCloseFromTvDataLast({ value: 55 })).toBe(55);
  });

  it('returns null for array too short', () => {
    expect(parseCloseFromTvDataLast([1, 2, 3])).toBeNull();
  });

  it('returns null for null', () => {
    expect(parseCloseFromTvDataLast(null)).toBeNull();
  });
});
