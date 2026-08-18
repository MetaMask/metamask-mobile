import {
  chartRawTimeToUnixMs,
  getApproxBarDurationSec,
  normalizeChartUnixSec,
} from '../timeUtils';

describe('normalizeChartUnixSec', () => {
  it('returns null for non-finite input', () => {
    expect(normalizeChartUnixSec(NaN)).toBeNull();
    expect(normalizeChartUnixSec(Infinity)).toBeNull();
    expect(normalizeChartUnixSec('not a number')).toBeNull();
  });

  it('treats values ≥ 1e12 as milliseconds', () => {
    expect(normalizeChartUnixSec(1_700_000_000_000)).toBe(1_700_000_000);
  });

  it('treats smaller values as seconds and floors', () => {
    expect(normalizeChartUnixSec(1_700_000_000.7)).toBe(1_700_000_000);
  });
});

describe('chartRawTimeToUnixMs', () => {
  it('returns null for non-finite input', () => {
    expect(chartRawTimeToUnixMs(NaN)).toBeNull();
  });

  it('passes ms-magnitude values through', () => {
    expect(chartRawTimeToUnixMs(1_700_000_000_000)).toBe(1_700_000_000_000);
  });

  it('multiplies sub-1e12 values by 1000 (preserves fractional seconds)', () => {
    expect(chartRawTimeToUnixMs(1_700_000_000.5)).toBe(1_700_000_000_500);
  });
});

describe('getApproxBarDurationSec', () => {
  it('returns default 300 with fewer than 2 bars', () => {
    expect(getApproxBarDurationSec([])).toBe(300);
    expect(getApproxBarDurationSec([{ time: 0 }])).toBe(300);
  });

  it('returns the gap between the last two bars in seconds', () => {
    expect(
      getApproxBarDurationSec([
        { time: 0 },
        { time: 60_000 },
        { time: 120_000 },
      ]),
    ).toBe(60);
  });

  it('clamps to minimum 60 seconds', () => {
    expect(getApproxBarDurationSec([{ time: 0 }, { time: 30_000 }])).toBe(60);
  });
});
