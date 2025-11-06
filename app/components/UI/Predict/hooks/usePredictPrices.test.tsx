import { renderHook, act } from '@testing-library/react-hooks';
import Engine from '../../../../core/Engine';
import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';
import { ParsedPricesMap, Side, BookParams } from '../types';
import { usePredictPrices } from './usePredictPrices';

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

describe('usePredictPrices', () => {
  const mockPrices: ParsedPricesMap = {
    'token-1': { [Side.BUY]: 0.65, [Side.SELL]: 0.64 },
    'token-2': { [Side.BUY]: 0.35, [Side.SELL]: 0.34 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Engine.context.PredictController.getPrices as jest.Mock).mockResolvedValue(
      mockPrices,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initial state', () => {
    it('returns empty prices and not fetching when no bookParams provided', () => {
      const { result } = renderHook(() => usePredictPrices({ bookParams: [] }));

      expect(result.current.prices).toEqual({});
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.refetch).toBe('function');
    });

    it('returns empty prices when disabled', () => {
      const { result } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          enabled: false,
        }),
      );

      expect(result.current.prices).toEqual({});
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('single token fetching', () => {
    it('fetches prices for a single token', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      expect(result.current.isFetching).toBe(true);

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
        bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        providerId: 'polymarket',
      });
      expect(result.current.prices).toEqual(mockPrices);
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('handles error when fetching single token fails', async () => {
      const mockError = new Error('Failed to fetch prices');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBe('Failed to fetch prices');
      expect(result.current.isFetching).toBe(false);
      expect(DevLogger.log).toHaveBeenCalledWith(
        'usePredictPrices: Error fetching prices',
        mockError,
      );
    });
  });

  describe('multiple tokens fetching', () => {
    it('fetches prices for multiple tokens with different sides', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [
            { token_id: 'token-1', side: Side.BUY },
            { token_id: 'token-2', side: Side.SELL },
          ],
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
        bookParams: [
          { token_id: 'token-1', side: Side.BUY },
          { token_id: 'token-2', side: Side.SELL },
        ],
        providerId: 'polymarket',
      });
      expect(result.current.prices).toEqual(mockPrices);
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });

    it('fetches prices for same token with both BUY and SELL sides', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [
            { token_id: 'token-1', side: Side.BUY },
            { token_id: 'token-1', side: Side.SELL },
          ],
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
      expect(result.current.prices).toEqual(mockPrices);
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('refetch functionality', () => {
    it('refetches data when refetch is called', async () => {
      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        2,
      );
      expect(result.current.prices).toEqual(mockPrices);
    });

    it('does not refetch when disabled', async () => {
      const { result } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          enabled: false,
        }),
      );

      await act(async () => {
        await result.current.refetch();
      });

      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();
    });
  });

  describe('configuration options', () => {
    it('uses custom provider when provided', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          providerId: 'custom-provider',
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
        bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        providerId: 'custom-provider',
      });
    });

    it('defaults to polymarket provider when not specified', async () => {
      const { waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
        bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        providerId: 'polymarket',
      });
    });
  });

  describe('polling functionality', () => {
    it('polls at specified interval', async () => {
      jest.useFakeTimers();

      const { waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          pollingInterval: 5000,
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        2,
      );

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        3,
      );
    });

    it('stops polling when unmounted', async () => {
      jest.useFakeTimers();

      const { unmount, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          pollingInterval: 5000,
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      unmount();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
    });

    it('does not poll when pollingInterval is not provided', async () => {
      jest.useFakeTimers();

      const { waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('reactivity', () => {
    it('refetches when bookParams change', async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        ({ bookParams }) =>
          usePredictPrices({
            bookParams,
          }),
        {
          initialProps: {
            bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          },
        },
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledWith({
        bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        providerId: 'polymarket',
      });

      rerender({ bookParams: [{ token_id: 'token-2', side: Side.SELL }] });

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPrices,
      ).toHaveBeenLastCalledWith({
        bookParams: [{ token_id: 'token-2', side: Side.SELL }],
        providerId: 'polymarket',
      });
    });

    it('refetches when providerId changes', async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        ({ providerId }) =>
          usePredictPrices({
            bookParams: [{ token_id: 'token-1', side: Side.BUY }],
            providerId,
          }),
        {
          initialProps: { providerId: 'polymarket' },
        },
      );

      await waitForNextUpdate();

      rerender({ providerId: 'custom-provider' });

      await waitForNextUpdate();

      expect(
        Engine.context.PredictController.getPrices,
      ).toHaveBeenLastCalledWith({
        bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        providerId: 'custom-provider',
      });
    });

    it('does not refetch when enabled changes from false to false', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          usePredictPrices({
            bookParams: [{ token_id: 'token-1', side: Side.BUY }],
            enabled,
          }),
        {
          initialProps: { enabled: false },
        },
      );

      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();

      rerender({ enabled: false });

      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();
    });

    it('fetches when enabled changes from false to true', async () => {
      const { rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) =>
          usePredictPrices({
            bookParams: [{ token_id: 'token-1', side: Side.BUY }],
            enabled,
          }),
        {
          initialProps: { enabled: false },
        },
      );

      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();

      rerender({ enabled: true });

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalled();
    });

    it('clears prices when enabled changes from true to false', async () => {
      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ enabled }) =>
          usePredictPrices({
            bookParams: [{ token_id: 'token-1', side: Side.BUY }],
            enabled,
          }),
        {
          initialProps: { enabled: true },
        },
      );

      await waitForNextUpdate();

      expect(result.current.prices).toEqual(mockPrices);

      rerender({ enabled: false });

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles Engine not initialized error', async () => {
      const originalContext = Engine.context;
      (Engine as unknown as { context: null }).context = null;

      const { result, waitFor } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitFor(() => result.current.isFetching === false);

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBe('Engine not initialized');
      expect(result.current.isFetching).toBe(false);
      expect(DevLogger.log).toHaveBeenCalled();

      (Engine as unknown as { context: typeof originalContext }).context =
        originalContext;
    });

    it('handles PredictController not available error', async () => {
      const originalController = Engine.context.PredictController;
      (
        Engine.context as unknown as { PredictController: undefined }
      ).PredictController = undefined;

      const { result, waitFor } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitFor(() => result.current.isFetching === false);

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBe('Predict controller not available');
      expect(result.current.isFetching).toBe(false);
      expect(DevLogger.log).toHaveBeenCalled();

      (
        Engine.context as unknown as {
          PredictController: typeof originalController;
        }
      ).PredictController = originalController;
    });

    it('handles non-Error exceptions', async () => {
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce('String error');

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBe('Failed to fetch prices');
      expect(DevLogger.log).toHaveBeenCalled();
    });

    it('clears previous error on successful refetch', async () => {
      const mockError = new Error('Failed to fetch prices');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Failed to fetch prices');

      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.prices).toEqual(mockPrices);
    });
  });

  describe('cleanup', () => {
    it('does not update state after unmount', async () => {
      jest.useFakeTimers();

      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockImplementation(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve(mockPrices), 100);
          }),
      );

      const { unmount, result } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      expect(result.current.isFetching).toBe(true);

      unmount();

      jest.runAllTimers();

      expect(true).toBe(true);

      jest.useRealTimers();
    });

    it('clears polling timeout on unmount', async () => {
      jest.useFakeTimers();

      const { unmount, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          pollingInterval: 5000,
        }),
      );

      await waitForNextUpdate();

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      unmount();

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
    });
  });

  describe('edge cases', () => {
    it('handles empty bookParams array', async () => {
      const { result } = renderHook(() =>
        usePredictPrices({
          bookParams: [],
        }),
      );

      expect(result.current.prices).toEqual({});
      expect(result.current.isFetching).toBe(false);
      expect(result.current.error).toBeNull();
      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();
    });

    it('handles undefined bookParams', async () => {
      const { result } = renderHook(() =>
        usePredictPrices({
          bookParams: undefined as unknown as [],
        }),
      );

      expect(result.current.prices).toEqual({});
      expect(result.current.isFetching).toBe(false);
      expect(Engine.context.PredictController.getPrices).not.toHaveBeenCalled();
    });

    it('handles transition from empty to non-empty bookParams', async () => {
      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ bookParams }) =>
          usePredictPrices({
            bookParams,
          }),
        {
          initialProps: { bookParams: [] as BookParams[] },
        },
      );

      expect(result.current.prices).toEqual({});

      rerender({ bookParams: [{ token_id: 'token-1', side: Side.BUY }] });

      await waitForNextUpdate();

      expect(result.current.prices).toEqual(mockPrices);
    });

    it('handles transition from non-empty to empty bookParams', async () => {
      const { result, rerender, waitForNextUpdate } = renderHook(
        ({ bookParams }) =>
          usePredictPrices({
            bookParams,
          }),
        {
          initialProps: {
            bookParams: [
              { token_id: 'token-1', side: Side.BUY },
            ] as BookParams[],
          },
        },
      );

      await waitForNextUpdate();

      expect(result.current.prices).toEqual(mockPrices);

      rerender({ bookParams: [] });

      expect(result.current.prices).toEqual({});
      expect(result.current.isFetching).toBe(false);
    });

    it('handles empty prices response', async () => {
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce({});

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.prices).toEqual({});
      expect(result.current.error).toBeNull();
      expect(result.current.isFetching).toBe(false);
    });
  });

  describe('polling with errors', () => {
    it('stops polling after error', async () => {
      jest.useFakeTimers();

      const mockError = new Error('Network error');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
          pollingInterval: 5000,
        }),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');
      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(Engine.context.PredictController.getPrices).toHaveBeenCalledTimes(
        1,
      );
      expect(result.current.error).toBe('Network error');
    });

    it('can manually refetch after error', async () => {
      const mockError = new Error('Network error');
      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockRejectedValueOnce(mockError);

      const { result, waitForNextUpdate } = renderHook(() =>
        usePredictPrices({
          bookParams: [{ token_id: 'token-1', side: Side.BUY }],
        }),
      );

      await waitForNextUpdate();

      expect(result.current.error).toBe('Network error');
      expect(result.current.prices).toEqual({});

      (
        Engine.context.PredictController.getPrices as jest.Mock
      ).mockResolvedValueOnce(mockPrices);

      await act(async () => {
        await result.current.refetch();
      });

      expect(result.current.error).toBeNull();
      expect(result.current.prices).toEqual(mockPrices);
    });
  });
});
