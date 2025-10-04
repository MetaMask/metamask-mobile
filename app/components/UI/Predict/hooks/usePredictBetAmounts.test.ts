import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePredictBetAmounts } from './usePredictBetAmounts';
import { PredictOutcomeToken } from '../types';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      calculateBetAmounts: jest.fn(),
    },
  },
}));

import Engine from '../../../../core/Engine';

describe('usePredictBetAmounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial state correctly', () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    const { result } = renderHook(() =>
      usePredictBetAmounts({
        outcomeToken: mockOutcomeToken,
        providerId: 'polymarket',
        userBetAmount: 100,
      }),
    );

    expect(result.current.betAmounts).toEqual({
      toWin: 0,
      sharePrice: mockOutcomeToken.price,
    });
    expect(result.current.isCalculating).toBe(false);
  });

  it('calculates bet amounts when userBetAmount changes', async () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    (
      Engine.context.PredictController.calculateBetAmounts as jest.Mock
    ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

    const { result } = renderHook(() =>
      usePredictBetAmounts({
        outcomeToken: mockOutcomeToken,
        providerId: 'polymarket',
        userBetAmount: 100,
      }),
    );

    // Wait for debounce timer
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.betAmounts).toEqual({
        toWin: 150,
        sharePrice: 0.5,
      });
      expect(result.current.isCalculating).toBe(false);
    });

    expect(
      Engine.context.PredictController.calculateBetAmounts,
    ).toHaveBeenCalledWith({
      providerId: 'polymarket',
      outcomeTokenId: mockOutcomeToken.id,
      userBetAmount: 100,
    });
  });

  it('does not calculate when userBetAmount is 0 or negative', () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    const { result } = renderHook(() =>
      usePredictBetAmounts({
        outcomeToken: mockOutcomeToken,
        providerId: 'polymarket',
        userBetAmount: 0,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(result.current.betAmounts).toEqual({ toWin: 0, sharePrice: 0.5 });
    expect(result.current.isCalculating).toBe(false);
    expect(
      Engine.context.PredictController.calculateBetAmounts,
    ).not.toHaveBeenCalled();
  });

  it('handles calculation errors gracefully', async () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    (
      Engine.context.PredictController.calculateBetAmounts as jest.Mock
    ).mockRejectedValue(new Error('API Error'));

    const { result } = renderHook(() =>
      usePredictBetAmounts({
        outcomeToken: mockOutcomeToken,
        providerId: 'polymarket',
        userBetAmount: 100,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.betAmounts).toEqual({
        toWin: 0,
        sharePrice: mockOutcomeToken.price,
      });
      expect(result.current.isCalculating).toBe(false);
    });

    expect(
      Engine.context.PredictController.calculateBetAmounts,
    ).toHaveBeenCalled();
  });

  it('debounces calculation calls', async () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    (
      Engine.context.PredictController.calculateBetAmounts as jest.Mock
    ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

    const { rerender } = renderHook(
      ({ userBetAmount }: { userBetAmount: number }) =>
        usePredictBetAmounts({
          outcomeToken: mockOutcomeToken,
          providerId: 'polymarket',
          userBetAmount,
        }),
      {
        initialProps: { userBetAmount: 100 },
      },
    );

    // Change amount multiple times quickly
    rerender({ userBetAmount: 200 });
    rerender({ userBetAmount: 300 });

    // Advance timer by less than debounce time
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Should not have called the function yet
    expect(
      Engine.context.PredictController.calculateBetAmounts,
    ).not.toHaveBeenCalled();

    // Advance timer to complete debounce
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
        outcomeTokenId: mockOutcomeToken.id,
        userBetAmount: 300,
      });
    });
  });

  it('sets isCalculating to true during calculation', async () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    // Create a promise that doesn't resolve immediately
    let resolvePromise: (value: { toWin: number; sharePrice: number }) => void;
    const calculationPromise = new Promise<{
      toWin: number;
      sharePrice: number;
    }>((resolve) => {
      resolvePromise = resolve;
    });

    (
      Engine.context.PredictController.calculateBetAmounts as jest.Mock
    ).mockReturnValue(calculationPromise);

    const { result } = renderHook(() =>
      usePredictBetAmounts({
        outcomeToken: mockOutcomeToken,
        providerId: 'polymarket',
        userBetAmount: 100,
      }),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be calculating
    expect(result.current.isCalculating).toBe(true);

    // Resolve the promise
    act(() => {
      resolvePromise({ toWin: 150, sharePrice: 0.5 });
    });

    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
      expect(result.current.betAmounts).toEqual({
        toWin: 150,
        sharePrice: 0.5,
      });
    });
  });

  it('cancels previous calculation when userBetAmount changes during debounce', async () => {
    const mockOutcomeToken: PredictOutcomeToken = {
      id: 'token123',
      title: 'Test Token',
      price: 0.5,
    };

    (
      Engine.context.PredictController.calculateBetAmounts as jest.Mock
    ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

    const { rerender } = renderHook(
      ({ userBetAmount }: { userBetAmount: number }) =>
        usePredictBetAmounts({
          outcomeToken: mockOutcomeToken,
          providerId: 'polymarket',
          userBetAmount,
        }),
      {
        initialProps: { userBetAmount: 100 },
      },
    );

    // Start debounce timer (advance partially)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Change amount before first calculation executes
    rerender({ userBetAmount: 200 });

    // Complete the debounce for the new amount
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledTimes(1);
      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledWith({
        providerId: 'polymarket',
        outcomeTokenId: mockOutcomeToken.id,
        userBetAmount: 200,
      });
    });
  });

  describe('autoRefreshTimeout', () => {
    it('does not auto-refresh when autoRefreshTimeout is not set', async () => {
      const mockOutcomeToken: PredictOutcomeToken = {
        id: 'token123',
        title: 'Test Token',
        price: 0.5,
      };

      (
        Engine.context.PredictController.calculateBetAmounts as jest.Mock
      ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

      const { result } = renderHook(() =>
        usePredictBetAmounts({
          outcomeToken: mockOutcomeToken,
          providerId: 'polymarket',
          userBetAmount: 100,
        }),
      );

      // Wait for initial calculation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.betAmounts).toEqual({
          toWin: 150,
          sharePrice: 0.5,
        });
      });

      // Advance time significantly, should not trigger additional calculations
      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledTimes(1);
    });

    it('auto-refreshes when autoRefreshTimeout is set', async () => {
      const mockOutcomeToken: PredictOutcomeToken = {
        id: 'token123',
        title: 'Test Token',
        price: 0.5,
      };

      (
        Engine.context.PredictController.calculateBetAmounts as jest.Mock
      ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

      const { result } = renderHook(() =>
        usePredictBetAmounts({
          outcomeToken: mockOutcomeToken,
          providerId: 'polymarket',
          userBetAmount: 100,
          autoRefreshTimeout: 1000,
        }),
      );

      // Wait for initial calculation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(result.current.betAmounts).toEqual({
          toWin: 150,
          sharePrice: 0.5,
        });
      });

      // Advance time to trigger first auto-refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenCalledTimes(2);
      });

      // Advance time to trigger second auto-refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenCalledTimes(3);
      });
    });

    it('restarts auto-refresh timeout when calculation is triggered by dependency change', async () => {
      const mockOutcomeToken: PredictOutcomeToken = {
        id: 'token123',
        title: 'Test Token',
        price: 0.5,
      };

      (
        Engine.context.PredictController.calculateBetAmounts as jest.Mock
      ).mockResolvedValue({ toWin: 150, sharePrice: 0.5 });

      const { rerender } = renderHook(
        ({ userBetAmount }: { userBetAmount: number }) =>
          usePredictBetAmounts({
            outcomeToken: mockOutcomeToken,
            providerId: 'polymarket',
            userBetAmount,
            autoRefreshTimeout: 1000,
          }),
        {
          initialProps: { userBetAmount: 100 },
        },
      );

      // Wait for initial calculation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenCalledTimes(1);
      });

      // Advance time partially towards first auto-refresh
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Change amount, which should restart the timeout
      rerender({ userBetAmount: 200 });

      // Wait for the new calculation (debounced)
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenCalledTimes(2);
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenLastCalledWith({
          providerId: 'polymarket',
          outcomeTokenId: mockOutcomeToken.id,
          userBetAmount: 200,
        });
      });

      // Advance time to what would have been the first auto-refresh time
      // Since timeout was restarted, this should not trigger another call yet
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Should still only have 2 calls (no auto-refresh yet)
      expect(
        Engine.context.PredictController.calculateBetAmounts,
      ).toHaveBeenCalledTimes(2);

      // Now advance enough time for the restarted auto-refresh to trigger
      act(() => {
        jest.advanceTimersByTime(500);
      });

      await waitFor(() => {
        expect(
          Engine.context.PredictController.calculateBetAmounts,
        ).toHaveBeenCalledTimes(3);
      });
    });
  });
});
