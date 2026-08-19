import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { useCurrentCryptoUpDownMarketData } from './useCurrentCryptoUpDownMarketData';
import { useCurrentPredictMarketFromSeries } from './useCurrentPredictMarketFromSeries';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import {
  Recurrence,
  type CryptoPriceHistoryPoint,
  type CryptoPriceUpdate,
  type PredictMarket,
  type PredictSeries,
} from '../types';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      subscribeToCryptoPrices: jest.fn(),
      getConnectionStatus: jest.fn(),
      getCryptoPriceHistory: jest.fn(),
    },
  },
}));

jest.mock('./useCurrentPredictMarketFromSeries', () => ({
  useCurrentPredictMarketFromSeries: jest.fn(),
}));

jest.mock('./useCryptoTargetPrice', () => ({
  useCryptoTargetPrice: jest.fn(),
}));

const mockUseCurrentPredictMarketFromSeries =
  useCurrentPredictMarketFromSeries as jest.Mock;
const mockUseCryptoTargetPrice = useCryptoTargetPrice as jest.Mock;
const mockSubscribeToCryptoPrices = Engine.context.PredictController
  .subscribeToCryptoPrices as jest.Mock;
const mockGetConnectionStatus = Engine.context.PredictController
  .getConnectionStatus as jest.Mock;
const mockGetCryptoPriceHistory = Engine.context.PredictController
  .getCryptoPriceHistory as jest.Mock;

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

const createHistoryPoint = (
  value: number,
  timestamp: string,
): CryptoPriceHistoryPoint => ({
  value,
  timestamp,
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
      },
    },
  });

  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useCurrentCryptoUpDownMarketData', () => {
  let livePriceCallback: ((update: CryptoPriceUpdate) => void) | undefined;
  const mockUnsubscribe = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:03:00.000Z'));
    livePriceCallback = undefined;
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
    mockSubscribeToCryptoPrices.mockImplementation(
      (_symbols, callback: (update: CryptoPriceUpdate) => void) => {
        livePriceCallback = callback;
        return mockUnsubscribe;
      },
    );
    mockGetConnectionStatus.mockReturnValue({
      rtdsConnected: true,
      sportsConnected: false,
      marketConnected: false,
    });
    mockGetCryptoPriceHistory.mockResolvedValue([
      createHistoryPoint(93000, '2026-01-01T00:00:00.000Z'),
      createHistoryPoint(93025, '2026-01-01T00:03:00.000Z'),
    ]);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns seeded BTC up/down price, price to beat, and timer data', async () => {
    const { result } = renderHook(
      () => useCurrentCryptoUpDownMarketData({ series: SERIES }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.currentPrice).toBe(93025));

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
    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: undefined },
    );
    expect(result.current.marketId).toBe(MARKET.id);
    expect(result.current.symbol).toBe('BTC');
    expect(result.current.currentPrice).toBe(93025);
    expect(result.current.priceToBeat).toBe(93000);
    expect(result.current.countdown).toBe('2:00');
    expect(result.current.timeRemainingMs).toBe(120_000);
  });

  it('falls back to market threshold when fetched target price is unavailable', async () => {
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

    const { result } = renderHook(
      () => useCurrentCryptoUpDownMarketData({ series: SERIES }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.currentPrice).toBe(93025));

    expect(result.current.priceToBeat).toBe(77123);
  });

  it('uses the TWAP window subscription and keeps the market price-to-beat', async () => {
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

    const { result } = renderHook(
      () => useCurrentCryptoUpDownMarketData({ series: SERIES }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.currentPrice).toBe(93025));

    expect(mockUseCryptoTargetPrice).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSubscribeToCryptoPrices).toHaveBeenCalledWith(
      ['btc/usd'],
      expect.any(Function),
      { twapWindowSeconds: 30 },
    );
    expect(result.current.currentPrice).toBe(93025);
    expect(result.current.priceToBeat).toBe(93000);
  });

  it('keeps downstream price hooks disabled until the series market resolves', () => {
    mockUseCurrentPredictMarketFromSeries.mockReturnValue({
      market: undefined,
      marketId: undefined,
      isLoading: true,
      isFetching: true,
      refetch: jest.fn(),
    });

    renderHook(() => useCurrentCryptoUpDownMarketData({ series: SERIES }), {
      wrapper: createWrapper(),
    });

    expect(mockUseCryptoTargetPrice).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(mockSubscribeToCryptoPrices).not.toHaveBeenCalled();
    expect(mockGetCryptoPriceHistory).not.toHaveBeenCalled();
  });

  it('coalesces live updates when the rendered integer price does not change', async () => {
    const { result } = renderHook(
      () => useCurrentCryptoUpDownMarketData({ series: SERIES }),
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(result.current.currentPrice).toBe(93025));

    await act(async () => {
      livePriceCallback?.({
        symbol: 'btc/usd',
        price: 93025.4,
        timestamp: 1_700_000_000,
      });
      await Promise.resolve();
    });

    expect(result.current.currentPrice).toBe(93025);

    await act(async () => {
      livePriceCallback?.({
        symbol: 'btc/usd',
        price: 93026,
        timestamp: 1_700_000_001,
      });
      await Promise.resolve();
    });

    expect(result.current.currentPrice).toBe(93026);
  });

  it('unsubscribes and stops the countdown when disabled', async () => {
    const { result, rerender } = renderHook(
      ({ isEnabled }) =>
        useCurrentCryptoUpDownMarketData({
          series: SERIES,
          enabled: isEnabled,
        }),
      {
        initialProps: { isEnabled: true },
        wrapper: createWrapper(),
      },
    );

    await waitFor(() => expect(result.current.currentPrice).toBe(93025));

    const countdownBeforeDisable = result.current.countdown;

    rerender({ isEnabled: false });

    expect(mockUnsubscribe).toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(3000);
    });

    expect(result.current.countdown).toBe(countdownBeforeDisable);
  });
});
