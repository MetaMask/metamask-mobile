import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GetPriceResponse, PriceQuery } from '../types';
import { usePredictPrices } from './usePredictPrices';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';

const mockGetPrices = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPrices: (...args: unknown[]) => mockGetPrices(...args),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

jest.mock('../utils/predictErrorHandler', () => ({
  ensureError: (err: unknown) =>
    err instanceof Error ? err : new Error(String(err)),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictPrices', () => {
  const mockPrices: GetPriceResponse = {
    providerId: POLYMARKET_PROVIDER_ID,
    results: [
      {
        marketId: 'market-1',
        outcomeId: 'outcome-1',
        outcomeTokenId: 'token-1',
        entry: { buy: 0.65, sell: 0.64 },
      },
      {
        marketId: 'market-2',
        outcomeId: 'outcome-2',
        outcomeTokenId: 'token-2',
        entry: { buy: 0.35, sell: 0.34 },
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPrices.mockResolvedValue(mockPrices);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns undefined data and not fetching when no queries provided', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(() => usePredictPrices({ queries: [] }), {
        wrapper: Wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns undefined data when disabled', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            enabled: false,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('single token fetching', () => {
    it('fetches prices for a single token', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.isFetching).toBe(true);

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledWith({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
          },
        ],
      });
      expect(result.current.data).toEqual(mockPrices);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles error when fetching single token fails', async () => {
      const mockError = new Error('Failed to fetch prices');
      mockGetPrices.mockRejectedValueOnce(mockError);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch prices');
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('multiple tokens fetching', () => {
    it('fetches prices for multiple tokens', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
              {
                marketId: 'market-2',
                outcomeId: 'outcome-2',
                outcomeTokenId: 'token-2',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledWith({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
          },
          {
            marketId: 'market-2',
            outcomeId: 'outcome-2',
            outcomeTokenId: 'token-2',
          },
        ],
      });
      expect(result.current.data).toEqual(mockPrices);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(2);
      expect(result.current.data).toEqual(mockPrices);
    });
  });

  describe('configuration options', () => {
    it('fetches prices when queries are provided', async () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledWith({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
          },
        ],
      });
    });
  });

  describe('polling functionality', () => {
    it('polls at specified interval', async () => {
      jest.useFakeTimers();
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            pollingInterval: 5000,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockGetPrices).toHaveBeenCalledTimes(2);
      });

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockGetPrices).toHaveBeenCalledTimes(3);
      });
    });

    it('stops polling when unmounted', async () => {
      jest.useFakeTimers();
      const { Wrapper } = createWrapper();

      const { result, unmount } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            pollingInterval: 5000,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);
    });

    it('does not poll when pollingInterval is not provided', async () => {
      jest.useFakeTimers();
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(mockGetPrices).toHaveBeenCalledTimes(1);
    });
  });

  describe('reactivity', () => {
    it('refetches when queries change', async () => {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ queries }) =>
          usePredictPrices({
            queries,
          }),
        {
          initialProps: {
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalledWith({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
          },
        ],
      });

      rerender({
        queries: [
          {
            marketId: 'market-2',
            outcomeId: 'outcome-2',
            outcomeTokenId: 'token-2',
          },
        ],
      });

      await waitFor(() => {
        expect(mockGetPrices).toHaveBeenLastCalledWith({
          queries: [
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
        });
      });
    });

    it('fetches when enabled changes from true to false to true', async () => {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            enabled,
          }),
        {
          initialProps: { enabled: false },
          wrapper: Wrapper,
        },
      );

      expect(mockGetPrices).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPrices).toHaveBeenCalled();
    });
  });

  describe('enabled state', () => {
    it('retains cached data when enabled changes from true to false', async () => {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ enabled }) =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            enabled,
          }),
        {
          initialProps: { enabled: true },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toEqual(mockPrices);

      rerender({ enabled: false });

      // React Query keeps cached data when disabled; it just won't refetch
      expect(result.current.data).toEqual(mockPrices);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles Error thrown by getPrices', async () => {
      const mockError = new Error('Failed to fetch prices');
      mockGetPrices.mockRejectedValueOnce(mockError);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Failed to fetch prices');
      expect(result.current.isFetching).toBe(false);
    });

    it('handles non-Error exceptions (converted by ensureError in queryFn)', async () => {
      mockGetPrices.mockRejectedValueOnce('String error');

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('String error');
    });

    it('clears error on successful refetch', async () => {
      const mockError = new Error('Failed to fetch prices');
      mockGetPrices.mockRejectedValueOnce(mockError);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Failed to fetch prices');
      });

      mockGetPrices.mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.data).toEqual(mockPrices);
    });
  });

  describe('polling with errors', () => {
    it('continues polling after error', async () => {
      jest.useFakeTimers();
      const mockError = new Error('Network error');
      mockGetPrices.mockRejectedValueOnce(mockError);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
            pollingInterval: 5000,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
      expect(mockGetPrices).toHaveBeenCalledTimes(1);

      // React Query's refetchInterval continues polling even after errors
      mockGetPrices.mockResolvedValueOnce(mockPrices);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(mockGetPrices).toHaveBeenCalledTimes(2);
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
        expect(result.current.data).toEqual(mockPrices);
      });
    });

    it('can manually refetch after error', async () => {
      const mockError = new Error('Network error');
      mockGetPrices.mockRejectedValueOnce(mockError);

      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.error?.message).toBe('Network error');
      });

      expect(result.current.data).toBeUndefined();

      mockGetPrices.mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.data).toEqual(mockPrices);
    });
  });

  describe('edge cases', () => {
    it('handles empty queries array', () => {
      const { Wrapper } = createWrapper();

      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [],
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(mockGetPrices).not.toHaveBeenCalled();
    });

    it('handles transition from empty to non-empty queries', async () => {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ queries }) =>
          usePredictPrices({
            queries,
          }),
        {
          initialProps: { queries: [] as PriceQuery[] },
          wrapper: Wrapper,
        },
      );

      expect(result.current.data).toBeUndefined();

      rerender({
        queries: [
          {
            marketId: 'market-1',
            outcomeId: 'outcome-1',
            outcomeTokenId: 'token-1',
          },
        ],
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toEqual(mockPrices);
    });

    it('handles transition from non-empty to empty queries', async () => {
      const { Wrapper } = createWrapper();

      const { result, rerender } = renderHook(
        ({ queries }) =>
          usePredictPrices({
            queries,
          }),
        {
          initialProps: {
            queries: [
              {
                marketId: 'market-1',
                outcomeId: 'outcome-1',
                outcomeTokenId: 'token-1',
              },
            ] as PriceQuery[],
          },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.data).toEqual(mockPrices);

      rerender({ queries: [] });

      // React Query retains cached data; the query is just disabled
      expect(result.current.data).toEqual(mockPrices);
      expect(result.current.isFetching).toBe(false);
    });
  });
});
