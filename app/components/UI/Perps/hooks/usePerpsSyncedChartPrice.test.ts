import { renderHook, act } from '@testing-library/react-native';
import { CandlePeriod, type CandleData } from '@metamask/perps-controller';
import { usePerpsLiveCandles } from './stream/usePerpsLiveCandles';
import { usePerpsSyncedChartPrice } from './usePerpsSyncedChartPrice';

jest.mock('./stream/usePerpsLiveCandles', () => ({
  usePerpsLiveCandles: jest.fn(),
}));

const mockUsePerpsLiveCandles = usePerpsLiveCandles as jest.MockedFunction<
  typeof usePerpsLiveCandles
>;

const MOCK_CANDLE_DATA: CandleData = {
  symbol: 'BTC',
  interval: CandlePeriod.FifteenMinutes,
  candles: [
    {
      time: 1700000000000,
      open: '50000',
      high: '51000',
      low: '49000',
      close: '50500',
      volume: '100',
    },
  ],
};

const renderSyncedPrice = (
  overrides: Partial<Parameters<typeof usePerpsSyncedChartPrice>[0]> = {},
) =>
  renderHook(() =>
    usePerpsSyncedChartPrice({
      symbol: 'BTC',
      interval: CandlePeriod.FifteenMinutes,
      isAdvancedChartEnabled: true,
      ...overrides,
    }),
  );

describe('usePerpsSyncedChartPrice', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: MOCK_CANDLE_DATA,
      isLoading: false,
      isLoadingMore: false,
      hasHistoricalData: true,
      error: null,
      fetchMoreHistory: jest.fn(),
    });
  });

  it('uses the last candle close as the display price', () => {
    const { result } = renderSyncedPrice();

    expect(result.current.syncedChartCurrentPrice).toBe(50500);
  });

  it('prefers the Advanced Chart latest-bar close when it is reporting', () => {
    const { result } = renderSyncedPrice();

    act(() => {
      result.current.setAdvancedChartCurrentPrice(51000);
    });

    expect(result.current.syncedChartCurrentPrice).toBe(51000);
  });

  it('keeps the candle close when Advanced Chart is disabled', () => {
    const { result } = renderSyncedPrice({ isAdvancedChartEnabled: false });

    act(() => {
      result.current.setAdvancedChartCurrentPrice(51000);
    });

    expect(result.current.syncedChartCurrentPrice).toBe(50500);
  });

  it('returns 0 when candle history has not loaded', () => {
    mockUsePerpsLiveCandles.mockReturnValue({
      candleData: null,
      isLoading: true,
      isLoadingMore: false,
      hasHistoricalData: false,
      error: null,
      fetchMoreHistory: jest.fn(),
    });

    const { result } = renderSyncedPrice();

    expect(result.current.syncedChartCurrentPrice).toBe(0);
  });

  it('rejects candle and Advanced Chart prices from the prior symbol', () => {
    const { result, rerender } = renderHook(
      ({ symbol }: { symbol: string }) =>
        usePerpsSyncedChartPrice({
          symbol,
          interval: CandlePeriod.FifteenMinutes,
          isAdvancedChartEnabled: true,
        }),
      { initialProps: { symbol: 'BTC' } },
    );

    act(() => {
      result.current.setAdvancedChartCurrentPrice(51000);
    });
    const staleBtcSetter = result.current.setAdvancedChartCurrentPrice;
    expect(result.current.syncedChartCurrentPrice).toBe(51000);

    rerender({ symbol: 'ETH' });

    expect(result.current.syncedChartCurrentPrice).toBe(0);

    act(() => {
      staleBtcSetter(52000);
    });
    expect(result.current.syncedChartCurrentPrice).toBe(0);
  });
});
