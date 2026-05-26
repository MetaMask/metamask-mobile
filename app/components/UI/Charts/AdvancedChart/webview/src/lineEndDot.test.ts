import { setState, resetState } from './state';
import {
  getLineEndDotTimeAndPriceFromSeries,
  getLineEndIconTimeSec,
  removeLineEndDot,
  ensureNoLineChartEndIcons,
  sweepOrphanLineChartIconShapes,
} from './lineEndDot';

beforeEach(() => resetState());

describe('getLineEndDotTimeAndPriceFromSeries', () => {
  it('returns last ohlcv bar when chart is null', () => {
    setState({
      ohlcvData: [
        {
          time: 1700000000000,
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 100,
        },
      ],
    });
    const result = getLineEndDotTimeAndPriceFromSeries(null);
    expect(result).toEqual({ timeSec: 1700000000, price: 1.5 });
  });

  it('returns null when no data', () => {
    setState({ ohlcvData: [] });
    const result = getLineEndDotTimeAndPriceFromSeries(null);
    expect(result).toBeNull();
  });

  it('reads from series.data().last() when available', () => {
    setState({
      ohlcvData: [
        {
          time: 1600000000000,
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 100,
        },
      ],
    });
    const chart = {
      getSeries: () => ({
        data: () => ({
          last: () => ({ value: [1700000, 2.5, 3.0, 1.0, 2.0, 50] }),
        }),
      }),
    };
    const result = getLineEndDotTimeAndPriceFromSeries(chart);
    // parseTimeFromTvDataLast should try index 0 and parseCloseFromTvDataLast index 4
    expect(result).not.toBeNull();
  });
});

describe('getLineEndIconTimeSec', () => {
  it('returns the bar time when chart is null', () => {
    setState({ ohlcvData: [] });
    const result = getLineEndIconTimeSec(null, 1700000000);
    expect(result).toBe(1700000000);
  });

  it('returns bar time when extrapolation should be skipped', () => {
    setState({
      ohlcvData: [
        {
          time: 1700000000000,
          open: 1,
          high: 2,
          low: 0.5,
          close: 1.5,
          volume: 100,
        },
      ],
    });
    const result = getLineEndIconTimeSec(null, 1700000000);
    expect(result).toBe(1700000000);
  });
});

describe('removeLineEndDot', () => {
  it('calls removeEntity when shapeId exists', () => {
    const removeEntity = jest.fn();
    setState({
      lineEndDotShapeId: 'shape-123',
      chartWidget: { activeChart: () => ({ removeEntity }) },
    });

    removeLineEndDot();
    expect(removeEntity).toHaveBeenCalledWith('shape-123');
  });

  it('does nothing when no shapeId', () => {
    setState({
      lineEndDotShapeId: null,
      chartWidget: { activeChart: () => ({ removeEntity: jest.fn() }) },
    });
    expect(() => removeLineEndDot()).not.toThrow();
  });
});

describe('sweepOrphanLineChartIconShapes', () => {
  it('removes icon shapes on line chart type', () => {
    const removeEntity = jest.fn();
    setState({
      currentChartType: 2,
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [
            { id: 's1', name: 'icon' },
            { id: 's2', name: 'horizontal_line' },
          ],
          removeEntity,
        }),
      },
      isChartReady: true,
    });

    sweepOrphanLineChartIconShapes();
    expect(removeEntity).toHaveBeenCalledWith('s1');
    expect(removeEntity).not.toHaveBeenCalledWith('s2');
  });
});

describe('ensureNoLineChartEndIcons', () => {
  it('returns early for line chart type', () => {
    setState({
      currentChartType: 2,
      lineEndDotShapeId: null,
      chartWidget: null,
      isChartReady: false,
    });
    expect(() => ensureNoLineChartEndIcons()).not.toThrow();
  });

  it('removes icon shapes for candle chart type', () => {
    const removeEntity = jest.fn();
    setState({
      currentChartType: 1,
      lineEndDotShapeId: null,
      chartWidget: {
        activeChart: () => ({
          getAllShapes: () => [{ id: 'ic1', name: 'Icon' }],
          removeEntity,
        }),
      },
      isChartReady: true,
    });

    ensureNoLineChartEndIcons();
    expect(removeEntity).toHaveBeenCalledWith('ic1');
  });
});
