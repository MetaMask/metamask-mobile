import { renderHook, act } from '@testing-library/react-native';
import { useHomepageSparklines } from './useHomepageSparklines';
import {
  CandleData,
  CandlePeriod,
  TimeDuration,
} from '@metamask/perps-controller';

const mockSubscribe = jest.fn();
const mockStream = { candles: { subscribe: mockSubscribe } };

jest.mock('../../../../../UI/Perps/providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(() => mockStream),
}));

function makeCandles(count: number, closePrices?: number[]) {
  return Array.from({ length: count }, (_, i) => ({
    time: 1700000000000 + i * 900_000,
    open: '100',
    high: '110',
    low: '90',
    close: String(closePrices?.[i] ?? 100 + i),
    volume: '50',
  }));
}

describe('useHomepageSparklines', () => {
  let unsubscribeFns: jest.Mock[];

  beforeEach(() => {
    jest.clearAllMocks();
    unsubscribeFns = [];
    mockSubscribe.mockImplementation(() => {
      const unsub = jest.fn();
      unsubscribeFns.push(unsub);
      return unsub;
    });
  });

  it('subscribes to candle stream for each symbol', () => {
    renderHook(() => useHomepageSparklines(['BTC', 'ETH']));

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
      }),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'ETH',
        interval: CandlePeriod.FifteenMinutes,
        duration: TimeDuration.OneDay,
      }),
    );
  });

  it('returns downsampled close prices when callback fires', () => {
    mockSubscribe.mockImplementation(
      (params: { callback: (candleData: CandleData) => void }) => {
        params.callback({
          symbol: 'BTC',
          interval: CandlePeriod.FifteenMinutes,
          candles: makeCandles(60),
        });
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useHomepageSparklines(['BTC']));

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.BTC.length).toBe(50);
  });

  it('ignores candle data with fewer than 2 candles', () => {
    mockSubscribe.mockImplementation(
      (params: { callback: (candleData: CandleData) => void }) => {
        params.callback({
          symbol: 'BTC',
          interval: CandlePeriod.FifteenMinutes,
          candles: makeCandles(1),
        });
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useHomepageSparklines(['BTC']));

    expect(result.current.sparklines.BTC).toBeUndefined();
  });

  it('unsubscribes from all streams on unmount', () => {
    const { unmount } = renderHook(() =>
      useHomepageSparklines(['BTC', 'ETH', 'SOL']),
    );

    unmount();

    expect(unsubscribeFns).toHaveLength(3);
    unsubscribeFns.forEach((unsub) => expect(unsub).toHaveBeenCalled());
  });

  it('does not subscribe when symbols array is empty', () => {
    renderHook(() => useHomepageSparklines([]));

    expect(mockSubscribe).not.toHaveBeenCalled();
  });

  it('accumulates sparklines from multiple symbol callbacks', () => {
    const callbacks: Record<string, (candleData: CandleData) => void> = {};
    mockSubscribe.mockImplementation(
      (params: {
        symbol: string;
        callback: (candleData: CandleData) => void;
      }) => {
        callbacks[params.symbol] = params.callback;
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useHomepageSparklines(['BTC', 'ETH']));

    act(() => {
      callbacks.BTC({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        candles: makeCandles(10),
      });
    });

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.ETH).toBeUndefined();

    act(() => {
      callbacks.ETH({
        symbol: 'ETH',
        interval: CandlePeriod.FifteenMinutes,
        candles: makeCandles(10),
      });
    });

    expect(result.current.sparklines.BTC).toBeDefined();
    expect(result.current.sparklines.ETH).toBeDefined();
  });

  it('refresh clears data and resubscribes', () => {
    const callbacks: Record<string, (candleData: CandleData) => void> = {};
    mockSubscribe.mockImplementation(
      (params: {
        symbol: string;
        callback: (candleData: CandleData) => void;
      }) => {
        callbacks[params.symbol] = params.callback;
        return jest.fn();
      },
    );

    const { result } = renderHook(() => useHomepageSparklines(['BTC']));

    act(() => {
      callbacks.BTC({
        symbol: 'BTC',
        interval: CandlePeriod.FifteenMinutes,
        candles: makeCandles(10),
      });
    });

    expect(result.current.sparklines.BTC).toBeDefined();

    act(() => {
      result.current.refresh();
    });

    expect(result.current.sparklines.BTC).toBeUndefined();
    expect(mockSubscribe).toHaveBeenCalledTimes(2);
  });

  it('resubscribes when symbols change', () => {
    const { rerender } = renderHook(
      ({ symbols }) => useHomepageSparklines(symbols),
      { initialProps: { symbols: ['BTC'] } },
    );

    expect(mockSubscribe).toHaveBeenCalledTimes(1);
    expect(unsubscribeFns).toHaveLength(1);

    rerender({ symbols: ['ETH', 'SOL'] });

    expect(unsubscribeFns[0]).toHaveBeenCalled();
    expect(mockSubscribe).toHaveBeenCalledTimes(3);
  });
});
