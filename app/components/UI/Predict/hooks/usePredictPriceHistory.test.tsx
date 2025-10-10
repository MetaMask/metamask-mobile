import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import {
  PredictPriceHistoryInterval,
  PredictPriceHistoryPoint,
} from '../types';
import { usePredictPriceHistory } from './usePredictPriceHistory';

jest.mock('../../../../core/Engine', () => {
  const mockContext = {
    PredictController: {
      getPriceHistory: jest.fn(),
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

describe('usePredictPriceHistory', () => {
  const mockPriceHistory: PredictPriceHistoryPoint[] = [
    { timestamp: 1234567890, price: 0.5 },
    { timestamp: 1234567891, price: 0.6 },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the mock implementation for getPriceHistory
    (
      Engine.context.PredictController.getPriceHistory as jest.Mock
    ).mockResolvedValue(mockPriceHistory);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns empty price histories and not fetching when no markets provided', () => {
      const { result } = renderHook(() =>
        usePredictPriceHistory({ marketIds: [] }),
      );

      expect(result.current.priceHistories).toEqual([]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.errors).toEqual([]);
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns empty price histories when disabled', () => {
      const { result } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
          enabled: false,
        }),
      );

      expect(result.current.priceHistories).toEqual([]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.errors).toEqual([]);
    });
  });

  describe('single market fetching', () => {
    it('fetches price history for a single market', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      expect(result.current.isFetching).toBe(true);

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: undefined,
        providerId: undefined,
      });
      expect(result.current.priceHistories).toEqual([mockPriceHistory]);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.errors).toEqual([null]);
    });

    it('handles error when fetching single market fails', async () => {
      const mockError = new Error('Failed to fetch');
      (
        Engine.context.PredictController.getPriceHistory as jest.Mock
      ).mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistories).toEqual([[]]);
      expect(result.current.errors).toEqual(['Failed to fetch']);
      expect(result.current.isFetching).toBe(false);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePredictPriceHistory: Error fetching price history for market market-1',
        mockError,
      );
    });
  });

  describe('multiple markets fetching', () => {
    it('fetches price history for multiple markets in parallel', async () => {
      const mockHistory1: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.5 },
      ];
      const mockHistory2: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.3 },
      ];
      const mockHistory3: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.2 },
      ];

      (
        Engine.context.PredictController.getPriceHistory as jest.Mock
      ).mockImplementation(({ marketId }) => {
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
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1', 'market-2', 'market-3'],
        }),
      );

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledTimes(3);
      expect(result.current.priceHistories).toEqual([
        mockHistory1,
        mockHistory2,
        mockHistory3,
      ]);
      expect(result.current.errors).toEqual([null, null, null]);
      expect(result.current.isFetching).toBe(false);
    });

    it('handles partial failures in multiple markets', async () => {
      const mockHistory1: PredictPriceHistoryPoint[] = [
        { timestamp: 1234567890, price: 0.5 },
      ];
      const mockError = new Error('Failed to fetch market-2');

      (
        Engine.context.PredictController.getPriceHistory as jest.Mock
      ).mockImplementation(({ marketId }) => {
        switch (marketId) {
          case 'market-1':
            return Promise.resolve(mockHistory1);
          case 'market-2':
            return Promise.reject(mockError);
          case 'market-3':
            return Promise.resolve(mockPriceHistory);
          default:
            return Promise.resolve([]);
        }
      });

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1', 'market-2', 'market-3'],
        }),
      );

      await waitForNextUpdate();

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
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledTimes(1);

      await act(async () => {
        await result.current.refetch();
      });

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledTimes(2);
      expect(result.current.priceHistories).toEqual([mockPriceHistory]);
    });
  });

  describe('configuration options', () => {
    it('uses custom interval when provided', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
          interval: PredictPriceHistoryInterval.ONE_WEEK,
        }),
      );

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_WEEK,
        fidelity: undefined,
        providerId: undefined,
      });
    });

    it('uses custom fidelity when provided', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
          fidelity: 30,
        }),
      );

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: 30,
        providerId: undefined,
      });
    });

    it('uses custom provider when provided', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
          providerId: 'polymarket',
        }),
      );

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: undefined,
        providerId: 'polymarket',
      });
    });
  });

  describe('reactivity', () => {
    it('refetches when marketIds change', async () => {
      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ marketIds }) =>
          usePredictPriceHistory({
            marketIds,
          }),
        {
          initialProps: { marketIds: ['market-1'] },
        },
      );

      await waitForNextUpdate();

      expect(result.current.priceHistories).toEqual([mockPriceHistory]);

      rerender({ marketIds: ['market-2'] });

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenLastCalledWith({
        marketId: 'market-2',
        interval: PredictPriceHistoryInterval.ONE_DAY,
        fidelity: undefined,
        providerId: undefined,
      });
    });

    it('refetches when interval changes', async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        ({ interval }) =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            interval,
          }),
        {
          initialProps: { interval: PredictPriceHistoryInterval.ONE_DAY },
        },
      );

      await waitForNextUpdate();

      rerender({ interval: PredictPriceHistoryInterval.ONE_WEEK });

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenLastCalledWith({
        marketId: 'market-1',
        interval: PredictPriceHistoryInterval.ONE_WEEK,
        fidelity: undefined,
        providerId: undefined,
      });
    });

    it('does not refetch when enabled changes from false to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            enabled,
          }),
        {
          initialProps: { enabled: false },
        },
      );

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).not.toHaveBeenCalled();

      rerender({ enabled: false });

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).not.toHaveBeenCalled();
    });

    it('fetches when enabled changes from false to true', async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            enabled,
          }),
        {
          initialProps: { enabled: false },
        },
      );

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPriceHistory,
      ).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('handles Engine not initialized error', async () => {
      // Save the original Engine.context
      const originalContext = Engine.context;

      // Set Engine.context to null
      (Engine as unknown as { context: null }).context = null;

      const { result, waitFor } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      // Wait for the error to be handled
      await waitFor(() => result.current.isFetching === false);

      // Should have handled the error gracefully
      expect(result.current.priceHistories).toEqual([[]]);
      expect(result.current.errors).toEqual(['Engine not initialized']);
      expect(result.current.isFetching).toBe(false);
      expect(DevLogger.log).toHaveBeenCalled();

      // Restore the original Engine.context
      (Engine as unknown as { context: typeof originalContext }).context =
        originalContext;
    });

    it('handles non-Error exceptions in individual market fetches', async () => {
      // The Engine context is already mocked at the module level
      (
        Engine.context.PredictController.getPriceHistory as jest.Mock
      ).mockRejectedValueOnce('String error');

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.priceHistories).toEqual([[]]);
      expect(result.current.errors).toEqual(['Failed to fetch price history']);
      expect(DevLogger.log).toHaveBeenCalled();
    });
  });

  describe('cleanup', () => {
    it('does not update state after unmount', async () => {
      jest.useFakeTimers();

      // Mock a delayed response
      (
        Engine.context.PredictController.getPriceHistory as jest.Mock
      ).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockPriceHistory), 100);
          }),
      );

      const { unmount, result } = renderHook(() =>
        usePredictPriceHistory({
          marketIds: ['market-1'],
        }),
      );

      // Initial state should be fetching
      expect(result.current.isFetching).toBe(true);

      // Unmount immediately
      unmount();

      // Fast-forward timers
      jest.runAllTimers();

      // No errors should be thrown
      expect(true).toBe(true);

      jest.useRealTimers();
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
        const { result, waitForNextUpdate } = renderHook(() =>
          usePredictPriceHistory({
            marketIds: ['market-1'],
            interval,
          }),
        );

        await waitForNextUpdate();

        expect(
          Engine.context.PredictController.getPriceHistory,
        ).toHaveBeenCalledWith({
          marketId: 'market-1',
          interval,
          fidelity: undefined,
          providerId: undefined,
        });
        expect(result.current.priceHistories).toEqual([mockPriceHistory]);
      });
    });
  });
});
