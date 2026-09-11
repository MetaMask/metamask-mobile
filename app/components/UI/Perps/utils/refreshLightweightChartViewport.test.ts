import type { TradingViewChartRef } from '../components/TradingViewChart';
import { refreshLightweightChartViewport } from './refreshLightweightChartViewport';

describe('refreshLightweightChartViewport', () => {
  it('applies a non-default persisted zoom after resetting to the latest candle', () => {
    const resetToDefault = jest.fn();
    const zoomToLatestCandle = jest.fn();
    const chart = {
      resetToDefault,
      zoomToLatestCandle,
    } as unknown as TradingViewChartRef;

    refreshLightweightChartViewport(chart, 80);

    expect(resetToDefault).toHaveBeenCalledTimes(1);
    expect(zoomToLatestCandle).toHaveBeenCalledWith(80);
    expect(resetToDefault.mock.invocationCallOrder[0]).toBeLessThan(
      zoomToLatestCandle.mock.invocationCallOrder[0],
    );
  });

  it('does nothing when the chart is not mounted', () => {
    expect(() => refreshLightweightChartViewport(null, 80)).not.toThrow();
  });
});
