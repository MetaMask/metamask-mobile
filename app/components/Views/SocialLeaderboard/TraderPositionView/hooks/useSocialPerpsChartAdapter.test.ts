import { renderHook, act } from '@testing-library/react-hooks';
import { CandlePeriod, TimeDuration } from '@metamask/perps-controller';
import type {
  FetchOlderBarsRequest,
  OHLCVBar,
} from '../../../../UI/Charts/AdvancedChart/AdvancedChart.types';
import {
  INTERVAL_MS,
  usePerpsAdvancedChartAdapter,
} from '../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter';
import { useSocialPerpsChartAdapter } from './useSocialPerpsChartAdapter';

jest.mock('../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter', () => ({
  ...jest.requireActual(
    '../../../../UI/Perps/hooks/usePerpsAdvancedChartAdapter',
  ),
  usePerpsAdvancedChartAdapter: jest.fn(),
}));

const mockUsePerpsAdvancedChartAdapter =
  usePerpsAdvancedChartAdapter as jest.MockedFunction<
    typeof usePerpsAdvancedChartAdapter
  >;

const SYMBOL = 'BTC';
const INTERVAL = CandlePeriod.OneHour;
const VISIBLE = 45;

const bar = (time: number): OHLCVBar => ({
  time,
  open: 100,
  high: 110,
  low: 90,
  close: 105,
  volume: 500,
});

const olderRequest = (
  overrides: Partial<FetchOlderBarsRequest> = {},
): FetchOlderBarsRequest => ({
  requestId: 'req-1',
  seriesGeneration: 1,
  symbol: SYMBOL,
  resolution: '60',
  fromSec: 1,
  toSec: 2,
  oldestLoadedTimeMs: 3000,
  ...overrides,
});

const mockBaseHandleFetchOlderBars = jest.fn();

const setBaseAdapter = (
  ohlcvData: OHLCVBar[],
  seriesKey: string,
  overrides: Partial<ReturnType<typeof usePerpsAdvancedChartAdapter>> = {},
) => {
  mockUsePerpsAdvancedChartAdapter.mockReturnValue({
    ohlcvData,
    realtimeBar: undefined,
    latestBar: ohlcvData[ohlcvData.length - 1],
    ohlcvSeriesKey: seriesKey,
    visibleFromMs: undefined,
    visibleToMs: ohlcvData[ohlcvData.length - 1]?.time,
    isLoading: false,
    handleFetchOlderBarsRequest: mockBaseHandleFetchOlderBars,
    ...overrides,
  });
};

const render = (interval: CandlePeriod = INTERVAL) =>
  renderHook(
    ({ interval: i }) =>
      useSocialPerpsChartAdapter({
        symbol: SYMBOL,
        interval: i,
        visibleCandleCount: VISIBLE,
        paginationDuration: TimeDuration.YearToDate,
      }),
    { initialProps: { interval } },
  );

describe('useSocialPerpsChartAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBaseHandleFetchOlderBars.mockResolvedValue({
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [],
      noData: true,
    });
  });

  it('passes base ohlcvData through when no older bars have been fetched', () => {
    const bars = [bar(1000), bar(2000)];
    setBaseAdapter(bars, `${SYMBOL}|${INTERVAL}`);
    const { result } = render();

    expect(result.current.ohlcvData).toEqual(bars);
  });

  it('merges older bars returned from handleFetchOlderBarsRequest into ohlcvData', async () => {
    const baseBars = [bar(3000), bar(4000)];
    setBaseAdapter(baseBars, `${SYMBOL}|${INTERVAL}`);
    const { result } = render();

    mockBaseHandleFetchOlderBars.mockResolvedValueOnce({
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [bar(1000), bar(2000)],
      noData: false,
    });

    await act(async () => {
      await result.current.handleFetchOlderBarsRequest(
        olderRequest({ oldestLoadedTimeMs: 3000 }),
      );
    });

    expect(result.current.ohlcvData.map((b) => b.time)).toEqual([
      1000, 2000, 3000, 4000,
    ]);
  });

  it('resets accumulated history on symbol or interval change', async () => {
    const baseBars = [bar(3000), bar(4000)];
    setBaseAdapter(baseBars, `${SYMBOL}|${INTERVAL}`);
    const { result, rerender } = render(INTERVAL);

    mockBaseHandleFetchOlderBars.mockResolvedValueOnce({
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [bar(1000), bar(2000)],
      noData: false,
    });

    await act(async () => {
      await result.current.handleFetchOlderBarsRequest(
        olderRequest({ oldestLoadedTimeMs: 3000 }),
      );
    });

    expect(result.current.ohlcvData).toHaveLength(4);

    setBaseAdapter(baseBars, `${SYMBOL}|${CandlePeriod.FourHours}`);
    rerender({ interval: CandlePeriod.FourHours });

    expect(result.current.ohlcvData).toEqual(baseBars);
  });

  it('keeps handleFetchOlderBarsRequest identity stable across unrelated re-renders', async () => {
    // Regression: base adapter returns a new object each render, so any consumer
    // effect that lists this callback in its deps (e.g. TraderAdvancedChart's
    // trade-focus effect) must not re-run on every realtime tick.
    setBaseAdapter([bar(1000)], `${SYMBOL}|${INTERVAL}`);
    const { result, rerender } = render();

    const firstCallback = result.current.handleFetchOlderBarsRequest;

    // Simulate an unrelated re-render (e.g. realtimeBar tick from the base
    // adapter). The base object identity changes but the wrapper's callback
    // must not.
    setBaseAdapter([bar(1000), bar(1500)], `${SYMBOL}|${INTERVAL}`, {
      realtimeBar: bar(1500),
    });
    rerender({ interval: INTERVAL });

    expect(result.current.handleFetchOlderBarsRequest).toBe(firstCallback);

    // And it must still delegate to the *current* base callback, not a stale
    // reference captured at first render.
    const laterBaseCallback = jest.fn().mockResolvedValue({
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [],
      noData: true,
    });
    setBaseAdapter([bar(1000), bar(1500)], `${SYMBOL}|${INTERVAL}`, {
      handleFetchOlderBarsRequest: laterBaseCallback,
    });
    rerender({ interval: INTERVAL });

    await act(async () => {
      await result.current.handleFetchOlderBarsRequest(olderRequest());
    });

    expect(laterBaseCallback).toHaveBeenCalledTimes(1);
    expect(mockBaseHandleFetchOlderBars).not.toHaveBeenCalled();
  });

  it('drops accumulated history when the base adapter wipes its series', async () => {
    const baseBars = [bar(3000), bar(4000)];
    setBaseAdapter(baseBars, `${SYMBOL}|${INTERVAL}`);
    const { result, rerender } = render();

    mockBaseHandleFetchOlderBars.mockResolvedValueOnce({
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [bar(1000), bar(2000)],
      noData: false,
    });

    await act(async () => {
      await result.current.handleFetchOlderBarsRequest(
        olderRequest({ oldestLoadedTimeMs: 3000 }),
      );
    });

    expect(result.current.ohlcvData).toHaveLength(4);

    setBaseAdapter([], `${SYMBOL}|${INTERVAL}|1`);
    rerender({ interval: INTERVAL });

    expect(result.current.ohlcvData).toEqual([]);
  });

  it('keeps ohlcvSeriesKey stable during interval refresh until new bars arrive', () => {
    const bars = [bar(1000), bar(2000)];
    setBaseAdapter(bars, `${SYMBOL}|${INTERVAL}`);
    const { result, rerender } = render(INTERVAL);

    expect(result.current.ohlcvSeriesKey).toBe(`${SYMBOL}|${INTERVAL}`);

    setBaseAdapter(bars, `${SYMBOL}|${CandlePeriod.FourHours}`);
    rerender({ interval: CandlePeriod.FourHours });

    expect(result.current.ohlcvSeriesKey).toBe(`${SYMBOL}|${INTERVAL}`);

    const nextBars = [bar(4000), bar(8000)];
    setBaseAdapter(nextBars, `${SYMBOL}|${CandlePeriod.FourHours}`);
    rerender({ interval: CandlePeriod.FourHours });

    expect(result.current.ohlcvSeriesKey).toBe(
      `${SYMBOL}|${CandlePeriod.FourHours}`,
    );
  });

  it('preserves base cache-generation suffix in ohlcvSeriesKey', () => {
    const bars = [bar(1000), bar(2000)];
    setBaseAdapter(bars, `${SYMBOL}|${INTERVAL}|3`);
    const { result } = render();

    expect(result.current.ohlcvSeriesKey).toBe(`${SYMBOL}|${INTERVAL}|3`);
  });

  it('computes viewport from the applied interval, not the requested one', () => {
    const bars = [bar(1000), bar(2000)];
    setBaseAdapter(bars, `${SYMBOL}|${INTERVAL}`);
    const { result, rerender } = render(INTERVAL);

    const oneHourMs = INTERVAL_MS[INTERVAL];
    expect(oneHourMs).toBeDefined();
    expect(result.current.visibleToMs).toBe(2000);
    expect(result.current.visibleFromMs).toBe(
      2000 - (oneHourMs ?? 0) * VISIBLE,
    );

    setBaseAdapter(bars, `${SYMBOL}|${CandlePeriod.FourHours}`);
    rerender({ interval: CandlePeriod.FourHours });

    expect(result.current.visibleFromMs).toBe(
      2000 - (oneHourMs ?? 0) * VISIBLE,
    );
  });

  it('supports the 1M (one month) interval in viewport math', () => {
    const bars = [bar(1000), bar(2000)];
    setBaseAdapter(bars, `${SYMBOL}|1M`);
    const { result } = render(CandlePeriod.OneMonth);

    const monthMs = INTERVAL_MS['1M'];
    expect(monthMs).toBeDefined();
    expect(result.current.visibleFromMs).toBe(2000 - (monthMs ?? 0) * VISIBLE);
  });

  it('returns the base response from handleFetchOlderBarsRequest verbatim', async () => {
    setBaseAdapter([bar(3000)], `${SYMBOL}|${INTERVAL}`);
    const baseResponse = {
      requestId: 'req-1',
      seriesGeneration: 1,
      bars: [bar(2000)],
      noData: false,
    };
    mockBaseHandleFetchOlderBars.mockResolvedValueOnce(baseResponse);
    const { result } = render();

    let response;
    await act(async () => {
      response =
        await result.current.handleFetchOlderBarsRequest(olderRequest());
    });

    expect(response).toEqual(baseResponse);
  });

  it('propagates base isLoading, realtimeBar, and latestBar', () => {
    const rt = { ...bar(2000), close: 999 };
    setBaseAdapter([bar(1000), bar(2000)], `${SYMBOL}|${INTERVAL}`, {
      isLoading: true,
      realtimeBar: rt,
      latestBar: rt,
    });
    const { result } = render();

    expect(result.current.isLoading).toBe(true);
    expect(result.current.realtimeBar).toBe(rt);
    expect(result.current.latestBar).toBe(rt);
  });
});
