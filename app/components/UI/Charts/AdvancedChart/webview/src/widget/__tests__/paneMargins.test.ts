import {
  BASE_PANE_TOP_MARGIN,
  MAX_PANE_TOP_MARGIN,
  __resetPaneMarginsForTests,
  computeTopMarginPercent,
  getPaneTopMarginPercent,
  markTopMarginApplied,
  setReservedTopPx,
} from '../paneMargins';
import {
  __resetStateForTests,
  setChartReady,
  setWidget,
} from '../../core/state';
import type { TVActiveChart, TVChartingLibraryWidget } from '../../core/types';

function makeChart(paneHeight: number): TVActiveChart {
  return {
    getPanes: () => [{ getHeight: () => paneHeight }],
  } as unknown as TVActiveChart;
}

function installWidget(): jest.Mock {
  const applyOverrides = jest.fn();
  setWidget({ applyOverrides } as unknown as TVChartingLibraryWidget);
  setChartReady(true);
  return applyOverrides;
}

describe('computeTopMarginPercent', () => {
  it('returns the base margin when nothing is reserved', () => {
    expect(computeTopMarginPercent(0, 200)).toBe(BASE_PANE_TOP_MARGIN);
  });

  it('returns the base margin when the pane height is unknown', () => {
    expect(computeTopMarginPercent(40, 0)).toBe(BASE_PANE_TOP_MARGIN);
    expect(computeTopMarginPercent(40, Number.NaN)).toBe(BASE_PANE_TOP_MARGIN);
  });

  it('rounds the needed percentage up', () => {
    // 40 / 200 = 20%; 41 / 200 = 20.5% → 21%.
    expect(computeTopMarginPercent(40, 200)).toBe(20);
    expect(computeTopMarginPercent(41, 200)).toBe(21);
  });

  it('never goes below the base margin', () => {
    expect(computeTopMarginPercent(10, 1000)).toBe(BASE_PANE_TOP_MARGIN);
  });

  it('caps at MAX_PANE_TOP_MARGIN on very short panes', () => {
    expect(computeTopMarginPercent(40, 50)).toBe(MAX_PANE_TOP_MARGIN);
  });
});

describe('setReservedTopPx', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetPaneMarginsForTests();
  });

  it('applies the computed topMargin via applyOverrides', () => {
    const applyOverrides = installWidget();

    setReservedTopPx(40, makeChart(200));

    expect(applyOverrides).toHaveBeenCalledWith({
      'paneProperties.topMargin': 20,
    });
    expect(getPaneTopMarginPercent()).toBe(20);
  });

  it('does not re-apply when the percentage is unchanged', () => {
    const applyOverrides = installWidget();

    setReservedTopPx(40, makeChart(200));
    setReservedTopPx(40, makeChart(200));
    setReservedTopPx(40);

    expect(applyOverrides).toHaveBeenCalledTimes(1);
  });

  it('re-applies when the pane height changes', () => {
    const applyOverrides = installWidget();

    setReservedTopPx(40, makeChart(200));
    setReservedTopPx(40, makeChart(160));

    expect(applyOverrides).toHaveBeenLastCalledWith({
      'paneProperties.topMargin': 25,
    });
  });

  it('restores the base margin when the reservation is released', () => {
    const applyOverrides = installWidget();

    setReservedTopPx(40, makeChart(200));
    setReservedTopPx(0);

    expect(applyOverrides).toHaveBeenLastCalledWith({
      'paneProperties.topMargin': BASE_PANE_TOP_MARGIN,
    });
  });

  it('does nothing before the chart is ready', () => {
    const applyOverrides = jest.fn();
    setWidget({ applyOverrides } as unknown as TVChartingLibraryWidget);

    setReservedTopPx(40, makeChart(200));

    expect(applyOverrides).not.toHaveBeenCalled();
  });

  it('keeps the last known pane height when getPanes throws', () => {
    const applyOverrides = installWidget();
    setReservedTopPx(40, makeChart(200));
    const throwing = {
      getPanes: () => {
        throw new Error('boom');
      },
    } as unknown as TVActiveChart;

    setReservedTopPx(40, throwing);

    expect(applyOverrides).toHaveBeenCalledTimes(1);
    expect(getPaneTopMarginPercent()).toBe(20);
  });

  it('skips a redundant write after markTopMarginApplied', () => {
    const applyOverrides = installWidget();
    setReservedTopPx(40, makeChart(200));
    applyOverrides.mockClear();

    // Simulate scaleLayout having just written 20 itself.
    markTopMarginApplied(20);
    setReservedTopPx(40);

    expect(applyOverrides).not.toHaveBeenCalled();
  });
});
