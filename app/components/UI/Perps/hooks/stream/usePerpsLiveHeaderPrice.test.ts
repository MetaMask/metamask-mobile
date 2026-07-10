import { renderHook } from '@testing-library/react-native';
import { usePerpsLiveHeaderPrice } from './usePerpsLiveHeaderPrice';
import { usePerpsLiveCandles } from './usePerpsLiveCandles';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';

jest.mock('./usePerpsLiveCandles', () => ({
  usePerpsLiveCandles: jest.fn(),
}));

const mockUsePerpsLiveCandles = usePerpsLiveCandles as jest.MockedFunction<
  typeof usePerpsLiveCandles
>;

const buildCandleData = (candles: CandleData['candles']): CandleData => ({
  symbol: 'BTC',
  interval: CandlePeriod.OneMinute,
  candles,
});

describe('usePerpsLiveHeaderPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('subscribes to 1-minute candles with no artificial throttle', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: true,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    renderHook(() => usePerpsLiveHeaderPrice('BTC'));

    expect(mockUsePerpsLiveCandles).toHaveBeenCalledWith(
      expect.objectContaining({
        symbol: 'BTC',
        interval: CandlePeriod.OneMinute,
        throttleMs: 0,
      }),
    );
  });

  it('returns undefined price before candle data has arrived', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: true,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsLiveHeaderPrice('BTC'));

    expect(result.current.price).toBeUndefined();
  });

  it('returns the latest candle close price', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: buildCandleData([
        {
          time: 1,
          open: '99000',
          high: '99500',
          low: '98900',
          close: '99100',
          volume: '10',
        },
        {
          time: 2,
          open: '99100',
          high: '99700',
          low: '99050',
          close: '99456.78',
          volume: '12',
        },
      ]),
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsLiveHeaderPrice('BTC'));

    expect(result.current.price).toBe(99456.78);
  });

  it('updates the price on subsequent candle ticks without remounting', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: buildCandleData([
        {
          time: 1,
          open: '100',
          high: '105',
          low: '95',
          close: '101',
          volume: '1',
        },
      ]),
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result, rerender } = renderHook(() =>
      usePerpsLiveHeaderPrice('BTC'),
    );
    expect(result.current.price).toBe(101);

    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: buildCandleData([
        {
          time: 1,
          open: '100',
          high: '110',
          low: '95',
          close: '108.5',
          volume: '3',
        },
      ]),
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });
    rerender({});

    expect(result.current.price).toBe(108.5);
  });

  it('returns undefined when the latest candle close is invalid (zero)', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: buildCandleData([
        {
          time: 1,
          open: '100',
          high: '100',
          low: '0',
          close: '0',
          volume: '0',
        },
      ]),
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsLiveHeaderPrice('BTC'));

    expect(result.current.price).toBeUndefined();
  });

  it('returns undefined when there are no candles', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: buildCandleData([]),
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderHook(() => usePerpsLiveHeaderPrice('BTC'));

    expect(result.current.price).toBeUndefined();
  });
});
