import {
  getPlotWidth,
  getVisibleTimeRangeSec,
  priceToY,
} from '../chartCoordinates';
import type { TVActiveChart } from '../types';

interface ScaleOptions {
  from?: number;
  to?: number;
  mode?: number;
  inverted?: boolean;
  height?: number;
  range?: { from: number; to: number } | null;
}

function makePriceChart({
  from = 0,
  to = 100,
  mode = 0,
  inverted = false,
  height = 400,
  range,
}: ScaleOptions = {}): TVActiveChart {
  return {
    getPanes: () => [
      {
        getMainSourcePriceScale: () => ({
          getVisiblePriceRange: () =>
            range === undefined ? { from, to } : range,
          getMode: () => mode,
          isInverted: () => inverted,
        }),
        getHeight: () => height,
      },
    ],
  } as unknown as TVActiveChart;
}

describe('priceToY', () => {
  it('maps a linear scale top-down (high price → small Y)', () => {
    const chart = makePriceChart();

    expect(priceToY(chart, 100)).toBe(0);
    expect(priceToY(chart, 50)).toBe(200);
    expect(priceToY(chart, 0)).toBe(400);
  });

  it('flips the mapping on an inverted scale', () => {
    const chart = makePriceChart({ inverted: true });

    expect(priceToY(chart, 100)).toBe(400);
    expect(priceToY(chart, 25)).toBe(100);
  });

  it('uses log spacing when the scale is in log mode', () => {
    const chart = makePriceChart({ from: 10, to: 1000, mode: 1 });

    // 100 is the geometric midpoint of [10, 1000].
    expect(priceToY(chart, 100)).toBeCloseTo(200);
  });

  it('falls back to linear in log mode when the range touches zero', () => {
    const chart = makePriceChart({ from: 0, to: 100, mode: 1 });

    expect(priceToY(chart, 50)).toBe(200);
  });

  it('accepts a reversed { from, to } range', () => {
    const chart = makePriceChart({ from: 100, to: 0 });

    expect(priceToY(chart, 50)).toBe(200);
  });

  it('clamps prices outside the visible range to its edges', () => {
    const chart = makePriceChart();

    expect(priceToY(chart, 500)).toBe(0);
    expect(priceToY(chart, -5)).toBe(400);
  });

  it.each([
    ['non-finite price', makePriceChart(), Number.NaN],
    ['zero pane height', makePriceChart({ height: 0 }), 50],
    ['missing visible range', makePriceChart({ range: null }), 50],
    ['no panes', { getPanes: () => [] } as unknown as TVActiveChart, 50],
    ['no getPanes', {} as unknown as TVActiveChart, 50],
    [
      'getPanes throws',
      {
        getPanes: () => {
          throw new Error('boom');
        },
      } as unknown as TVActiveChart,
      50,
    ],
  ])('returns null for %s', (_label, chart, price) => {
    expect(priceToY(chart, price)).toBeNull();
  });
});

describe('getVisibleTimeRangeSec', () => {
  it('prefers getVisibleBarsRange and orders the bounds', () => {
    const chart = {
      getVisibleBarsRange: () => ({ from: 200, to: 100 }),
      getVisibleRange: () => ({ from: 1, to: 2 }),
    } as unknown as TVActiveChart;

    expect(getVisibleTimeRangeSec(chart)).toEqual({ lo: 100, hi: 200 });
  });

  it('normalizes millisecond timestamps to seconds', () => {
    const chart = {
      getVisibleBarsRange: () => ({
        from: 1_700_000_000_000,
        to: 1_700_000_600_000,
      }),
    } as unknown as TVActiveChart;

    expect(getVisibleTimeRangeSec(chart)).toEqual({
      lo: 1_700_000_000,
      hi: 1_700_000_600,
    });
  });

  it('falls back to getVisibleRange when the bars range is unavailable', () => {
    const chart = {
      getVisibleBarsRange: () => null,
      getVisibleRange: () => ({ from: 10, to: 20 }),
    } as unknown as TVActiveChart;

    expect(getVisibleTimeRangeSec(chart)).toEqual({ lo: 10, hi: 20 });
  });

  it('falls back to getVisibleRange when getVisibleBarsRange throws', () => {
    const chart = {
      getVisibleBarsRange: () => {
        throw new Error('boom');
      },
      getVisibleRange: () => ({ from: 10, to: 20 }),
    } as unknown as TVActiveChart;

    expect(getVisibleTimeRangeSec(chart)).toEqual({ lo: 10, hi: 20 });
  });

  it('returns null when neither range API is available', () => {
    expect(getVisibleTimeRangeSec({} as unknown as TVActiveChart)).toBeNull();
  });
});

describe('getPlotWidth', () => {
  it('returns the time-scale width', () => {
    const chart = {
      getTimeScale: () => ({ width: () => 320 }),
    } as unknown as TVActiveChart;

    expect(getPlotWidth(chart)).toBe(320);
  });

  it('returns 0 when width is unavailable or getTimeScale throws', () => {
    const noWidth = {
      getTimeScale: () => ({}),
    } as unknown as TVActiveChart;
    const throws = {
      getTimeScale: () => {
        throw new Error('boom');
      },
    } as unknown as TVActiveChart;

    expect(getPlotWidth(noWidth)).toBe(0);
    expect(getPlotWidth(throws)).toBe(0);
  });
});
