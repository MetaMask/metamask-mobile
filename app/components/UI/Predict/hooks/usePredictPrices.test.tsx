import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Engine from '../../../../core/Engine';
import { GetPriceResponse, PriceQuery } from '../types';
import { usePredictPrices } from './usePredictPrices';

import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';
jest.mock('../../../../core/Engine', () => {
  const mockContext = {
    PredictController: {
      getPrices: jest.fn(),
    },
  };

  return {
    context: mockContext,
  };
});

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

jest.mock('../../../../util/Logger', () => ({
  error: jest.fn(),
}));

jest.mock('../utils/predictErrorHandler', () => ({
  ensureError: (err: unknown) =>
    err instanceof Error ? err : new Error(String(err)),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('usePredictPrices', () => {
  let wrapper: ReturnType<typeof createWrapper>;

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
    wrapper = createWrapper();
    (Engine.context.PredictController.getPrices as jest.Mock).mockResolvedValue(
      mockPrices,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns undefined data and not fetching when no queries provided', () => {
      const { result } = renderHook(() => usePredictPrices({ queries: [] }), {
        wrapper,
      });

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns undefined data when disabled', () => {
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
        { wrapper },
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('single token fetching', () => {
    it('fetches prices for a single token', async () => {
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
        { wrapper },
      );

      expect(result.current.isFetching).toBe(true);

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
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
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe(
        'Failed to fetch prices',
      );
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('multiple tokens fetching', () => {
    it('fetches prices for multiple tokens with different sides', async () => {
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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        2,
      );
      expect(result.current.data).toEqual(mockPrices);
    });
  });

  describe('configuration options', () => {
    it('fetches prices when queries are provided', async () => {
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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() =>
        expect(
          Engine.context.PredictController.getPrices,
        ).toHaveBeenCalledTimes(2),
      );

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() =>
        expect(
          Engine.context.PredictController.getPrices,
        ).toHaveBeenCalledTimes(3),
      );
    });

    it('stops polling when unmounted', async () => {
      jest.useFakeTimers();

      const { unmount, result } = renderHook(
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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      unmount();

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
    });

    it('does not poll when pollingInterval is not provided', async () => {
      jest.useFakeTimers();

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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      await act(async () => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('reactivity', () => {
    it('refetches when queries change', async () => {
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
          wrapper,
        },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
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

      await waitFor(() =>
        expect(
          Engine.context.PredictController.getPrices,
        ).toHaveBeenLastCalledWith({
          queries: [
            {
              marketId: 'market-2',
              outcomeId: 'outcome-2',
              outcomeTokenId: 'token-2',
            },
          ],
        }),
      );
    });

    it('fetches when enabled changes from false to true', async () => {
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
          wrapper,
        },
      );

      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles non-Error exceptions', async () => {
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce('String error');

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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.data).toBeUndefined();
      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('String error');
    });

    it('clears previous error on successful refetch', async () => {
      const mockError = new Error('Failed to fetch prices');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

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
        { wrapper },
      );

      await waitFor(() =>
        expect((result.current.error as Error | null)?.message).toBe(
          'Failed to fetch prices',
        ),
      );

      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => expect(result.current.error).toBeNull());
      expect(result.current.data).toEqual(mockPrices);
    });
  });

  describe('edge cases', () => {
    it('handles empty queries array', async () => {
      const { result } = renderHook(
        () =>
          usePredictPrices({
            queries: [],
          }),
        { wrapper },
      );

      expect(result.current.data).toBeUndefined();
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();
    });

    it('handles transition from empty to non-empty queries', async () => {
      const { result, rerender } = renderHook(
        ({ queries }) =>
          usePredictPrices({
            queries,
          }),
        {
          initialProps: { queries: [] as PriceQuery[] },
          wrapper,
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

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.data).toEqual(mockPrices);
    });

    it('handles transition from non-empty to empty queries', async () => {
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
          wrapper,
        },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.data).toEqual(mockPrices);

      rerender({ queries: [] });

      // React Query retains cached data via placeholderData: keepPreviousData
      expect(result.current.data).toEqual(mockPrices);
      expect(result.current.isFetching).toBe(false);
    });

    it('handles empty prices response', async () => {
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce({ providerId: '', results: [] });

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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.data).toEqual({ providerId: '', results: [] });
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('polling with errors', () => {
    it('continues polling after error', async () => {
      jest.useFakeTimers();

      const mockError = new Error('Network error');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

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
        { wrapper },
      );

      await waitFor(() => expect(result.current.isFetching).toBe(false));

      expect(result.current.error).toBeInstanceOf(Error);
      expect((result.current.error as Error).message).toBe('Network error');
      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      // React Query's refetchInterval continues polling even after errors
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce(mockPrices);

      await act(async () => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.getPrices,
        ).toHaveBeenCalledTimes(2);
        expect(result.current.data).toEqual(mockPrices);
      });

      expect(result.current.error).toBeNull();
    });

    it('can manually refetch after error', async () => {
      const mockError = new Error('Network error');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

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
        { wrapper },
      );

      await waitFor(() =>
        expect((result.current.error as Error | null)?.message).toBe(
          'Network error',
        ),
      );

      expect(result.current.data).toBeUndefined();

      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      await waitFor(() => expect(result.current.error).toBeNull());
      expect(result.current.data).toEqual(mockPrices);
    });
  });
});
