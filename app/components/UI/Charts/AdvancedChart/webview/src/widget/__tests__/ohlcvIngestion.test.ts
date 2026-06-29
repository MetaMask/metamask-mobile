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
  getVisibleFromMs,
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
