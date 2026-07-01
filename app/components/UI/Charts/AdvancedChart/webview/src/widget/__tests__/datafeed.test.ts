/**
 * @jest-environment jsdom
 */
import {
  customDatafeed,
  filterBarsForRange,
  forwardRealtimeTick,
} from '../datafeed';
import {
  __resetStateForTests,
  getRealtimeCallbacks,
  setOhlcvData,
  setOhlcvPagination,
  setRnBackedPagination,
} from '../../core/state';
import { fetchOlderBarsFromPriceApi } from '../../pagination/priceApi';

jest.mock('../../pagination/priceApi', () => ({
  fetchOlderBarsFromPriceApi: jest.fn(),
  OHLCV_BASE_URL: 'https://price.api.cx.metamask.io/v3/ohlcv-chart',
}));
jest.mock('../../pagination/rnBacked', () => ({
  requestOlderBarsFromRN: jest.fn(),
}));
import type { PeriodParams, SymbolInfo, TVResolution } from '../../core/types';

const stubSymbolInfo = { name: 'X' } as unknown as SymbolInfo;

const periodParams = (overrides: Partial<PeriodParams> = {}): PeriodParams => ({
  from: 0,
  to: 1000,
  countBack: 100,
  firstDataRequest: false,
  ...overrides,
});

describe('filterBarsForRange', () => {
  beforeEach(() => {
    __resetStateForTests();
  });

  it('returns bars within [fromMs, toMs) when countBack is satisfied', () => {
    setOhlcvData([
      { time: 50_000, open: 1, high: 1, low: 1, close: 1 },
      { time: 150_000, open: 1, high: 1, low: 1, close: 1 },
      { time: 250_000, open: 1, high: 1, low: 1, close: 1 },
    ]);
    const bars = filterBarsForRange(100_000, 200_000, 1);
    expect(bars).toHaveLength(1);
    expect(bars[0].time).toBe(150_000);
  });

  it('falls back to last countBack bars before toMs when range is short', () => {
    setOhlcvData([
      { time: 10, open: 1, high: 1, low: 1, close: 1 },
      { time: 20, open: 1, high: 1, low: 1, close: 1 },
      { time: 30, open: 1, high: 1, low: 1, close: 1 },
    ]);
    const bars = filterBarsForRange(40, 50, 2);
    // No bars in [40,50); fall back to last 2 before 50 → time 20, 30.
    expect(bars.map((b) => b.time)).toEqual([20, 30]);
  });
});

describe('customDatafeed', () => {
  beforeEach(() => {
    __resetStateForTests();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('onReady reports supported resolutions and flags', () => {
    const callback = jest.fn();
    customDatafeed.onReady(callback);
    jest.runAllTimers();
    const cfg = callback.mock.calls[0][0];
    expect(cfg.supported_resolutions).toContain('1');
    expect(cfg.supported_resolutions).toContain('1D');
    expect(cfg.supports_marks).toBe(false);
  });

  it('resolveSymbol echoes the symbol name with crypto defaults', () => {
    const onResolve = jest.fn();
    customDatafeed.resolveSymbol('BTC/USD', onResolve, jest.fn());
    jest.runAllTimers();
    const info = onResolve.mock.calls[0][0];
    expect(info.name).toBe('BTC/USD');
    expect(info.type).toBe('crypto');
    expect(info.has_intraday).toBe(true);
  });

  it('getBars returns bars from filterBarsForRange when in-range', () => {
    setOhlcvData([
      { time: 100_000, open: 1, high: 1, low: 1, close: 1, volume: 0 },
    ]);
    const onResult = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ from: 90, to: 200 }),
      onResult,
      jest.fn(),
    );
    expect(onResult).toHaveBeenCalledWith(
      [expect.objectContaining({ time: 100_000 })],
      { noData: false },
    );
  });

  it('getBars returns noData on firstDataRequest with empty data', () => {
    const onResult = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ firstDataRequest: true }),
      onResult,
      jest.fn(),
    );
    expect(onResult).toHaveBeenCalledWith([], { noData: true });
  });

  it('getBars delegates to the price-API paginator when out of bars', async () => {
    setOhlcvData([{ time: 200_000, open: 1, high: 1, low: 1, close: 1 }]);
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: true,
      assetId: 'a',
      vsCurrency: 'usd',
    });
    const mocked = jest.mocked(fetchOlderBarsFromPriceApi);
    mocked.mockResolvedValue({
      olderBars: [{ time: 50, open: 1, high: 1, low: 1, close: 1 }],
      noData: false,
    });

    const onResult = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ from: 0, to: 100, firstDataRequest: false }),
      onResult,
      jest.fn(),
    );
    // allow the promise chain to flush
    await Promise.resolve();
    await Promise.resolve();
    expect(mocked).toHaveBeenCalledWith({ oldestAtDefer: 200_000 });
    expect(onResult).toHaveBeenCalledWith(
      [expect.objectContaining({ time: 50 })],
      { noData: false },
    );
  });

  it('getBars delegates to RN-backed pagination when enabled', () => {
    const { requestOlderBarsFromRN } = jest.requireMock(
      '../../pagination/rnBacked',
    ) as { requestOlderBarsFromRN: jest.Mock };
    setOhlcvData([{ time: 200_000, open: 1, high: 1, low: 1, close: 1 }]);
    setRnBackedPagination({ enabled: true });

    const onResult = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ from: 0, to: 100, firstDataRequest: false }),
      onResult,
      jest.fn(),
    );
    expect(requestOlderBarsFromRN).toHaveBeenCalledWith(
      expect.objectContaining({ resolution: '5' }),
    );
  });

  it('getBars returns noData when neither pagination source is available', () => {
    setOhlcvData([{ time: 200_000, open: 1, high: 1, low: 1, close: 1 }]);
    const onResult = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ from: 0, to: 100, firstDataRequest: false }),
      onResult,
      jest.fn(),
    );
    expect(onResult).toHaveBeenCalledWith([], { noData: true });
  });

  it('getBars calls onError when an exception is thrown', () => {
    setOhlcvData([{ time: 200_000, open: 1, high: 1, low: 1, close: 1 }]);
    jest.mocked(fetchOlderBarsFromPriceApi).mockImplementation(() => {
      throw new Error('fetch exploded');
    });
    setOhlcvPagination({
      nextCursor: 'abc',
      hasMore: true,
      assetId: 'a',
      vsCurrency: 'usd',
    });

    const onResult = jest.fn();
    const onError = jest.fn();
    customDatafeed.getBars(
      stubSymbolInfo,
      '5' as TVResolution,
      periodParams({ from: 0, to: 100, firstDataRequest: false }),
      onResult,
      onError,
    );
    expect(onError).toHaveBeenCalledWith('fetch exploded');
  });

  it('searchSymbols returns empty array', () => {
    const onResult = jest.fn();
    customDatafeed.searchSymbols('test', '', 'crypto', onResult);
    expect(onResult).toHaveBeenCalledWith([]);
  });

  it('subscribeBars / unsubscribeBars manage the realtime callback map', () => {
    const onTick = jest.fn();
    customDatafeed.subscribeBars(
      stubSymbolInfo,
      '5' as TVResolution,
      onTick,
      'guid-1',
    );
    expect(getRealtimeCallbacks()['guid-1']).toBe(onTick);
    customDatafeed.unsubscribeBars('guid-1');
    expect(getRealtimeCallbacks()['guid-1']).toBeUndefined();
  });
});

describe('forwardRealtimeTick', () => {
  beforeEach(() => __resetStateForTests());

  it('reports errors from listeners to RN without stopping others', () => {
    const bridge = { postMessage: jest.fn() };
    (
      window as unknown as { ReactNativeWebView: typeof bridge }
    ).ReactNativeWebView = bridge;
    const bad = jest.fn(() => {
      throw new Error('tick fail');
    });
    const good = jest.fn();
    customDatafeed.subscribeBars(
      stubSymbolInfo,
      '5' as TVResolution,
      bad,
      'g1',
    );
    customDatafeed.subscribeBars(
      stubSymbolInfo,
      '5' as TVResolution,
      good,
      'g2',
    );
    forwardRealtimeTick({ time: 1, open: 1, high: 1, low: 1, close: 1 });
    expect(good).toHaveBeenCalled();
    expect(bridge.postMessage).toHaveBeenCalledWith(
      expect.stringContaining('"type":"ERROR"'),
    );
  });

  it('invokes every registered listener with the tick', () => {
    const a = jest.fn();
    const b = jest.fn();
    customDatafeed.subscribeBars(stubSymbolInfo, '5' as TVResolution, a, 'g1');
    customDatafeed.subscribeBars(stubSymbolInfo, '5' as TVResolution, b, 'g2');
    forwardRealtimeTick({ time: 1, open: 1, high: 1, low: 1, close: 1 });
    expect(a).toHaveBeenCalled();
    expect(b).toHaveBeenCalled();
  });
});
