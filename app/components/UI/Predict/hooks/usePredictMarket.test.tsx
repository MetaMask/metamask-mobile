import React from 'react';
import { renderHook, waitFor, act } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePredictMarket } from './usePredictMarket';
import { PredictMarket, Recurrence } from '../types';
import { POLYMARKET_PROVIDER_ID } from '../providers/polymarket/constants';

const mockGetMarket = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarket: (...args: unknown[]) => mockGetMarket(...args),
    },
  },
}));

jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: { error: jest.fn() },
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

const mockMarket: PredictMarket = {
  id: 'market-1',
  providerId: POLYMARKET_PROVIDER_ID,
  slug: 'bitcoin-price-prediction',
  title: 'Will Bitcoin reach $200k by end of 2025?',
  description: 'Bitcoin price prediction market',
  endDate: '2025-12-31T23:59:59Z',
  image: 'https://example.com/btc.png',
  status: 'open',
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: ['trending'],
  outcomes: [
    {
      id: 'outcome-1',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'Yes',
      description: 'Bitcoin will reach $200k',
      image: '',
      status: 'open',
      tokens: [
        {
          id: 'token-1',
          title: 'Yes',
          price: 0.65,
        },
      ],
      volume: 1000000,
      groupItemTitle: 'Yes/No',
    },
    {
      id: 'outcome-2',
      providerId: POLYMARKET_PROVIDER_ID,
      marketId: 'market-1',
      title: 'No',
      description: 'Bitcoin will not reach $200k',
      image: '',
      status: 'open',
      tokens: [
        {
          id: 'token-2',
          title: 'No',
          price: 0.35,
        },
      ],
      volume: 1000000,
      groupItemTitle: 'Yes/No',
    },
  ],
  liquidity: 1000000,
  volume: 1000000,
};

describe('usePredictMarket', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('initial state', () => {
    it('returns null market and not fetching when no id provided', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictMarket(), {
        wrapper: Wrapper,
      });

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns null market and not fetching when id is undefined', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictMarket({ id: undefined }), {
        wrapper: Wrapper,
      });

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns null market and not fetching when id is empty string', () => {
      const { Wrapper } = createWrapper();
      const { result } = renderHook(() => usePredictMarket({ id: '' }), {
        wrapper: Wrapper,
      });

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful market fetching', () => {
    it('fetches market data successfully with string id', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      // Initially fetching
      expect(result.current.isFetching).toBe(true);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toEqual(mockMarket);
      expect(result.current.error).toBe(null);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
      });
    });

    it('fetches market data successfully with number id', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result } = renderHook(() => usePredictMarket({ id: 123 }), {
        wrapper: Wrapper,
      });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toEqual(mockMarket);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: '123',
      });
    });

    it('handles null market response', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(null);

      const { result } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('error handling', () => {
    it('handles API error with Error instance', async () => {
      const { Wrapper } = createWrapper();
      const errorMessage = 'Network error occurred';
      mockGetMarket.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(errorMessage);
    });

    it('handles API error with non-Error instance', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockRejectedValue('String error');

      const { result } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe('String error');
    });
  });

  describe('enabled option', () => {
    it('does not fetch when enabled is false', () => {
      const { Wrapper } = createWrapper();
      renderHook(() => usePredictMarket({ id: 'market-1', enabled: false }), {
        wrapper: Wrapper,
      });

      expect(mockGetMarket).not.toHaveBeenCalled();
    });

    it('clears state when disabled after being enabled', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          usePredictMarket({ id: 'market-1', enabled }),
        { wrapper: Wrapper, initialProps: { enabled: true } },
      );

      await waitFor(() => {
        expect(result.current.market).toEqual(mockMarket);
      });

      // Disable the hook
      rerender({ enabled: false });

      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isFetching).toBe(false);
    });

    it('fetches when enabled changes from false to true', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender } = renderHook(
        ({ enabled }: { enabled: boolean }) =>
          usePredictMarket({ id: 'market-1', enabled }),
        { wrapper: Wrapper, initialProps: { enabled: false } },
      );

      expect(mockGetMarket).not.toHaveBeenCalled();

      // Enable the hook
      rerender({ enabled: true });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(result.current.market).toEqual(mockMarket);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
      });
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when calling refetch', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarket).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });

    it('maintains a callable refetch function across rerenders', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender } = renderHook(
        () => usePredictMarket({ id: 'market-1' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      // Trigger a re-render
      rerender({});

      expect(typeof result.current.refetch).toBe('function');

      // Ensure refetch still works after rerender
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });
  });

  describe('dependency changes', () => {
    it('refetches when id changes', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender } = renderHook(
        ({ id }: { id: string }) => usePredictMarket({ id }),
        { wrapper: Wrapper, initialProps: { id: 'market-1' } },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
      });

      // Change id
      rerender({ id: 'market-2' });

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-2',
      });
      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });
  });

  describe('integration', () => {
    it('calls getMarket with correct parameters', async () => {
      const { Wrapper } = createWrapper();
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result } = renderHook(
        () => usePredictMarket({ id: 'test-market-id' }),
        { wrapper: Wrapper },
      );

      await waitFor(() => {
        expect(result.current.isFetching).toBe(false);
      });

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'test-market-id',
      });
      expect(mockGetMarket).toHaveBeenCalledTimes(1);
    });
  });
});
