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
    '4h': 14400,
  },
  toTimestampSeconds: (timestamp: number) =>
    timestamp > 9999999999 ? timestamp / 1000 : timestamp,
}));

type TestMarket = PredictMarket & { series: PredictSeries };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        cacheTime: 0,
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

    it('adds live data points to the returned chart data', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 110,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 51000 },
        { time: 110, value: 51500 },
      ]);
      expect(result.current.value).toBe(51500);
      expect(result.current.loading).toBe(false);
    });

    it('keeps loading true until the live chart has enough points to render', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.data).toEqual([{ time: 100, value: 51000 }]);
      expect(result.current.value).toBe(51000);
      expect(result.current.loading).toBe(true);

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 110,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 51000 },
        { time: 110, value: 51500 },
      ]);
      expect(result.current.value).toBe(51500);
      expect(result.current.loading).toBe(false);
    });

    it('preserves second-based live timestamps', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 1700000000,
        });
      });

      expect(result.current.data).toEqual([{ time: 1700000000, value: 51000 }]);
    });

    it('converts millisecond-based live timestamps to fractional seconds', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 1700000000123,
        });
      });

      expect(result.current.data).toEqual([
        { time: 1700000000.123, value: 51000 },
      ]);
    });

    it('advances live point times when the feed repeats a current timestamp', () => {
      jest.setSystemTime(new Date(1700000000000));
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51000,
          timestamp: 1700000000,
        });
      });
      act(() => {
        jest.setSystemTime(new Date(1700000001000));
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51500,
          timestamp: 1700000000,
        });
      });

      expect(result.current.data).toEqual([
        { time: 1700000000, value: 51000 },
        { time: 1700000001, value: 51500 },
      ]);
    });

    it('parses millisecond timestamps from live updates', () => {
      jest.setSystemTime(new Date(1700000000000));
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51000,
          timestamp: 1700000000123,
        });
      });

      expect(result.current.data).toEqual([
        { time: 1700000000.123, value: 51000 },
      ]);
    });

    it('evicts live points outside the 30-second chart retention buffer', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51000,
          timestamp: 100,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 51500,
          timestamp: 130,
        });
        liveUpdateHandler?.({
          symbol: 'btcusdt',
          price: 52000,
          timestamp: 161,
        });
      });

      expect(result.current.data).toEqual([
        { time: 130, value: 51500 },
        { time: 161, value: 52000 },
      ]);
    });

    it('uses the latest market end date for a retained live callback', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        endDate: '2026-01-01T00:00:30.000Z',
      });
      const expiredMarket = createMarket({
        id: 'market-2',
        endDate: '2025-12-31T23:59:59.000Z',
      });
      historicalData = [];

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket),
        {
          initialProps: { activeMarket: market },
          wrapper: Wrapper,
        },
      );
      const retainedLiveUpdateHandler = liveUpdateHandler;

      rerender({ activeMarket: expiredMarket });

      act(() => {
        retainedLiveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.data).toEqual([]);
    });

    it('stops live refetching when a live update arrives after market end', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        endDate: '2026-01-01T00:00:30.000Z',
      });
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        jest.setSystemTime(new Date('2026-01-01T00:00:31.000Z'));
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.isLive).toBe(false);
      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
    });

    it('preserves live points and value across market id changes for continuity', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const nextMarket = createMarket({
        id: 'market-2',
        slug: 'eth-up-or-down-5m',
      });
      historicalData = [];

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket),
        {
          initialProps: { activeMarket: market },
          wrapper: Wrapper,
        },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.data).toEqual([{ time: 100, value: 51000 }]);

      rerender({ activeMarket: nextMarket });

      expect(result.current.data).toEqual([{ time: 100, value: 51000 }]);
      expect(result.current.value).toBe(51000);
    });

    it('accepts live updates after changing away from a reset market', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        endDate: '2026-01-01T00:00:30.000Z',
      });
      const nextMarket = createMarket({
        id: 'market-2',
        endDate: '2026-01-01T00:00:30.000Z',
      });
      historicalData = [];

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket),
        {
          initialProps: { activeMarket: market },
          wrapper: Wrapper,
        },
      );
      const retainedLiveUpdateHandler = liveUpdateHandler;

      rerender({ activeMarket: nextMarket });

      act(() => {
        retainedLiveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.data).toEqual([{ time: 100, value: 51000 }]);
      expect(result.current.value).toBe(51000);
    });

    it('seeds live mode with historical data before live updates arrive', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(historicalData);
        expect(result.current.value).toBe(51000);
      });
    });

    it('returns historical recurrence-window data without subscribing when live updates are disabled', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        series: {
          id: 'series-4h',
          slug: 'btc-series-4h',
          title: 'BTC Series 4h',
          recurrence: '4h',
        },
      });

      const { result } = renderHook(
        () =>
          useCryptoUpDownChartData(market, undefined, {
            liveUpdatesEnabled: false,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(historicalData);
      });
      expect(result.current.isLive).toBe(false);
      expect(result.current.window).toBe(14400);
      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
    });

    it('can fetch a historical coin lookback window independent of the live market start', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        id: 'new-market',
        endDate: '2026-01-01T00:05:00.000Z',
      });

      renderHook(
        () =>
          useCryptoUpDownChartData(market, undefined, {
            liveUpdatesEnabled: false,
            historicalWindow: {
              startDate: '2025-12-31T23:55:00.000Z',
              endDate: '2026-01-01T00:00:00.000Z',
            },
          }),
        { wrapper: Wrapper },
      );

      expect(mockCryptoPriceHistoryOptions).toHaveBeenCalledWith({
        symbol: 'BTC',
        eventStartTime: '2025-12-31T23:55:00.000Z',
        variant: 'fiveminute',
        endDate: '2026-01-01T00:00:00.000Z',
      });
    });

    it('keeps prior real coin history visible during live market rollover refetch', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const nextMarket = createMarket({
        id: 'next-market',
        endDate: '2026-01-01T00:05:30.000Z',
      });
      const previousCoinHistory = [
        { time: 100, value: 50000 },
        { time: 200, value: 51000 },
      ];
      let resolveNextQuery: ((value: LivelinePoint[]) => void) | undefined;

      historicalData = previousCoinHistory;

      const { result, rerender } = renderHook(
        ({
          activeMarket,
          historicalWindow,
        }: {
          activeMarket: TestMarket;
          historicalWindow: { startDate: string; endDate: string };
        }) =>
          useCryptoUpDownChartData(activeMarket, undefined, {
            liveUpdatesEnabled: false,
            historicalWindow,
          }),
        {
          initialProps: {
            activeMarket: market,
            historicalWindow: {
              startDate: '2025-12-31T23:55:00.000Z',
              endDate: '2026-01-01T00:00:00.000Z',
            },
          },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(previousCoinHistory);
      });

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
            'pending-rollover',
          ],
          queryFn: () =>
            new Promise<LivelinePoint[]>((resolve) => {
              resolveNextQuery = resolve;
            }),
        }),
      );

      rerender({
        activeMarket: nextMarket,
        historicalWindow: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-01T00:05:00.000Z',
        },
      });

      expect(result.current.data).toEqual(previousCoinHistory);

      await act(async () => {
        resolveNextQuery?.([
          { time: 300, value: 52000 },
          { time: 400, value: 53000 },
        ]);
      });
    });

    it('returns historical recurrence-window data without subscribing when live updates are disabled', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        series: {
          id: 'series-4h',
          slug: 'btc-series-4h',
          title: 'BTC Series 4h',
          recurrence: '4h',
        },
      });
      const { result } = renderHook(
        () =>
          useCryptoUpDownChartData(market, undefined, {
            liveUpdatesEnabled: false,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(historicalData);
      });
      expect(result.current.isLive).toBe(false);
      expect(result.current.window).toBe(14400);
      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
    });

    it('can fetch a historical coin lookback window independent of the live market start', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        id: 'new-market',
        endDate: '2026-01-01T00:05:00.000Z',
      });

      renderHook(
        () =>
          useCryptoUpDownChartData(market, undefined, {
            liveUpdatesEnabled: false,
            historicalWindow: {
              startDate: '2025-12-31T23:55:00.000Z',
              endDate: '2026-01-01T00:00:00.000Z',
            },
          }),
        { wrapper: Wrapper },
      );

      expect(mockCryptoPriceHistoryOptions).toHaveBeenCalledWith({
        symbol: 'BTC',
        eventStartTime: '2025-12-31T23:55:00.000Z',
        variant: 'fiveminute',
        endDate: '2026-01-01T00:00:00.000Z',
      });
    });

    it('keeps prior real coin history visible during live market rollover refetch', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const nextMarket = createMarket({
        id: 'next-market',
        endDate: '2026-01-01T00:05:30.000Z',
      });
      const previousCoinHistory = [
        { time: 100, value: 50000 },
        { time: 200, value: 51000 },
      ];
      let resolveNextQuery: ((value: LivelinePoint[]) => void) | undefined;

      historicalData = previousCoinHistory;

      const { result, rerender } = renderHook(
        ({
          activeMarket,
          historicalWindow,
        }: {
          activeMarket: TestMarket;
          historicalWindow: { startDate: string; endDate: string };
        }) =>
          useCryptoUpDownChartData(activeMarket, undefined, {
            liveUpdatesEnabled: false,
            historicalWindow,
          }),
        {
          initialProps: {
            activeMarket: market,
            historicalWindow: {
              startDate: '2025-12-31T23:55:00.000Z',
              endDate: '2026-01-01T00:00:00.000Z',
            },
          },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual(previousCoinHistory);
      });

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
            'pending-rollover',
          ],
          queryFn: () =>
            new Promise<LivelinePoint[]>((resolve) => {
              resolveNextQuery = resolve;
            }),
        }),
      );

      rerender({
        activeMarket: nextMarket,
        historicalWindow: {
          startDate: '2026-01-01T00:00:00.000Z',
          endDate: '2026-01-01T00:05:00.000Z',
        },
      });

      expect(result.current.data).toEqual(previousCoinHistory);

      await act(async () => {
        resolveNextQuery?.([
          { time: 300, value: 52000 },
          { time: 400, value: 53000 },
        ]);
      });
    });

    it('keeps historical data available after live updates arrive', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.data).toEqual(historicalData);
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 210,
        });
      });

      expect(result.current.data).toEqual([
        ...historicalData,
        { time: 210, value: 51500 },
      ]);
      expect(result.current.value).toBe(51500);
    });

    it('falls back to the target price at event start when history is unavailable', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];
      mockGetEventStartTime.mockReturnValue('1970-01-01T00:01:40.000Z');

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, 50000),
        { wrapper: Wrapper },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 110,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 50000 },
        { time: 110, value: 51500 },
      ]);
      expect(result.current.loading).toBe(false);
    });

    it('does not draw an assumed target-to-live line when opened late without history', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];
      mockGetEventStartTime.mockReturnValue('1970-01-01T00:01:40.000Z');

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, 50000),
        { wrapper: Wrapper },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 260,
        });
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51600,
          timestamp: 270,
        });
      });

      expect(result.current.data).toEqual([
        { time: 260, value: 51500 },
        { time: 270, value: 51600 },
      ]);
    });

    it('does not draw a target fallback after a pre-start live point', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];
      mockGetEventStartTime.mockReturnValue('1970-01-01T00:01:40.000Z');

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, 50000),
        { wrapper: Wrapper },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 90,
        });
      });

      expect(result.current.data).toEqual([{ time: 90, value: 51500 }]);
    });

    it('keeps the target price fallback if target price later becomes unavailable', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];
      mockGetEventStartTime.mockReturnValue('1970-01-01T00:01:40.000Z');
      const initialProps: { targetPrice?: number } = { targetPrice: 50000 };

      const { result, rerender } = renderHook(
        ({ targetPrice }: { targetPrice?: number }) =>
          useCryptoUpDownChartData(market, targetPrice),
        {
          initialProps,
          wrapper: Wrapper,
        },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51500,
          timestamp: 110,
        });
      });

      rerender({ targetPrice: undefined });

      expect(result.current.data).toEqual([
        { time: 100, value: 50000 },
        { time: 110, value: 51500 },
      ]);
    });

    it('uses target price fallback with partial historical data', async () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [{ time: 105, value: 50100 }];
      mockGetEventStartTime.mockReturnValue('1970-01-01T00:01:40.000Z');

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, 50000),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.data).toEqual([
          { time: 100, value: 50000 },
          { time: 105, value: 50100 },
        ]);
      });
    });

    it('records the update that freezes live data once the end date passes', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2026-01-01T00:00:05.000Z' });
      historicalData = [];

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 50000,
          timestamp: 100,
        });
      });

      act(() => {
        jest.setSystemTime(new Date('2026-01-01T00:00:06.000Z'));
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 52000,
          timestamp: 110,
        });
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 53000,
          timestamp: 120,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 50000 },
        { time: 110, value: 52000 },
      ]);
    });

    it('keeps live data when the end date passes before the next live update', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({ endDate: '2026-01-01T00:00:05.000Z' });
      historicalData = [];

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket),
        {
          initialProps: { activeMarket: market },
          wrapper: Wrapper,
        },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 50000,
          timestamp: 100,
        });
      });

      act(() => {
        jest.setSystemTime(new Date('2026-01-01T00:00:06.000Z'));
        rerender({ activeMarket: market });
      });

      expect(result.current.isLive).toBe(false);
      expect(result.current.data).toEqual([{ time: 100, value: 50000 }]);
    });

    it('accepts live updates after switching from an expired market', () => {
      const { Wrapper } = createWrapper();
      const expiredMarket = createMarket({
        endDate: '2026-01-01T00:00:05.000Z',
      });
      const liveMarket = createMarket({
        id: 'market-2',
        endDate: '2026-01-01T00:01:00.000Z',
      });
      historicalData = [];

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket),
        {
          initialProps: { activeMarket: expiredMarket },
          wrapper: Wrapper,
        },
      );

      act(() => {
        jest.setSystemTime(new Date('2026-01-01T00:00:06.000Z'));
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 50000,
          timestamp: 100,
        });
      });

      rerender({ activeMarket: liveMarket });

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 110,
        });
      });

      expect(result.current.data).toEqual([
        { time: 100, value: 50000 },
        { time: 110, value: 51000 },
      ]);
      expect(result.current.isLive).toBe(true);
    });

    it('returns live flags and the 30-second live window for future markets', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.isLive).toBe(true);
      expect(result.current.window).toBe(30);
    });

    it('uses the 30-second live window for longer recurrence markets', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket({
        series: {
          id: 'series-1',
          slug: 'btc-series',
          title: 'BTC Series',
          recurrence: '4h',
        },
      });

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.isLive).toBe(true);
      expect(result.current.window).toBe(30);
    });

    it('fetches crypto price history for live markets', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(mockCryptoPriceHistoryOptions).toHaveBeenCalledWith({
        symbol: 'BTC',
        eventStartTime: '2025-12-31T23:55:30.000Z',
        variant: 'fiveminute',
        endDate: undefined,
      });
    });

    it('passes the lowercase websocket symbol to useLiveCryptoPrices', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(mockUseLiveCryptoPrices).toHaveBeenCalledWith(
        'btc/usd',
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

  describe('disabled path', () => {
    it('returns an empty inert result when enabled is false', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, undefined, { enabled: false }),
        { wrapper: Wrapper },
      );

      expect(result.current).toEqual({
        data: [],
        value: 0,
        loading: false,
        isLive: false,
        window: 300,
      });
    });

    it('does not subscribe to live crypto prices when disabled', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      renderHook(
        () => useCryptoUpDownChartData(market, undefined, { enabled: false }),
        { wrapper: Wrapper },
      );

      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
    });

    it('does not fetch crypto price history when disabled', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();

      renderHook(
        () => useCryptoUpDownChartData(market, undefined, { enabled: false }),
        { wrapper: Wrapper },
      );

      expect(historicalData).toEqual([
        { time: 100, value: 50000 },
        { time: 200, value: 51000 },
      ]);
      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
    });

    it('ignores live updates that arrive while disabled', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      historicalData = [];

      const { result } = renderHook(
        () => useCryptoUpDownChartData(market, undefined, { enabled: false }),
        { wrapper: Wrapper },
      );

      act(() => {
        liveUpdateHandler?.({
          symbol: 'btc/usd',
          price: 51000,
          timestamp: 100,
        });
      });

      expect(result.current.data).toEqual([]);
      expect(result.current.value).toBe(0);
      expect(result.current.isLive).toBe(false);
    });

    it('stays inert across market id changes when disabled', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      const nextMarket = createMarket({
        id: 'market-2',
        endDate: '2026-01-01T00:01:30.000Z',
      });

      const { result, rerender } = renderHook(
        ({ activeMarket }: { activeMarket: TestMarket }) =>
          useCryptoUpDownChartData(activeMarket, undefined, {
            enabled: false,
          }),
        {
          initialProps: { activeMarket: market },
          wrapper: Wrapper,
        },
      );

      rerender({ activeMarket: nextMarket });

      expect(result.current).toEqual({
        data: [],
        value: 0,
        loading: false,
        isLive: false,
        window: 300,
      });
      expect(mockUseLiveCryptoPrices).toHaveBeenLastCalledWith(
        '',
        expect.any(Function),
      );
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

    it('keeps live data loading when no matching symbol is available', () => {
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
      expect(result.current.value).toBe(0);
    });

    it('keeps live data loading when event start time is unavailable', () => {
      const { Wrapper } = createWrapper();
      const market = createMarket();
      mockGetEventStartTime.mockReturnValue(undefined);

      const { result } = renderHook(() => useCryptoUpDownChartData(market), {
        wrapper: Wrapper,
      });

      expect(result.current.isLive).toBe(true);
      expect(result.current.loading).toBe(true);
      expect(result.current.value).toBe(0);
    });
  });
});
