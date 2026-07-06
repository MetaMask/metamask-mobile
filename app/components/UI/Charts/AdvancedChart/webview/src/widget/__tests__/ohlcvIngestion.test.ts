/**
 * @jest-environment jsdom
 */
import {
  __resetOhlcvIngestionForTests,
  handleRealtimeUpdate,
  handleSetOHLCVData,
  onFirstOhlcvData,
} from '../ohlcvIngestion';
import {
  __resetStateForTests,
  getCurrentResolution,
  getOhlcvData,
  getOhlcvGeneration,
  getOhlcvPagination,
  getRnBackedPagination,
  getVisibleFromMs,
  isInHotReloadPreResetPhase,
  setChartReady,
  setWidget,
} from '../../core/state';
import type {
  OHLCVBar,
  TVActiveChart,
  TVChartingLibraryWidget,
} from '../../core/types';

const bar = (time: number, close = 1): OHLCVBar => ({
  time,
  open: 1,
  high: 1,
  low: 1,
  close,
  volume: 0,
});

const oneMinuteApart = (count: number, start = 0): OHLCVBar[] =>
  Array.from({ length: count }, (_, i) => bar(start + i * 60_000));

describe('handleSetOHLCVData', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('no-ops when payload is empty', () => {
    handleSetOHLCVData({ data: [] });
    expect(getOhlcvData()).toHaveLength(0);
    expect(getOhlcvGeneration()).toBe(0);
  });

  it('replaces ohlcvData, bumps generation, sets pagination', () => {
    const data = oneMinuteApart(3);
    handleSetOHLCVData({
      data,
      pagination: {
        nextCursor: 'c',
        hasMore: true,
        assetId: 'a',
        vsCurrency: 'usd',
      },
    });
    expect(getOhlcvData()).toBe(data);
    expect(getOhlcvGeneration()).toBe(1);
    expect(getOhlcvPagination().nextCursor).toBe('c');
  });

  it('clears pagination when payload has none', () => {
    handleSetOHLCVData({ data: oneMinuteApart(2) });
    expect(getOhlcvPagination().nextCursor).toBeNull();
  });

  it('stores visibleFromMs from the payload', () => {
    handleSetOHLCVData({
      data: oneMinuteApart(2),
      visibleFromMs: 1_700_000_000_000,
    });
    expect(getVisibleFromMs()).toBe(1_700_000_000_000);
  });

  it('detects resolution from the bar spacing', () => {
    handleSetOHLCVData({ data: oneMinuteApart(5) }); // 60s spacing → "1"
    expect(getCurrentResolution()).toBe('1');
  });

  it('fires the first-data callback exactly once when no widget exists', () => {
    const cb = jest.fn();
    onFirstOhlcvData(cb);
    handleSetOHLCVData({ data: oneMinuteApart(2) });
    handleSetOHLCVData({ data: oneMinuteApart(3) });
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('calls chart.resetData when widget is ready and resolution unchanged', () => {
    const resetData = jest.fn();
    const setResolution = jest.fn();
    const onDataLoaded = jest
      .fn()
      .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() });
    const getTimeScale = jest
      .fn()
      .mockReturnValue({ setRightOffset: jest.fn() });
    const chart = {
      resetData,
      setResolution,
      onDataLoaded,
      getTimeScale,
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(2) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(2) });

    expect(resetData).toHaveBeenCalled();
    expect(setResolution).not.toHaveBeenCalled();
  });

  it('calls setResolution when the detected resolution changes', () => {
    const resetData = jest.fn();
    let setResCb: () => void = () => undefined;
    const setResolution = jest.fn().mockImplementation((_res, cb) => {
      setResCb = cb;
    });
    const onDataLoaded = jest
      .fn()
      .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() });
    const getTimeScale = jest
      .fn()
      .mockReturnValue({ setRightOffset: jest.fn() });
    const chart = {
      resetData,
      setResolution,
      onDataLoaded,
      getTimeScale,
    } as unknown as TVActiveChart;

    // First batch primes resolution at "1" (60s spacing).
    handleSetOHLCVData({ data: oneMinuteApart(2) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    // Second batch is 5-minute spacing.
    handleSetOHLCVData({
      data: Array.from({ length: 3 }, (_, i) => bar(i * 300_000)),
    });
    expect(setResolution).toHaveBeenCalledWith('5', expect.any(Function));
    expect(resetData).not.toHaveBeenCalled();
    setResCb();
    expect(resetData).toHaveBeenCalled();
  });

  it('ignores stale setResolution callback when a newer interval arrives', () => {
    const resetData = jest.fn();
    const setResCbs: (() => void)[] = [];
    const setResolution = jest
      .fn()
      .mockImplementation((_res: string, cb: () => void) => {
        setResCbs.push(cb);
      });
    const onDataLoaded = jest
      .fn()
      .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() });
    const getTimeScale = jest
      .fn()
      .mockReturnValue({ setRightOffset: jest.fn() });
    const chart = {
      resetData,
      setResolution,
      onDataLoaded,
      getTimeScale,
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(2) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    // Switch to 5m
    handleSetOHLCVData({
      data: Array.from({ length: 3 }, (_, i) => bar(i * 300_000)),
    });
    // Switch again to 15m before first callback fires
    handleSetOHLCVData({
      data: Array.from({ length: 3 }, (_, i) => bar(i * 900_000)),
    });

    expect(setResCbs).toHaveLength(2);

    // Fire the stale 5m callback — should be ignored
    setResCbs[0]();
    expect(resetData).not.toHaveBeenCalled();

    // Fire the current 15m callback — should proceed
    setResCbs[1]();
    expect(resetData).toHaveBeenCalledTimes(1);
  });

  it('sets inHotReloadPreResetPhase during setResolution window', () => {
    let setResCb: () => void = () => undefined;
    const setResolution = jest
      .fn()
      .mockImplementation((_res: string, cb: () => void) => {
        setResCb = cb;
      });
    const chart = {
      resetData: jest.fn(),
      setResolution,
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(2) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    handleSetOHLCVData({
      data: Array.from({ length: 3 }, (_, i) => bar(i * 300_000)),
    });

    expect(isInHotReloadPreResetPhase()).toBe(true);
    setResCb();
    expect(isInHotReloadPreResetPhase()).toBe(false);
  });

  it('calls widget.resetCache before resetData on same-resolution reload', () => {
    const resetCache = jest.fn();
    const resetData = jest.fn();
    const chart = {
      resetData,
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    const widget = {
      activeChart: () => chart,
      resetCache,
    } as unknown as TVChartingLibraryWidget;
    setWidget(widget);
    setChartReady(true);

    handleSetOHLCVData({ data: oneMinuteApart(3) });

    expect(resetCache).toHaveBeenCalled();
    expect(resetData).toHaveBeenCalled();
    const resetCacheOrder = resetCache.mock.invocationCallOrder[0];
    const resetDataOrder = resetData.mock.invocationCallOrder[0];
    expect(resetCacheOrder).toBeLessThan(resetDataOrder);
  });
});

describe('handleRealtimeUpdate', () => {
  beforeEach(() => {
    __resetStateForTests();
  });

  it('appends a new bar when its time is newer than the last bar', () => {
    handleSetOHLCVData({ data: oneMinuteApart(1) });
    handleRealtimeUpdate({ bar: bar(60_000) });
    expect(getOhlcvData()).toHaveLength(2);
  });

  it('replaces the last bar when times match (in-progress tick)', () => {
    handleSetOHLCVData({ data: oneMinuteApart(1) });
    handleRealtimeUpdate({ bar: bar(0, 99) });
    expect(getOhlcvData()).toHaveLength(1);
    expect(getOhlcvData()[0].close).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// applyVisibleRange
// ---------------------------------------------------------------------------
describe('applyVisibleRange', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('calls setVisibleRange after onDataLoaded fires when visibleFromMs is set', () => {
    let subscribedCb: (() => void) | undefined;
    const unsubscribe = jest.fn();
    const onDataLoaded = jest.fn().mockReturnValue({
      subscribe: jest.fn((_scope: unknown, cb: () => void) => {
        subscribedCb = cb;
      }),
      unsubscribe,
    });
    const setVisibleRange = jest.fn();
    const setRightOffset = jest.fn();
    const getTimeScale = jest.fn().mockReturnValue({ setRightOffset });
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded,
      getTimeScale,
      setVisibleRange,
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    // Prime resolution with first batch.
    handleSetOHLCVData({ data: oneMinuteApart(3) });

    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    // Second batch with visibleFromMs triggers the onDataLoaded path.
    handleSetOHLCVData({
      data: oneMinuteApart(3),
      visibleFromMs: 1_700_000_000_000,
    });

    expect(onDataLoaded).toHaveBeenCalled();
    expect(subscribedCb).toBeDefined();
    expect(setVisibleRange).not.toHaveBeenCalled();

    // Simulate TV firing onDataLoaded.
    expect(subscribedCb).toBeDefined();
    if (subscribedCb) subscribedCb();

    expect(setVisibleRange).toHaveBeenCalledTimes(1);
    const [range, options] = setVisibleRange.mock.calls[0];
    expect(range.from).toBe(Math.floor(1_700_000_000_000 / 1000));
    expect(range.to).toBeGreaterThan(0);
    expect(options).toEqual({ percentRightMargin: 0 });
  });

  it('unsubscribes from onDataLoaded once loaded', () => {
    const unsubscribeFn = jest.fn();
    let subscribedCb: (() => void) | undefined;
    const onDataLoaded = jest.fn().mockReturnValue({
      subscribe: jest.fn((_scope: unknown, cb: () => void) => {
        subscribedCb = cb;
      }),
      unsubscribe: unsubscribeFn,
    });
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded,
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      setVisibleRange: jest.fn(),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3), visibleFromMs: 100_000 });

    expect(subscribedCb).toBeDefined();
    if (subscribedCb) subscribedCb();
    expect(unsubscribeFn).toHaveBeenCalledWith(null, subscribedCb);
  });

  it('skips setVisibleRange when generation changed between subscribe and load', () => {
    let subscribedCb: (() => void) | undefined;
    const onDataLoaded = jest.fn().mockReturnValue({
      subscribe: jest.fn((_scope: unknown, cb: () => void) => {
        subscribedCb = cb;
      }),
      unsubscribe: jest.fn(),
    });
    const setVisibleRange = jest.fn();
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded,
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      setVisibleRange,
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3), visibleFromMs: 100_000 });

    // Bump generation before the callback fires (simulates new data arriving).
    handleSetOHLCVData({ data: oneMinuteApart(4) });

    expect(subscribedCb).toBeDefined();
    if (subscribedCb) subscribedCb();
    // setVisibleRange is NOT called because generation is stale.
    // It may have been called during the second handleSetOHLCVData (without visibleFromMs),
    // but the stale callback from the first should not call it again.
    const callsFromStaleCallback = setVisibleRange.mock.calls.filter(
      (call: unknown[]) => {
        const range = call[0] as { from: number };
        return range.from === Math.floor(100_000 / 1000);
      },
    );
    expect(callsFromStaleCallback).toHaveLength(0);
  });

  it('falls back to setRightOffset(2) when visibleFromMs is null', () => {
    const setRightOffset = jest.fn();
    const getTimeScale = jest.fn().mockReturnValue({ setRightOffset });
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale,
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3) }); // no visibleFromMs

    expect(setRightOffset).toHaveBeenCalledWith(2);
  });

  it('reports error when setRightOffset throws', () => {
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: jest.fn() };

    const setRightOffset = jest.fn().mockImplementation(() => {
      throw new Error('setRightOffset boom');
    });
    const getTimeScale = jest.fn().mockReturnValue({ setRightOffset });
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale,
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    // Should not throw — the error is caught and forwarded.
    expect(() => handleSetOHLCVData({ data: oneMinuteApart(3) })).not.toThrow();

    const bridge = (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView;
    const errorCalls = bridge.postMessage.mock.calls.filter(
      (call: string[]) => {
        const parsed = JSON.parse(call[0]);
        return (
          parsed.type === 'ERROR' &&
          parsed.payload.message.includes('setRightOffset boom')
        );
      },
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('reports error when setVisibleRange throws inside onDataLoaded callback', () => {
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: jest.fn() };

    let subscribedCb: (() => void) | undefined;
    const onDataLoaded = jest.fn().mockReturnValue({
      subscribe: jest.fn((_scope: unknown, cb: () => void) => {
        subscribedCb = cb;
      }),
      unsubscribe: jest.fn(),
    });
    const setVisibleRange = jest.fn().mockImplementation(() => {
      throw new Error('setVisibleRange boom');
    });
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded,
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      setVisibleRange,
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3), visibleFromMs: 100_000 });

    expect(subscribedCb).toBeDefined();
    expect(() => {
      if (subscribedCb) subscribedCb();
    }).not.toThrow();

    const bridge = (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView;
    const errorCalls = bridge.postMessage.mock.calls.filter(
      (call: string[]) => {
        const parsed = JSON.parse(call[0]) as {
          type: string;
          payload?: { message?: string };
        };
        return (
          parsed.type === 'ERROR' &&
          parsed.payload?.message?.includes('setVisibleRange boom')
        );
      },
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// resetMainPriceScaleAutoScale
// ---------------------------------------------------------------------------
describe('resetMainPriceScaleAutoScale (via handleSetOHLCVData)', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('calls priceScale.setAutoScale(true) via the pane API', () => {
    const setAutoScale = jest.fn();
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([
        {
          getMainSourcePriceScale: jest.fn().mockReturnValue({ setAutoScale }),
        },
      ]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3) });

    expect(setAutoScale).toHaveBeenCalledWith(true);
  });

  it('is a no-op when getPanes is not a function', () => {
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      // getPanes is missing
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    expect(() => handleSetOHLCVData({ data: oneMinuteApart(3) })).not.toThrow();
  });

  it('is a no-op when the main pane has no price scale', () => {
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest
        .fn()
        .mockReturnValue([
          { getMainSourcePriceScale: jest.fn().mockReturnValue(null) },
        ]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    expect(() => handleSetOHLCVData({ data: oneMinuteApart(3) })).not.toThrow();
  });

  it('is a no-op when panes array is empty', () => {
    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    expect(() => handleSetOHLCVData({ data: oneMinuteApart(3) })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// emitLayoutSettled
// ---------------------------------------------------------------------------
describe('emitLayoutSettled (via handleSetOHLCVData)', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('posts CHART_LAYOUT_SETTLED via requestAnimationFrame', () => {
    const postMessage = jest.fn();
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage };

    const rafCallbacks: FrameRequestCallback[] = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });

    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3) });

    // First rAF queues a second one.
    expect(rafCallbacks).toHaveLength(1);
    rafCallbacks[0](0);
    expect(rafCallbacks).toHaveLength(2);

    // Second rAF posts the message.
    rafCallbacks[1](0);

    const settledCalls = postMessage.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === 'CHART_LAYOUT_SETTLED';
    });
    expect(settledCalls.length).toBeGreaterThanOrEqual(1);

    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });

  it('falls back to setTimeout when requestAnimationFrame throws', () => {
    const postMessage = jest.fn();
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage };

    jest.useFakeTimers();

    jest.spyOn(window, 'requestAnimationFrame').mockImplementation(() => {
      throw new Error('rAF not available');
    });

    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3) });

    jest.advanceTimersByTime(100);

    const settledCalls = postMessage.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === 'CHART_LAYOUT_SETTLED';
    });
    expect(settledCalls.length).toBeGreaterThanOrEqual(1);

    (window.requestAnimationFrame as jest.Mock).mockRestore();
    jest.useRealTimers();
  });

  it('does not post CHART_LAYOUT_SETTLED when widget is not ready', () => {
    const postMessage = jest.fn();
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage };

    const rafCallbacks: FrameRequestCallback[] = [];
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((cb: FrameRequestCallback) => {
        rafCallbacks.push(cb);
        return rafCallbacks.length;
      });

    const chart = {
      resetData: jest.fn(),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);
    handleSetOHLCVData({ data: oneMinuteApart(3) });

    // Clear chart readiness between rAF frames.
    rafCallbacks[0](0);
    setChartReady(false);
    rafCallbacks[1](0);

    const settledCalls = postMessage.mock.calls.filter((call: string[]) => {
      const parsed = JSON.parse(call[0]);
      return parsed.type === 'CHART_LAYOUT_SETTLED';
    });
    expect(settledCalls).toHaveLength(0);

    (window.requestAnimationFrame as jest.Mock).mockRestore();
  });
});

// ---------------------------------------------------------------------------
// rnBackedPagination
// ---------------------------------------------------------------------------
describe('rnBackedPagination', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
  });

  it('stores rnBackedPagination when provided in the payload', () => {
    expect(getRnBackedPagination().enabled).toBe(false);

    handleSetOHLCVData({
      data: oneMinuteApart(3),
      rnBackedPagination: { enabled: true },
    });

    expect(getRnBackedPagination().enabled).toBe(true);
  });

  it('leaves rnBackedPagination unchanged when not in payload', () => {
    handleSetOHLCVData({
      data: oneMinuteApart(3),
      rnBackedPagination: { enabled: true },
    });
    expect(getRnBackedPagination().enabled).toBe(true);

    handleSetOHLCVData({ data: oneMinuteApart(3) });

    // Should remain true — only overwritten when the key is present.
    expect(getRnBackedPagination().enabled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Error paths
// ---------------------------------------------------------------------------
describe('error paths', () => {
  beforeEach(() => {
    __resetStateForTests();
    __resetOhlcvIngestionForTests();
    delete (window as unknown as { ReactNativeWebView?: unknown })
      .ReactNativeWebView;
  });

  it('reports error and does not throw when chart.resetData() throws', () => {
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: jest.fn() };

    const chart = {
      resetData: jest.fn().mockImplementation(() => {
        throw new Error('resetData kaboom');
      }),
      setResolution: jest.fn(),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    handleSetOHLCVData({ data: oneMinuteApart(3) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    expect(() => handleSetOHLCVData({ data: oneMinuteApart(3) })).not.toThrow();

    const bridge = (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView;
    const errorCalls = bridge.postMessage.mock.calls.filter(
      (call: string[]) => {
        const parsed = JSON.parse(call[0]);
        return (
          parsed.type === 'ERROR' &&
          parsed.payload.message.includes('resetData kaboom')
        );
      },
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
  });

  it('resets firstDataDelivered when firstDataCallback throws', () => {
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: jest.fn() };

    const failingCb = jest.fn().mockImplementation(() => {
      throw new Error('firstDataCallback boom');
    });
    onFirstOhlcvData(failingCb);

    // First call — callback throws, firstDataDelivered is reset.
    expect(() => handleSetOHLCVData({ data: oneMinuteApart(2) })).not.toThrow();
    expect(failingCb).toHaveBeenCalledTimes(1);

    const bridge = (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView;
    const errorCalls = bridge.postMessage.mock.calls.filter(
      (call: string[]) => {
        const parsed = JSON.parse(call[0]);
        return (
          parsed.type === 'ERROR' &&
          parsed.payload.message.includes('firstDataCallback boom')
        );
      },
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);

    // Because firstDataDelivered was reset, the callback fires again on next data.
    failingCb.mockImplementation(() => {
      // succeed this time
    });
    handleSetOHLCVData({ data: oneMinuteApart(2) });
    expect(failingCb).toHaveBeenCalledTimes(2);
  });

  it('reports error when resetData throws inside setResolution callback', () => {
    (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView = { postMessage: jest.fn() };

    let setResCb: () => void = () => undefined;
    const chart = {
      resetData: jest.fn().mockImplementation(() => {
        throw new Error('resetData inside setResolution');
      }),
      setResolution: jest
        .fn()
        .mockImplementation((_res: string, cb: () => void) => {
          setResCb = cb;
        }),
      onDataLoaded: jest
        .fn()
        .mockReturnValue({ subscribe: jest.fn(), unsubscribe: jest.fn() }),
      getTimeScale: jest.fn().mockReturnValue({ setRightOffset: jest.fn() }),
      getPanes: jest.fn().mockReturnValue([]),
    } as unknown as TVActiveChart;

    // First batch primes resolution at "1" (60s spacing).
    handleSetOHLCVData({ data: oneMinuteApart(2) });
    setWidget({
      activeChart: () => chart,
    } as unknown as TVChartingLibraryWidget);
    setChartReady(true);

    // Second batch is 5-minute spacing — triggers setResolution branch.
    handleSetOHLCVData({
      data: Array.from({ length: 3 }, (_, i) => bar(i * 300_000)),
    });

    // Fire the setResolution callback — resetData throws inside.
    expect(() => setResCb()).not.toThrow();

    const bridge = (
      window as unknown as { ReactNativeWebView: { postMessage: jest.Mock } }
    ).ReactNativeWebView;
    const errorCalls = bridge.postMessage.mock.calls.filter(
      (call: string[]) => {
        const parsed = JSON.parse(call[0]);
        return (
          parsed.type === 'ERROR' &&
          parsed.payload.message.includes('resetData inside setResolution')
        );
      },
    );
    expect(errorCalls.length).toBeGreaterThanOrEqual(1);
  });
});
