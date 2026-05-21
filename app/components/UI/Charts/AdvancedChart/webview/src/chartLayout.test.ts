/* eslint-disable @metamask/design-tokens/color-no-hex */

import { setState, resetState, type ChartState } from './state';
import {
  applySeriesColors,
  syncMainSeriesToRightScale,
  scheduleLineChartLayoutReflow,
} from './chartLayout';

const mockTheme = {
  backgroundColor: '#131416',
  borderColor: '#333',
  textColor: '#fff',
  successColor: '#0C9F76',
  errorColor: '#E06470',
  primaryColor: '#4A90D9',
};

function makeMockWidget(overrides?: Record<string, unknown>) {
  const series = {
    setChartStyleProperties: jest.fn(),
    detachToRight: jest.fn(),
  };
  const chart = {
    getSeries: () => series,
  };
  return {
    applyOverrides: jest.fn(),
    activeChart: () => chart,
    ...overrides,
    __series: series,
    __chart: chart,
  };
}

beforeEach(() => resetState());

describe('applySeriesColors', () => {
  it('applies series color overrides and style properties', () => {
    const widget = makeMockWidget();
    setState({
      chartWidget: widget,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    applySeriesColors();

    expect(widget.applyOverrides).toHaveBeenCalledTimes(1);
    const overrides = widget.applyOverrides.mock.calls[0][0];
    expect(overrides['mainSeriesProperties.lineStyle.color']).toBe('#0C9F76');
    expect(widget.__series.setChartStyleProperties).toHaveBeenCalledTimes(2);
    expect(widget.__series.setChartStyleProperties).toHaveBeenCalledWith(
      2,
      expect.objectContaining({ color: '#0C9F76' }),
    );
    expect(widget.__series.setChartStyleProperties).toHaveBeenCalledWith(
      10,
      expect.objectContaining({ topLineColor: '#0C9F76' }),
    );
  });

  it('does nothing when chartWidget is null', () => {
    setState({
      chartWidget: null,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });
    expect(() => applySeriesColors()).not.toThrow();
  });
});

describe('syncMainSeriesToRightScale', () => {
  it('calls detachToRight on the series', () => {
    const widget = makeMockWidget();
    setState({
      chartWidget: widget,
      isChartReady: true,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    syncMainSeriesToRightScale();

    expect(widget.__series.detachToRight).toHaveBeenCalled();
  });

  it('does nothing when chart is not ready', () => {
    const widget = makeMockWidget();
    setState({
      chartWidget: widget,
      isChartReady: false,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    syncMainSeriesToRightScale();
    expect(widget.__series.detachToRight).not.toHaveBeenCalled();
  });
});

describe('scheduleLineChartLayoutReflow', () => {
  it('does nothing for candle chart type', () => {
    const widget = makeMockWidget();
    setState({
      chartWidget: widget,
      currentChartType: 1,
      isChartReady: true,
      CONFIG: { theme: mockTheme, libraryUrl: '' },
    });

    expect(() => scheduleLineChartLayoutReflow()).not.toThrow();
  });
});
