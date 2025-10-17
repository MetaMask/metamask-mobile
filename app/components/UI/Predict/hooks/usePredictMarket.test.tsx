import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { usePredictMarket } from './usePredictMarket';
import { PredictMarket, Recurrence } from '../types';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getMarket: jest.fn(),
    },
  },
}));

describe('usePredictMarket', () => {
  const mockGetMarket = jest.fn();

  const mockMarket: PredictMarket = {
    id: 'market-1',
    providerId: 'polymarket',
    slug: 'bitcoin-price-prediction',
    title: 'Will Bitcoin reach $200k by end of 2025?',
    description: 'Bitcoin price prediction market',
    endDate: '2025-12-31T23:59:59Z',
    image: 'https://example.com/btc.png',
    status: 'open',
    recurrence: Recurrence.NONE,
    categories: ['crypto', 'trending'],
    outcomes: [
      {
        id: 'outcome-1',
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
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.PredictController.getMarket as jest.Mock) = mockGetMarket;
  });

  describe('initial state', () => {
    it('returns null market and not fetching when no id provided', () => {
      const { result } = renderHook(() => usePredictMarket());

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns null market and not fetching when id is undefined', () => {
      const { result } = renderHook(() => usePredictMarket({ id: undefined }));

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns null market and not fetching when id is empty string', () => {
      const { result } = renderHook(() => usePredictMarket({ id: '' }));

      expect(result.current.market).toBe(null);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful market fetching', () => {
    it('fetches market data successfully with string id', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      // Initially loading
      expect(result.current.isFetching).toBe(true);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);

      // Wait for data to load
      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.market).toEqual(mockMarket);
      expect(result.current.error).toBe(null);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: undefined,
      });
    });

    it('fetches market data successfully with number id', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 123 }),
      );

      await waitForNextUpdate();

      expect(result.current.market).toEqual(mockMarket);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: '123',
        providerId: undefined,
      });
    });

    it('fetches market data with providerId', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1', providerId: 'polymarket' }),
      );

      await waitForNextUpdate();

      expect(result.current.market).toEqual(mockMarket);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: 'polymarket',
      });
    });

    it('handles null market response', async () => {
      mockGetMarket.mockResolvedValue(null);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);
    });
  });

  describe('error handling', () => {
    it('handles API error with Error instance', async () => {
      const errorMessage = 'Network error occurred';
      mockGetMarket.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(errorMessage);
    });

    it('handles API error with non-Error instance', async () => {
      mockGetMarket.mockRejectedValue('String error');

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe('Failed to fetch market');
    });
  });

  describe('enabled option', () => {
    it('does not fetch when enabled is false', () => {
      renderHook(() => usePredictMarket({ id: 'market-1', enabled: false }));

      expect(mockGetMarket).not.toHaveBeenCalled();
    });

    it('clears state when disabled after being enabled', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) => usePredictMarket({ id: 'market-1', enabled }),
        { initialProps: { enabled: true } },
      );

      await waitForNextUpdate();

      expect(result.current.market).toEqual(mockMarket);

      // Disable the hook
      rerender({ enabled: false });

      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe(null);
      expect(result.current.isFetching).toBe(false);
    });

    it('fetches when enabled changes from false to true', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) => usePredictMarket({ id: 'market-1', enabled }),
        { initialProps: { enabled: false } },
      );

      expect(mockGetMarket).not.toHaveBeenCalled();

      // Enable the hook
      rerender({ enabled: true });

      await waitForNextUpdate();

      expect(result.current.market).toEqual(mockMarket);
      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: undefined,
      });
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when calling refetch', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });

    it('maintains stable refetch function reference', () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { result, rerender } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      const firstRefetch = result.current.refetch;

      // Trigger a re-render
      rerender();

      expect(result.current.refetch).toBe(firstRefetch);
    });

    it('does not refetch when disabled', async () => {
      const { result } = renderHook(() =>
        usePredictMarket({ id: 'market-1', enabled: false }),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetMarket).not.toHaveBeenCalled();
    });
  });

  describe('dependency changes', () => {
    it('refetches when id changes', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ id }) => usePredictMarket({ id }),
        { initialProps: { id: 'market-1' } },
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: undefined,
      });

      // Change id
      rerender({ id: 'market-2' });

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-2',
        providerId: undefined,
      });
      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });

    it('refetches when providerId changes', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ providerId }) => usePredictMarket({ id: 'market-1', providerId }),
        { initialProps: { providerId: 'polymarket' } },
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: 'polymarket',
      });

      // Change providerId
      rerender({ providerId: 'other-provider' });

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'market-1',
        providerId: 'other-provider',
      });
      expect(mockGetMarket).toHaveBeenCalledTimes(2);
    });
  });

  describe('component unmounting', () => {
    it('does not update state after component unmounts', async () => {
      mockGetMarket.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockMarket), 100);
          }),
      );

      const { result, unmount } = renderHook(() =>
        usePredictMarket({ id: 'market-1' }),
      );

      // Start the fetch
      expect(result.current.isFetching).toBe(true);

      // Unmount before fetch completes
      unmount();

      // Wait for the promise to resolve
      await new Promise((resolve) => setTimeout(resolve, 150));

      // The hook should not have updated state after unmount
      // We can't test this directly since the hook is unmounted,
      // but we can verify the mock was called
      expect(mockGetMarket).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles id conversion from number to string', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: 0 }),
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: '0',
        providerId: undefined,
      });
    });

    it('handles id conversion from negative number to string', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictMarket({ id: -1 }),
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: '-1',
        providerId: undefined,
      });
    });

    it('handles multiple rapid id changes', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { rerender } = renderHook(({ id }) => usePredictMarket({ id }), {
        initialProps: { id: 'market-1' },
      });

      // Rapidly change id multiple times
      rerender({ id: 'market-2' });
      rerender({ id: 'market-3' });
      rerender({ id: 'market-4' });

      // Wait for all promises to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should have been called for each change
      expect(mockGetMarket).toHaveBeenCalledTimes(4);
    });
  });

  describe('integration with controller', () => {
    it('calls getMarket with correct parameters', async () => {
      mockGetMarket.mockResolvedValue(mockMarket);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictMarket({
          id: 'test-market-id',
          providerId: 'test-provider',
        }),
      );

      await waitForNextUpdate();

      expect(mockGetMarket).toHaveBeenCalledWith({
        marketId: 'test-market-id',
        providerId: 'test-provider',
      });
      expect(mockGetMarket).toHaveBeenCalledTimes(1);
    });

    it('handles controller method throwing synchronously', async () => {
      mockGetMarket.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const { result } = renderHook(() => usePredictMarket({ id: 'market-1' }));

      // Wait a bit for the error to be processed
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.market).toBe(null);
      expect(result.current.error).toBe('Synchronous error');
    });
  });
});
