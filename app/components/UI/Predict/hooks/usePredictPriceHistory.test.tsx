import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';
import { usePredictPriceHistory } from './usePredictPriceHistory';

const mockGetPriceHistory = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPriceHistory: (...args: unknown[]) => mockGetPriceHistory(...args),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: { log: jest.fn() },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

describe('usePredictPriceHistory', () => {
  const mockPriceHistory: PredictPriceHistoryPoint[] = [
    { timestamp: 1234567890, price: 0.5 },
    { timestamp: 1234567891, price: 0.6 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetPriceHistory.mockResolvedValue(mockPriceHistory);
  });

  describe('initial state', () => {
    it('returns empty price histories when no markets provided', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () => usePredictPriceHistory({ marketIds: [] }),
        { wrapper: Wrapper },
      );

      expect(result.current.priceHistories).toEqual([]);
      expect(result.current.errors).toEqual([]);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns empty price histories when disabled', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            enabled: false,
          }),
        { wrapper: Wrapper },
      );

      expect(result.current.priceHistories).toEqual([]);
      expect(result.current.errors).toEqual([]);
    });
  });

  describe('single market fetching', () => {
    it('fetches price history for a single market', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: undefined,
        startTs: undefined,
        endTs: undefined,
      });
      expect(result.current.priceHistories).toEqual([mockPriceHistory]);
      expect(result.current.errors).toEqual([null]);
    });

    it('handles error when fetching single market fails', async () => {
      const { Wrapper } = createWrapper();
      mockGetPriceHistory.mockRejectedValue(new Error('Failed to fetch'));

      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.priceHistories).toEqual([[]]);
      expect(result.current.errors).toEqual(['Failed to fetch']);
    });
  });

  describe('multiple markets fetching', () => {
    it('fetches price history for multiple markets in parallel', async () => {
      const { Wrapper } = createWrapper();
      const mockHistory1: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.5 },
      ];
      const mockHistory2: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.3 },
      ];
      const mockHistory3: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.2 },
      ];

      mockGetPriceHistory.mockImplementation(
        ({ marketId }: { marketId: string }) => {
          switch (marketId) {
            case 'market-1':
              return Promise.resolve(mockHistory1);
            case 'market-2':
              return Promise.resolve(mockHistory2);
            case 'market-3':
              return Promise.resolve(mockHistory3);
            default:
              return Promise.resolve([]);
          }
        },
      );

      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1', 'market-2', 'market-3'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledTimes(3);
      expect(result.current.priceHistories).toEqual([
        mockHistory1,
        mockHistory2,
        mockHistory3,
      ]);
      expect(result.current.errors).toEqual([null, null, null]);
    });

    it('handles partial failures in multiple markets', async () => {
      const { Wrapper } = createWrapper();
      const mockHistory1: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.5 },
      ];

      mockGetPriceHistory.mockImplementation(
        ({ marketId }: { marketId: string }) => {
          switch (marketId) {
            case 'market-1':
              return Promise.resolve(mockHistory1);
            case 'market-2':
              return Promise.reject(new Error('Failed to fetch market-2'));
            case 'market-3':
              return Promise.resolve(mockPriceHistory);
            default:
              return Promise.resolve([]);
          }
        },
      );

      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1', 'market-2', 'market-3'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.priceHistories).toEqual([
        mockHistory1,
        [],
        mockPriceHistory,
      ]);
      expect(result.current.errors).toEqual([
        null,
        'Failed to fetch market-2',
        null,
      ]);
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledTimes(1);

      await result.current.refetch();

      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
      expect(result.current.priceHistories).toEqual([mockPriceHistory]);
    });
  });

  describe('configuration options', () => {
    it('uses custom interval when provided', async () => {
      const { Wrapper } = createWrapper();
      renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            interval: PredictPriceHistoryInterval.ONE_WEEK,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenCalled();
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          marketId: 'market-1',
          interval: PredictPriceHistoryInterval.ONE_WEEK,
        }),
      );
    });

    it('uses custom fidelity when provided', async () => {
      const { Wrapper } = createWrapper();
      renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            fidelity: 30,
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenCalled();
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          marketId: 'market-1',
          interval: PredictPriceHistoryInterval.ONE_DAY,
          fidelity: 30,
        }),
      );
    });
  });

  describe('reactivity', () => {
    it('refetches when marketIds change', async () => {
      const { Wrapper } = createWrapper();
      const { result, rerender } = renderHook(
        ({ marketIds }) =>
          usePredictPriceHistory({
            marketIds,
          }),
        {
          initialProps: { marketIds: ['market-1'] },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.priceHistories).toEqual([mockPriceHistory]);

      rerender({ marketIds: ['market-2'] });

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenLastCalledWith(
          expect.objectContaining({ marketId: 'market-2' }),
        );
      });
    });

    it('refetches when interval changes', async () => {
      const { Wrapper } = createWrapper();
      const { result, rerender } = renderHook(
        ({ interval }) =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            interval,
          }),
        {
          initialProps: { interval: PredictPriceHistoryInterval.ONE_DAY },
          wrapper: Wrapper,
        },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      rerender({ interval: PredictPriceHistoryInterval.ONE_WEEK });

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenLastCalledWith(
          expect.objectContaining({
            marketId: 'market-1',
            interval: PredictPriceHistoryInterval.ONE_WEEK,
          }),
        );
      });
    });

    it('does not fetch when disabled', () => {
      const { Wrapper } = createWrapper();
      renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            enabled: false,
          }),
        { wrapper: Wrapper },
      );

      expect(mockGetPriceHistory).not.toHaveBeenCalled();
    });

    it('fetches when enabled changes from false to true', async () => {
      const { Wrapper } = createWrapper();
      const { rerender } = renderHook(
        ({ enabled }) =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            enabled,
          }),
        {
          initialProps: { enabled: false },
          wrapper: Wrapper,
        },
      );

      expect(mockGetPriceHistory).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenCalled();
      });
    });
  });

  describe('error handling', () => {
    it('handles non-Error exceptions', async () => {
      const { Wrapper } = createWrapper();
      mockGetPriceHistory.mockRejectedValue('String error');

      const { result } = renderHook(
        () =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
          }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.priceHistories).toEqual([[]]);
      expect(result.current.errors).toEqual(['Failed to fetch price history']);
    });
  });

  describe('interval enum values', () => {
    const intervals = [
      PredictPriceHistoryInterval.ONE_HOUR,
      PredictPriceHistoryInterval.SIX_HOUR,
      PredictPriceHistoryInterval.ONE_DAY,
      PredictPriceHistoryInterval.ONE_WEEK,
      PredictPriceHistoryInterval.ONE_MONTH,
      PredictPriceHistoryInterval.MAX,
    ];

    intervals.forEach((interval) => {
      it(`handles ${interval} interval correctly`, async () => {
        const { Wrapper } = createWrapper();
        const { result } = renderHook(
          () =>
            usePredictPriceHistory({
              marketIds: ['market-1'],
              interval,
            }),
          { wrapper: Wrapper },
        );

        await waitFor(() => {
          expect(result.current.isFetching).toBe(false);
        });

        expect(mockGetPriceHistory).toHaveBeenCalledWith(
          expect.objectContaining({
            marketId: 'market-1',
            interval,
          }),
        );
        expect(result.current.priceHistories).toEqual([mockPriceHistory]);
      });
    });
  });
});
