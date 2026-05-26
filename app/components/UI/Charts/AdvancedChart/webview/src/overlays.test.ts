import { setState, resetState } from './state';
import { getPriceYForLastCloseOverlay } from './overlays';

beforeEach(() => {
  resetState();
});

describe('getPriceYForLastCloseOverlay', () => {
  function makeChart(lo: number, hi: number, height: number, mode = 0) {
    return {
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: lo, to: hi }),
            isInverted: () => false,
            getMode: () => mode,
          }),
          getHeight: () => height,
        },
      ],
    };
  }

  it('returns pixel position for a price within the range', () => {
    const chart = makeChart(100, 200, 400);
    const y = getPriceYForLastCloseOverlay(chart, 150);
    expect(y).toBe(200);
  });

  it('returns 0 for the highest price', () => {
    const chart = makeChart(100, 200, 400);
    const y = getPriceYForLastCloseOverlay(chart, 200);
    expect(y).toBe(0);
  });

  it('returns chart height for the lowest price', () => {
    const chart = makeChart(100, 200, 400);
    const y = getPriceYForLastCloseOverlay(chart, 100);
    expect(y).toBe(400);
  });

  it('returns null for null chart', () => {
    const y = getPriceYForLastCloseOverlay(null, 150);
    expect(y).toBeNull();
  });

  it('returns null for NaN price', () => {
    const chart = makeChart(100, 200, 400);
    const y = getPriceYForLastCloseOverlay(chart, NaN);
    expect(y).toBeNull();
  });

  it('handles log scale', () => {
    const chart = makeChart(10, 100, 400, 1);
    const y = getPriceYForLastCloseOverlay(chart, 10);
    expect(y).toBeCloseTo(400, 0);
  });

  it('handles inverted scale', () => {
    const chart = {
      getPanes: () => [
        {
          getMainSourcePriceScale: () => ({
            getVisiblePriceRange: () => ({ from: 100, to: 200 }),
            isInverted: () => true,
            getMode: () => 0,
          }),
          getHeight: () => 400,
        },
      ],
    };
    const y = getPriceYForLastCloseOverlay(chart, 150);
    expect(y).toBe(200);
  });

  it('returns null when panes are empty', () => {
    const chart = { getPanes: () => [] };
    const y = getPriceYForLastCloseOverlay(chart, 150);
    expect(y).toBeNull();
  });

  it('clamps price to visible range', () => {
    const chart = makeChart(100, 200, 400);
    const y = getPriceYForLastCloseOverlay(chart, 250);
    expect(y).toBe(0);
  });
});
