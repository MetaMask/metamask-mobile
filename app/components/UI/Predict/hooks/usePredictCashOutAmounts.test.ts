import { act, renderHook, waitFor } from '@testing-library/react-native';
import { usePredictCashOutAmounts } from './usePredictCashOutAmounts';
import { PredictPosition, PredictPositionStatus } from '../types';
import { CalculateCashOutAmountsResponse } from '../providers/types';

// Mock dependencies
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: jest.fn(),
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));

import { usePredictTrading } from './usePredictTrading';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

describe('usePredictCashOutAmounts', () => {
  const mockUsePredictTrading = usePredictTrading as jest.MockedFunction<
    typeof usePredictTrading
  >;
  const mockUseSelector = useSelector as jest.MockedFunction<
    typeof useSelector
  >;
  const mockCalculateCashOutAmounts = jest.fn();

  const mockPosition: PredictPosition = {
    id: 'position123',
    providerId: 'polymarket',
    marketId: 'market123',
    outcomeId: 'outcome123',
    outcome: 'Test Outcome',
    outcomeTokenId: 'token123',
    currentValue: 150,
    title: 'Test Position',
    icon: 'icon.png',
    amount: 100,
    price: 1.0,
    status: PredictPositionStatus.OPEN,
    size: 100,
    outcomeIndex: 0,
    percentPnl: 50,
    cashPnl: 50,
    claimable: true,
    initialValue: 100,
    avgPrice: 1.0,
    endDate: '2024-12-31',
  };

  const mockCalculateCashOutAmountsResponse: CalculateCashOutAmountsResponse = {
    currentValue: 200,
    cashPnl: 75,
    percentPnl: 75,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockUsePredictTrading.mockReturnValue({
      getPositions: jest.fn(),
      placeOrder: jest.fn(),
      claim: jest.fn(),
      calculateBetAmounts: jest.fn(),
      calculateCashOutAmounts: mockCalculateCashOutAmounts,
    });

    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return '0x123456789abcdef';
      }
      return undefined;
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns initial state with position values', () => {
    const { result } = renderHook(() =>
      usePredictCashOutAmounts({ position: mockPosition }),
    );

    expect(result.current.cashOutAmounts).toEqual({
      cashPnl: mockPosition.cashPnl,
      percentPnl: mockPosition.percentPnl,
      currentValue: mockPosition.currentValue,
    });
    expect(result.current.isCalculating).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('calculates cash out amounts after debounce timeout', async () => {
    mockCalculateCashOutAmounts.mockResolvedValue(
      mockCalculateCashOutAmountsResponse,
    );

    const { result } = renderHook(() =>
      usePredictCashOutAmounts({ position: mockPosition }),
    );

    // Initial state should be position values
    expect(result.current.cashOutAmounts).toEqual({
      cashPnl: mockPosition.cashPnl,
      percentPnl: mockPosition.percentPnl,
      currentValue: mockPosition.currentValue,
    });

    // Fast-forward past debounce timeout
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.cashOutAmounts).toEqual(
        mockCalculateCashOutAmountsResponse,
      );
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledWith({
      address: '0x123456789abcdef',
      providerId: mockPosition.providerId,
      outcomeTokenId: mockPosition.outcomeTokenId,
      marketId: mockPosition.marketId,
    });
  });

  it('sets calculating state during calculation', async () => {
    // Create a promise that will be resolved manually
    let resolvePromise: (value: CalculateCashOutAmountsResponse) => void;
    const pendingPromise = new Promise<CalculateCashOutAmountsResponse>(
      (resolve) => {
        resolvePromise = resolve;
      },
    );

    mockCalculateCashOutAmounts.mockReturnValue(pendingPromise);

    const { result } = renderHook(() =>
      usePredictCashOutAmounts({ position: mockPosition }),
    );

    // Trigger calculation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Should be calculating
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(true);
    });

    // Resolve calculation
    act(() => {
      resolvePromise(mockCalculateCashOutAmountsResponse);
    });

    // Should not be calculating anymore
    await waitFor(() => {
      expect(result.current.isCalculating).toBe(false);
    });
  });

  it('handles calculation errors', async () => {
    const mockError = new Error('Calculation failed');
    mockCalculateCashOutAmounts.mockRejectedValue(mockError);

    const { result } = renderHook(() =>
      usePredictCashOutAmounts({ position: mockPosition }),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBe(mockError.message);
    });
    expect(result.current.isCalculating).toBe(false);
    expect(mockCalculateCashOutAmounts).toHaveBeenCalled();
  });

  it('throws error when no selected internal account address', async () => {
    mockUseSelector.mockImplementation(() => null);

    const { result } = renderHook(() =>
      usePredictCashOutAmounts({ position: mockPosition }),
    );

    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(result.current.error).toBe('No selected internal account address');
    });
    expect(mockCalculateCashOutAmounts).not.toHaveBeenCalled();
  });

  it('auto-refreshes when autoRefreshTimeout is provided', async () => {
    mockCalculateCashOutAmounts.mockResolvedValue(
      mockCalculateCashOutAmountsResponse,
    );

    const autoRefreshTimeout = 5000;

    renderHook(() =>
      usePredictCashOutAmounts({
        position: mockPosition,
        autoRefreshTimeout,
      }),
    );

    // Initial calculation after debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);

    // First auto-refresh
    act(() => {
      jest.advanceTimersByTime(autoRefreshTimeout);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(2);

    // Second auto-refresh
    act(() => {
      jest.advanceTimersByTime(autoRefreshTimeout);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(3);
  });

  it('does not auto-refresh when autoRefreshTimeout is not provided', async () => {
    mockCalculateCashOutAmounts.mockResolvedValue(
      mockCalculateCashOutAmountsResponse,
    );

    renderHook(() => usePredictCashOutAmounts({ position: mockPosition }));

    // Initial calculation after debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);

    // Advance time significantly - should not trigger auto-refresh
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);
  });

  it('cleans up timers on unmount', () => {
    mockCalculateCashOutAmounts.mockResolvedValue(
      mockCalculateCashOutAmountsResponse,
    );

    const { unmount } = renderHook(() =>
      usePredictCashOutAmounts({
        position: mockPosition,
        autoRefreshTimeout: 5000,
      }),
    );

    // Initial calculation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);

    unmount();

    // Advance time - should not trigger more calculations since timers are cleaned up
    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);
  });

  it('re-calculates when position changes', async () => {
    mockCalculateCashOutAmounts.mockResolvedValue(
      mockCalculateCashOutAmountsResponse,
    );

    const { rerender } = renderHook(
      ({ position }) => usePredictCashOutAmounts({ position }),
      {
        initialProps: { position: mockPosition },
      },
    );

    // Initial calculation
    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(1);

    const newPosition = { ...mockPosition, marketId: 'newMarket123' };
    rerender({ position: newPosition });

    // Should trigger new calculation after debounce
    act(() => {
      jest.advanceTimersByTime(300);
    });

    await waitFor(() => {
      expect(mockCalculateCashOutAmounts).toHaveBeenCalledTimes(2);
    });

    expect(mockCalculateCashOutAmounts).toHaveBeenLastCalledWith({
      address: '0x123456789abcdef',
      providerId: newPosition.providerId,
      outcomeTokenId: newPosition.outcomeTokenId,
      marketId: newPosition.marketId,
    });
  });
});
