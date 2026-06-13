import { renderHook, act } from '@testing-library/react-hooks';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import { usePerpsStream } from '../../providers/PerpsStreamManager';
import {
  convertCandlesToOHLCVBars,
  INTERVAL_MS,
  usePerpsAdvancedChartAdapter,
} from '../usePerpsAdvancedChartAdapter';

jest.mock('../../providers/PerpsStreamManager', () => ({
  usePerpsStream: jest.fn(),
}));

jest.mock('../../../../../core/SDKConnect/utils/DevLogger', () => ({
  __esModule: true,
  default: { log: jest.fn() },
}));

type TestCandle = CandleData['candles'][number];

describe('convertCandlesToOHLCVBars', () => {
  it('converts valid string-typed candles to numeric OHLCVBars', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '500',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      time: 1000000,
      open: 100,
      high: 110,
      low: 90,
      close: 105,
      volume: 500,
    });
  });

  it('uses 0 for volume when volume field is absent', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: undefined,
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].volume).toBe(0);
  });

  it('drops bars with non-finite OHLC values', () => {
    const candles: TestCandle[] = [
      {
        time: 1000000,
        open: 'NaN',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 2000000,
        open: 'invalid',
        high: '110',
        low: '90',
        close: '105',
        volume: '100',
      },
      {
        time: 3000000,
        open: '100',
        high: '110',
        low: '90',
        close: '105',
        volume: '200',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result).toHaveLength(1);
    expect(result[0].time).toBe(3000000);
  });

  it('returns empty array for empty candles', () => {
    expect(convertCandlesToOHLCVBars([])).toEqual([]);
  });

  it('preserves millisecond timestamps without multiplication', () => {
    const candles: TestCandle[] = [
      {
        time: 1_700_000_000_000,
        open: '42000',
        high: '43000',
        low: '41000',
        close: '42500',
        volume: '1000',
      },
    ];
    const result = convertCandlesToOHLCVBars(candles);
    expect(result[0].time).toBe(1_700_000_000_000);
  });
});

describe('INTERVAL_MS', () => {
  it('has correct millisecond values for key intervals', () => {
    expect(INTERVAL_MS['1m']).toBe(60_000);
    expect(INTERVAL_MS['1h']).toBe(3_600_000);
    expect(INTERVAL_MS['4h']).toBe(14_400_000);
    expect(INTERVAL_MS['1d']).toBe(86_400_000);
    expect(INTERVAL_MS['1w']).toBe(604_800_000);
  });
});

describe('usePerpsAdvancedChartAdapter loading lifecycle', () => {
  const mockSubscribe = jest.fn();
  const mockFetchHistoricalCandles = jest.fn();

  const SYMBOL = 'BTC';
  const INTERVAL = CandlePeriod.OneHour;

  const renderAdapter = () =>
    renderHook(() =>
      usePerpsAdvancedChartAdapter({
        symbol: SYMBOL,
        interval: INTERVAL,
        visibleCandleCount: 45,
      }),
    );

  /** The params object passed into stream.candles.subscribe for the current mount. */
  const subscribeParams = () => mockSubscribe.mock.calls[0][0];

  const candle = (time: number): TestCandle => ({
    time,
    open: '100',
    high: '110',
    low: '90',
    close: '105',
    volume: '500',
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockSubscribe.mockReturnValue(jest.fn());
    mockFetchHistoricalCandles.mockResolvedValue(undefined);
    (usePerpsStream as jest.Mock).mockReturnValue({
      candles: {
        subscribe: mockSubscribe,
        fetchHistoricalCandles: mockFetchHistoricalCandles,
      },
    });
  });

  it('starts in the loading state until the first delivery', () => {
    const { result } = renderAdapter();
    expect(result.current.isLoading).toBe(true);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });

  it('clears isLoading on the first delivery even when the frame is empty (regression: no hang)', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toEqual([]);
  });

  it('clears isLoading and populates ohlcvData on the first valid delivery', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: SYMBOL,
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.ohlcvData).toHaveLength(1);
  });

  it('clears isLoading when the subscription reports an error', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().onError?.(new Error('ws failed'));
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('ignores stale deliveries (mismatched symbol) and stays loading', () => {
    const { result } = renderAdapter();

    act(() => {
      subscribeParams().callback({
        symbol: 'ETH',
        interval: INTERVAL,
        candles: [candle(1000)],
      });
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.ohlcvData).toEqual([]);
  });
});
