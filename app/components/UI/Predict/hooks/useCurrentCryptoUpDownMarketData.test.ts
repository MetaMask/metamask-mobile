import { renderHook } from '@testing-library/react-native';
import { useCurrentCryptoUpDownMarketData } from './useCurrentCryptoUpDownMarketData';
import { useCurrentPredictMarketFromSeries } from './useCurrentPredictMarketFromSeries';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import { useCryptoUpDownChartData } from './useCryptoUpDownChartData';
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

const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;
const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;
const mockUseCryptoUpDownChartData = useCryptoUpDownChartData as jest.Mock;

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
});
