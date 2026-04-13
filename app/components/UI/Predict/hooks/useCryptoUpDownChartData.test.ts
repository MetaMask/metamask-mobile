import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCryptoUpDownChartData } from './useCryptoUpDownChartData';
import type { CryptoPriceUpdate, PredictMarket, PredictSeries } from '../types';
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';

const mockCryptoPriceHistoryOptions = jest.fn();
const mockUseLiveCryptoPrices = jest.fn();
const mockGetCryptoSymbol = jest.fn();
const mockGetVariant = jest.fn();
const mockGetEventStartTime = jest.fn();

jest.mock('../queries', () => ({
  predictQueries: {
    cryptoPriceHistory: {
      options: (...args: unknown[]) => mockCryptoPriceHistoryOptions(...args),
    },
  },
}));

jest.mock('./useLiveCryptoPrices', () => ({
  useLiveCryptoPrices: (...args: unknown[]) => mockUseLiveCryptoPrices(...args),
}));

jest.mock('../utils/cryptoUpDown', () => ({
  getCryptoSymbol: (...args: unknown[]) => mockGetCryptoSymbol(...args),
  getVariant: (...args: unknown[]) => mockGetVariant(...args),
  getEventStartTime: (...args: unknown[]) => mockGetEventStartTime(...args),
  RECURRENCE_TO_DURATION_SECS: {
    '5m': 300,
    '15m': 900,
    '1h': 3600,
  },
}));

type TestMarket = PredictMarket & { series: PredictSeries };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        gcTime: 0,
        retry: false,
      },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return { Wrapper, queryClient };
};

const createMarket = (overrides: Partial<TestMarket> = {}): TestMarket => ({
  id: 'market-1',
  providerId: 'provider-1',
  slug: 'btc-up-or-down-5m',
  title: 'BTC up or down',
  description: 'Prediction market',
  endDate: '2026-01-01T00:00:30.000Z',
  image: 'https://example.com/image.png',
  status: 'open',
  recurrence: 'none' as PredictMarket['recurrence'],
  category: 'crypto',
  tags: ['crypto', 'bitcoin', 'up-or-down'],
  outcomes: [],
  liquidity: 1000,
  volume: 2000,
  series: {
    id: 'series-1',
    slug: 'btc-series',
    title: 'BTC Series',
    recurrence: '5m',
  },
  ...overrides,
});

describe('useCryptoUpDownChartData', () => {
  let liveUpdateHandler: ((update: CryptoPriceUpdate) => void) | undefined;
  let historicalData: LivelinePoint[];

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    liveUpdateHandler = undefined;
    historicalData = [
      { time: 100, value: 50000 },
      { time: 200, value: 51000 },
    ];

    mockGetCryptoSymbol.mockReturnValue('BTC');
    mockGetVariant.mockReturnValue('fiveminute');
    mockGetEventStartTime.mockReturnValue('2025-12-31T23:55:30.000Z');

    mockUseLiveCryptoPrices.mockImplementation(
      (symbol: string, onUpdate: (update: CryptoPriceUpdate) => void) => {
        liveUpdateHandler = onUpdate;

        return { isConnected: symbol.length > 0 };
      },
    );

    mockCryptoPriceHistoryOptions.mockImplementation(
      ({
        symbol,
        eventStartTime,
        variant,
        endDate,
      }: {
        symbol: string;
        eventStartTime: string;
        variant: string;
        endDate?: string;
      }) => ({
        queryKey: [
          'predict',
          'cryptoPriceHistory',
          symbol,
          eventStartTime,
          variant,
          endDate ?? '',
        ],
        queryFn: async () => historicalData,
      }),
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('live path', () => {
    it('returns loading true when no live data has arrived', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.value).toBe(0);
      expect(result.current.loading).toBe(true);
    });

    it('accumulates live data points from websocket updates', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51000,
          timestamp: 100000,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51500,
          timestamp: 110000,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 51000 },
        { time: 110, value: 51500 },
      ]);
      expect(result.current.value).toBe(51500);
      expect(result.current.loading).toBe(false);
    });

    it('trims live data to the 60 second buffer', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 50000,
          timestamp: 100000,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 50500,
          timestamp: 130000,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51000,
          timestamp: 161000,
        });
      });

      expect(result.current.data).toEqual([
        { time: 130, value: 50500 },
        { time: 161, value: 51000 },
      ]);
    });

    it('freezes live data once the end date passes', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2026-01-01T00:00:05.000Z' });
      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 50000,
          timestamp: 100000,
        });
      });

      act(() => {
        jest.setSystemTime(new Date('2026-01-01T00:00:06.000Z'));
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 52000,
          timestamp: 110000,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 53000,
          timestamp: 120000,
        });
      });

      expect(result.current.data).toEqual([{ time: 100, value: 50000 }]);
      expect(result.current.value).toBe(50000);
    });

    it('returns live flags and the live window for future markets', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.isLive).toBe(true);
      expect(result.current.window).toBe(30);
    });

    it('passes the lowercase websocket symbol to useLiveCryptoPrices', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(mockUseLiveCryptoPrices).toHaveBeenCalledWith(
        'btcusdt',
        expect.any(Function),
      );
    });
  });

  describe('historical path', () => {
    it('fetches historical data through react query when endDate is in the past', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2025-12-31T23:59:00.000Z' });

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockCryptoPriceHistoryOptions).toHaveBeenCalledWith({
        symbol: 'BTC',
        eventStartTime: '2025-12-31T23:55:30.000Z',
        variant: 'fiveminute',
        endDate: '2025-12-31T23:59:00.000Z',
      });
      expect(result.current.data).toEqual(historicalData);
    });

    it('returns loading true while the historical query is fetching', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2025-12-31T23:59:00.000Z' });
      let resolveQuery: ((value: LivelinePoint[]) => void) | undefined;

      mockCryptoPriceHistoryOptions.mockImplementationOnce(
        ({
          symbol,
          eventStartTime,
          variant,
          endDate,
        }: {
          symbol: string;
          eventStartTime: string;
          variant: string;
          endDate?: string;
        }) => ({
          queryKey: [
            'predict',
            'cryptoPriceHistory',
            symbol,
            eventStartTime,
            variant,
            endDate ?? '',
            'pending',
          ],
          queryFn: () =>
            new Promise<LivelinePoint[]>((resolve) => {
              resolveQuery = resolve;
            }),
        }),
      );

      const { result, unmount } = renderHook(
        () => useCryptoUpDownChartData(market),
        {
          wrapper: Wrapper,
        },
      );

      expect(result.current.loading).toBe(true);
      expect(result.current.isLive).toBe(false);

      unmount();
      resolveQuery?.([]);
    });

    it('returns historical data and the last point value', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2025-12-31T23:59:00.000Z' });

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.data).toEqual(historicalData);
      expect(result.current.value).toBe(51000);
    });

    it('returns historical flags and recurrence window for completed events', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        endDate: '2025-12-31T23:59:00.000Z',
        series: {
          id: 'series-1',
          slug: 'btc-series',
          title: 'BTC Series',
          recurrence: '15m',
        },
      });

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.isLive).toBe(false);
      expect(result.current.window).toBe(900);
    });

    it('disables the historical query when symbol is missing', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2025-12-31T23:59:00.000Z' });
      mockGetCryptoSymbol.mockReturnValue(undefined);

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.value).toBe(0);
    });

    it('disables the historical query when event start time is missing', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2025-12-31T23:59:00.000Z' });
      mockGetEventStartTime.mockReturnValue(undefined);

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.loading).toBe(false);
      expect(result.current.value).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('returns empty non-live state when the market has no endDate', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: undefined });
      mockGetEventStartTime.mockReturnValue(undefined);

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(mockUseLiveCryptoPrices).toHaveBeenCalledWith(
        '',
        expect.any(Function),
      );
      expect(result.current).toEqual({
        data: [],
        value: 0,
        loading: false,
        isLive: false,
        window: 300,
      });
    });

    it('uses an empty websocket symbol when no matching symbol is available', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      mockGetCryptoSymbol.mockReturnValue(undefined);

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(mockUseLiveCryptoPrices).toHaveBeenCalledWith(
        '',
        expect.any(Function),
      );
      expect(result.current.isLive).toBe(true);
      expect(result.current.loading).toBe(true);
    });
  });
});
