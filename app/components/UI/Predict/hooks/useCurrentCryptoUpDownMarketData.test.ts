import { renderHook } from '@testing-library/react-native';
import { useCurrentCryptoUpDownMarketData } from './useCurrentCryptoUpDownMarketData';
import { useCurrentPredictMarketFromSeries } from './useCurrentPredictMarketFromSeries';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import { useCryptoUpDownChartData } from './useCryptoUpDownChartData';
import { useLiveCryptoPrice } from './useLiveCryptoPrice';
import { Recurrence, type PredictMarket, type PredictSeries } from '../types';

jest.mock('./useCurrentPredictMarketFromSeries', () => ({
  useCurrentPredictMarketFromSeries: jest.fn(),
}));

jest.mock('./useCryptoTargetPrice', () => ({
  useCryptoTargetPrice: jest.fn(),
}));

jest.mock('./useCryptoUpDownChartData', () => ({
  useCryptoUpDownChartData: jest.fn(),
}));

jest.mock('./useLiveCryptoPrice', () => ({
  useLiveCryptoPrice: jest.fn(),
}));

const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;
const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;
const mockUseCryptoUpDownChartData = useCryptoUpDownChartData as jest.Mock;
const mockUseLiveCryptoPrice = useLiveCryptoPrice as jest.Mock;

const SERIES: PredictSeries = {
  id: 'btc-series',
  slug: 'btc-up-or-down-5m',
  title: 'BTC Up or Down',
  recurrence: '5m',
};

const MARKET: PredictMarket & { series: PredictSeries } = {
  id: 'market-live',
  providerId: 'polymarket',
  slug: 'btc-up-or-down-5m-live',
  title: 'BTC Up or Down - 5 Minutes',
  description: 'BTC Up or Down',
  image: '',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['crypto', 'up-or-down', 'bitcoin'],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  endDate: '2026-01-01T00:05:00.000Z',
  series: SERIES,
};

describe('useCurrentCryptoUpDownMarketData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:03:00.000Z'));
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: MARKET,
      marketId: MARKET.id,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseCryptoTargetPrice.mockReturnValue({
      data: 93000,
      isFetching: false,
    });
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [{ time: 1, value: 93025 }],
      value: 93025,
      loading: false,
      isLive: true,
      window: 300,
    });
    mockUseLiveCryptoPrice.mockReturnValue({ value: undefined });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns current BTC up/down price, price to beat, and timer data', () => {
    const { result } = renderHook(() =>
      useCurrentCryptoUpDownMarketData({ series: SERIES }),
    );

    expect(mockUseCurrentPredictMarketFromSeries).toHaveBeenCalledWith({
      series: SERIES,
      enabled: true,
    });
    expect(mockUseCryptoTargetPrice).toHaveBeenCalledWith({
      eventId: MARKET.id,
      symbol: 'BTC',
      eventStartTime: '2026-01-01T00:00:00.000Z',
      variant: 'fiveminute',
      endDate: MARKET.endDate,
      twapWindowSeconds: undefined,
      enabled: true,
    });
    expect(mockUseCryptoUpDownChartData).toHaveBeenCalledWith(MARKET, 93000, {
      enabled: true,
    });
    expect(result.current.marketId).toBe(MARKET.id);
    expect(result.current.symbol).toBe('BTC');
    expect(result.current.currentPrice).toBe(93025);
    expect(result.current.priceToBeat).toBe(93000);
    expect(result.current.countdown).toBe('2:00');
    expect(result.current.timeRemainingMs).toBe(120_000);
  });

  it('falls back to market threshold when fetched target price is unavailable', () => {
    const marketWithThreshold = {
      ...MARKET,
      outcomes: [
        {
          id: 'outcome-1',
          providerId: 'polymarket',
          marketId: MARKET.id,
          title: 'BTC Up or Down',
          description: '',
          image: '',
          status: 'open' as const,
          tokens: [],
          volume: 0,
          groupItemTitle: 'BTC',
          groupItemThreshold: 77123,
        },
      ],
    };
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: marketWithThreshold,
      marketId: MARKET.id,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseCryptoTargetPrice.mockReturnValue({
      data: undefined,
      isFetching: true,
    });

    const { result } = renderHook(() =>
      useCurrentCryptoUpDownMarketData({ series: SERIES }),
    );

    expect(mockUseCryptoUpDownChartData).toHaveBeenCalledWith(
      marketWithThreshold,
      77123,
      { enabled: true },
    );
    expect(result.current.priceToBeat).toBe(77123);
  });

  it('returns the first TWAP observation while the chart is still loading', () => {
    const twapMarket = {
      ...MARKET,
      twapWindowSeconds: 30 as const,
      priceToBeat: 93000,
    };
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: twapMarket,
      marketId: twapMarket.id,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });
    mockUseCryptoUpDownChartData.mockReturnValue({
      data: [{ time: 1, value: 93025 }],
      value: 93025,
      loading: true,
      isLive: true,
      window: 300,
      connectionError: false,
    });

    const { result } = renderHook(() =>
      useCurrentCryptoUpDownMarketData({ series: SERIES }),
    );

    expect(result.current.currentPrice).toBe(93025);
  });

  it('fetches the target price using the market TWAP window', () => {
    const twapMarket = {
      ...MARKET,
      twapWindowSeconds: 60 as const,
    };
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: twapMarket,
      marketId: twapMarket.id,
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    renderHook(() => useCurrentCryptoUpDownMarketData({ series: SERIES }));

    expect(mockUseCryptoTargetPrice).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        twapWindowSeconds: 60,
      }),
    );
  });

  it('keeps downstream price hooks disabled until the series market resolves', () => {
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: undefined,
      marketId: undefined,
      isLoading: true,
      isFetching: true,
      refetch: jest.fn(),
    });

    renderHook(() => useCurrentCryptoUpDownMarketData({ series: SERIES }));

    expect(mockUseCryptoTargetPrice).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockUseCryptoUpDownChartData).toHaveBeenCalledWith(
      expect.any(Object),
      undefined,
      { enabled: false },
    );
  });

  describe('withChartData: false', () => {
    it('sources currentPrice from useLiveCryptoPrice instead of the chart data', () => {
      mockUseLiveCryptoPrice.mockReturnValue({ value: 93042 });

      const { result } = renderHook(() =>
        useCurrentCryptoUpDownMarketData({
          series: SERIES,
          withChartData: false,
        }),
      );

      expect(mockUseLiveCryptoPrice).toHaveBeenCalledWith({
        symbol: 'BTC',
        enabled: true,
        twapWindowSeconds: undefined,
        updateIntervalMs: undefined,
      });
      expect(result.current.currentPrice).toBe(93042);
    });

    it('disables the chart data hook so it never builds a point-history array', () => {
      renderHook(() =>
        useCurrentCryptoUpDownMarketData({
          series: SERIES,
          withChartData: false,
        }),
      );

      expect(mockUseCryptoUpDownChartData).toHaveBeenCalledWith(MARKET, 93000, {
        enabled: false,
      });
    });

    it('does not factor chart loading state into isLoading', () => {
      mockUseCryptoUpDownChartData.mockReturnValue({
        data: [],
        value: 0,
        loading: true,
        isLive: true,
        window: 300,
      });

      const { result } = renderHook(() =>
        useCurrentCryptoUpDownMarketData({
          series: SERIES,
          withChartData: false,
        }),
      );

      expect(result.current.isLoading).toBe(false);
    });

    it('forwards a custom price update interval to useLiveCryptoPrice', () => {
      renderHook(() =>
        useCurrentCryptoUpDownMarketData({
          series: SERIES,
          withChartData: false,
          priceUpdateIntervalMs: 2000,
        }),
      );

      expect(mockUseLiveCryptoPrice).toHaveBeenCalledWith(
        expect.objectContaining({ updateIntervalMs: 2000 }),
      );
    });
  });
});
