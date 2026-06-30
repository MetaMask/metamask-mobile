/**
 * @jest-environment jsdom
 */
import {
  applySubPaneHeightRatio,
  handleSetSubPaneLayout,
  hasActiveSubPaneIndicators,
} from '../subPane';
import {
  __resetStateForTests,
  getSubPaneHeightRatio,
  registerStudy,
  setChartReady,
  setWidget,
} from '../../../core/state';
import type {
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../../core/types';

const makeChart = (
  heights: number[],
): {
  chart: TVActiveChart;
  setAll: jest.Mock;
} => {
  const setAll = jest.fn();
  const chart = {
    getAllPanesHeight: () => heights,
    setAllPanesHeight: setAll,
  } as unknown as TVActiveChart;
  return { chart, setAll };
};

describe('hasActiveSubPaneIndicators', () => {
  beforeEach(() => __resetStateForTests());

  it('false when no studies registered', () => {
    expect(hasActiveSubPaneIndicators()).toBe(false);
  });

  it('true when MACD or RSI is active', () => {
    registerStudy('active', 'MACD', 'sid-1');
    expect(hasActiveSubPaneIndicators()).toBe(true);
    __resetStateForTests();
    registerStudy('active', 'BOL', 'sid-2');
    expect(hasActiveSubPaneIndicators()).toBe(false);
  });
});

describe('handleSetSubPaneLayout', () => {
  beforeEach(() => __resetStateForTests());

  it('clears the ratio when payload is null', () => {
    handleSetSubPaneLayout({ heightRatio: 0.3 });
    expect(getSubPaneHeightRatio()).toBe(0.3);
    handleSetSubPaneLayout({ heightRatio: null });
    expect(getSubPaneHeightRatio()).toBeNull();
  });

  it('ignores out-of-range ratios', () => {
    handleSetSubPaneLayout({ heightRatio: 0 });
    handleSetSubPaneLayout({ heightRatio: 1.5 });
    expect(getSubPaneHeightRatio()).toBeNull();
  });

  it('applies the ratio to an active chart when a sub-pane study exists', () => {
    const { chart, setAll } = makeChart([400, 100]);
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    registerStudy('active', 'MACD', 'sid-1');

    handleSetSubPaneLayout({ heightRatio: 0.2 });

    expect(setAll).toHaveBeenCalled();
    const newHeights = setAll.mock.calls[0][0];
    expect(newHeights.length).toBe(2);
    expect(newHeights[0]).toBeGreaterThan(0);
  });
});

describe('applySubPaneHeightRatio', () => {
  beforeEach(() => __resetStateForTests());

  it('is a no-op when ratio is null', () => {
    const { chart, setAll } = makeChart([400, 100]);
    applySubPaneHeightRatio(chart);
    expect(setAll).not.toHaveBeenCalled();
  });

  it('enforces a minimum main-pane height of 72px', () => {
    handleSetSubPaneLayout({ heightRatio: 0.9 });
    const { chart, setAll } = makeChart([100, 50]);
    applySubPaneHeightRatio(chart);
    const [main, bottom] = setAll.mock.calls[0][0];
    expect(main).toBeGreaterThanOrEqual(72);
    expect(main + bottom).toBe(150);
  });
});
