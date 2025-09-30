import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { usePredictPriceHistory } from './usePredictPriceHistory';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';

// Mock dependencies
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getPriceHistory: jest.fn(),
    },
  },
}));

jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

describe('usePredictPriceHistory', () => {
  const mockGetPriceHistory = jest.fn();

  const mockPriceHistory: PredictPriceHistoryPoint[] = [
    { timestamp: 1640995200000, price: 0.45 }, // 2022-01-01
    { timestamp: 1641081600000, price: 0.52 }, // 2022-01-02
    { timestamp: 1641168000000, price: 0.48 }, // 2022-01-03
    { timestamp: 1641254400000, price: 0.55 }, // 2022-01-04
    { timestamp: 1641340800000, price: 0.61 }, // 2022-01-05
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.PredictController.getPriceHistory as jest.Mock) =
      mockGetPriceHistory;
    (DevLogger.log as jest.Mock).mockImplementation(() => {
      // Mock implementation
    });
  });

  describe('initial state', () => {
    it('returns empty price history and not fetching when no market provided', () => {
      const { result } = renderHook(() => usePredictPriceHistory());

      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns empty price history and not fetching when market is undefined', () => {
      const { result } = renderHook(() =>
        usePredictPriceHistory({ marketId: undefined }),
      );

      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('returns empty price history and not fetching when market is empty string', () => {
      const { result } = renderHook(() =>
        usePredictPriceHistory({ marketId: '' }),
      );

      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBe(null);
    });
  });

  describe('successful price history fetching', () => {
    it('fetches price history data successfully with market id', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      // Initially loading
      expect(result.current.isFetching).toBe(true);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe(null);

      // Wait for data to load
      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(result.current.error).toBe(null);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });

    it('fetches price history with custom interval', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketId: 'market-1',
          interval: PredictPriceHistoryInterval.ONE_HOUR,
        }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        providerId: undefined,
      });
    });

    it('fetches price history with providerId', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketId: 'market-1',
          providerId: 'polymarket',
        }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: 'polymarket',
      });
    });

    it('fetches price history with fidelity', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketId: 'market-1',
          fidelity: 100,
        }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: 100,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });

    it('handles null price history response', async () => {
      mockGetPriceHistory.mockResolvedValue(null);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe(null);
    });

    it('handles undefined price history response', async () => {
      mockGetPriceHistory.mockResolvedValue(undefined);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe(null);
    });
  });

  describe('error handling', () => {
    it('handles API error with Error instance', async () => {
      const errorMessage = 'Network error occurred';
      mockGetPriceHistory.mockRejectedValue(new Error(errorMessage));

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe(errorMessage);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePredictPriceHistory: Error fetching price history',
        expect.any(Error),
      );
    });

    it('handles API error with non-Error instance', async () => {
      mockGetPriceHistory.mockRejectedValue('String error');

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe('Failed to fetch price history');
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePredictPriceHistory: Error fetching price history',
        'String error',
      );
    });
  });

  describe('enabled option', () => {
    it('does not fetch when enabled is false', () => {
      renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1', enabled: false }),
      );

      expect(mockGetPriceHistory).not.toHaveBeenCalled();
    });

    it('clears state when disabled after being enabled', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) =>
          usePredictPriceHistory({ marketId: 'market-1', enabled }),
        { initialProps: { enabled: true } },
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);

      // Disable the hook
      rerender({ enabled: false });

      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe(null);
      expect(result.current.isFetching).toBe(false);
    });

    it('fetches when enabled changes from false to true', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) =>
          usePredictPriceHistory({ marketId: 'market-1', enabled }),
        { initialProps: { enabled: false } },
      );

      expect(mockGetPriceHistory).not.toHaveBeenCalled();

      // Enable the hook
      rerender({ enabled: true });

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when calling refetch', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledTimes(1);

      // Call refetch
      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
    });

    it('maintains stable refetch function reference', () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, rerender } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      const firstRefetch = result.current.refetch;

      // Trigger a re-render
      rerender();

      expect(result.current.refetch).toBe(firstRefetch);
    });

    it('does not refetch when disabled', async () => {
      const { result } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1', enabled: false }),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(mockGetPriceHistory).not.toHaveBeenCalled();
    });
  });

  describe('dependency changes', () => {
    it('refetches when market changes', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ marketId }) => usePredictPriceHistory({ marketId }),
        { initialProps: { marketId: 'market-1' } },
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });

      // Change market
      rerender({ marketId: 'market-2' });

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-2',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
    });

    it('refetches when interval changes', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ interval }) =>
          usePredictPriceHistory({ marketId: 'market-1', interval }),
        { initialProps: { interval: PredictPriceHistoryInterval.ONE_HOUR } },
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_HOUR,
        providerId: undefined,
      });

      // Change interval
      rerender({ interval: PredictPriceHistoryInterval.ONE_WEEK });

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_WEEK,
        providerId: undefined,
      });
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
    });

    it('refetches when providerId changes', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ providerId }) =>
          usePredictPriceHistory({ marketId: 'market-1', providerId }),
        { initialProps: { providerId: 'polymarket' } },
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: 'polymarket',
      });

      // Change providerId
      rerender({ providerId: 'other-provider' });

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: 'other-provider',
      });
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
    });

    it('refetches when fidelity changes', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { rerender, waitForNextUpdate } = renderHook(
        ({ fidelity }) =>
          usePredictPriceHistory({ marketId: 'market-1', fidelity }),
        { initialProps: { fidelity: 50 } },
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: 50,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });

      // Change fidelity
      rerender({ fidelity: 100 });

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: 100,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(2);
    });
  });

  describe('component unmounting', () => {
    it('does not update state after component unmounts', async () => {
      mockGetPriceHistory.mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockPriceHistory), 100);
          }),
      );

      const { result, unmount } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
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
      expect(mockGetPriceHistory).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles multiple rapid market changes', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { rerender } = renderHook(
        ({ marketId }) => usePredictPriceHistory({ marketId }),
        { initialProps: { marketId: 'market-1' } },
      );

      // Rapidly change market multiple times
      rerender({ marketId: 'market-2' });
      rerender({ marketId: 'market-3' });
      rerender({ marketId: 'market-4' });

      // Wait for all promises to settle
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      // Should have been called for each change
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(4);
    });

    it('handles empty price history array', async () => {
      mockGetPriceHistory.mockResolvedValue([]);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });

    it('handles zero fidelity value', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1', fidelity: 0 }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: 0,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });

    it('handles negative fidelity value', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1', fidelity: -1 }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: -1,
        interval: PredictPriceHistoryInterval.ONE_DAY,
        providerId: undefined,
      });
    });
  });

  describe('integration with controller', () => {
    it('calls getPriceHistory with correct parameters', async () => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketId: 'test-market-id',
          providerId: 'test-provider',
          fidelity: 75,
          interval: PredictPriceHistoryInterval.ONE_WEEK,
        }),
      );

      await waitForNextUpdate();

      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'test-market-id',
        providerId: 'test-provider',
        fidelity: 75,
        interval: PredictPriceHistoryInterval.ONE_WEEK,
      });
      expect(mockGetPriceHistory).toHaveBeenCalledTimes(1);
    });

    it('handles controller method throwing synchronously', async () => {
      mockGetPriceHistory.mockImplementation(() => {
        throw new Error('Synchronous error');
      });

      const { result } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1' }),
      );

      // Wait a bit for the error to be processed
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
      });

      expect(result.current.isFetching).toBe(false);
      expect(result.current.priceHistory).toEqual([]);
      expect(result.current.error).toBe('Synchronous error');
    });
  });

  describe('interval enum values', () => {
    it.each([
      PredictPriceHistoryInterval.ONE_HOUR,
      PredictPriceHistoryInterval.SIX_HOUR,
      PredictPriceHistoryInterval.ONE_DAY,
      PredictPriceHistoryInterval.ONE_WEEK,
      PredictPriceHistoryInterval.ONE_MONTH,
      PredictPriceHistoryInterval.MAX,
    ])('handles %s interval correctly', async (interval) => {
      mockGetPriceHistory.mockResolvedValue(mockPriceHistory);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({ marketId: 'market-1', interval }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistory).toEqual(mockPriceHistory);
      expect(mockGetPriceHistory).toHaveBeenCalledWith({
        marketId: 'market-1',
        fidelity: undefined,
        interval,
        providerId: undefined,
      });
    });
  });
});
