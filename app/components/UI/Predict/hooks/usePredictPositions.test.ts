import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePredictPositions } from './usePredictPositions';
import { usePredictTrading } from './usePredictTrading';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

// Mock Engine with AccountTreeController - MUST BE FIRST
jest.mock('../../../../core/Engine', () => ({
  context: {
    AccountTreeController: {
      getAccountsFromSelectedAccountGroup: jest.fn(() => [
        {
          id: 'test-account-id',
          address: '0x1234567890123456789012345678901234567890',
          type: 'eip155:eoa',
          name: 'Test Account',
          metadata: {
            lastSelected: 0,
          },
        },
      ]),
    },
  },
}));

// Mock dependencies
jest.mock('./usePredictTrading');
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: jest.fn(() => ({
    ensurePolygonNetworkExists: jest.fn().mockResolvedValue(undefined),
  })),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));
jest.mock('react-redux', () => ({
  useSelector: jest.fn(),
}));
jest.mock('../../../../selectors/accountsController', () => ({
  selectSelectedInternalAccountAddress: jest.fn(),
}));
jest.mock('../selectors/predictController', () => ({
  selectPredictClaimablePositionsByAddress: jest.fn(),
}));

describe('usePredictPositions', () => {
  const mockGetPositions = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.Mock;
  const mockUseSelector = useSelector as jest.Mock;
  const mockSelectSelectedInternalAccountAddress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockSelectSelectedInternalAccountAddress.mockReturnValue(
      '0x1234567890123456789012345678901234567890',
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return '0x1234567890123456789012345678901234567890';
      }
      // Return empty array for claimable positions selector
      return [];
    });
    (usePredictTrading as jest.Mock).mockReturnValue({
      getPositions: mockGetPositions,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('loads positions on mount by default', async () => {
    mockGetPositions.mockResolvedValue([
      {
        providerId: 'p1',
        marketId: 'm1',
        outcomeId: 'o1',
        size: 2,
        price: 1.2,
        conditionId: 'c1',
        icon: 'icon',
        title: 'Title',
        outcome: 'Yes',
        cashPnl: 10,
        currentValue: 12,
        percentPnl: 5,
        initialValue: 11.5,
        avgPrice: 1.15,
        redeemable: false,
      },
    ]);

    const { result } = renderHook(() => usePredictPositions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      providerId: undefined,
      claimable: false,
    });
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.error).toBe(null);
  });

  it('does not load on mount when loadOnMount is false', () => {
    mockGetPositions.mockResolvedValue([]);

    renderHook(() => usePredictPositions({ loadOnMount: false }));

    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('initializes isLoading to false when loadOnMount is false', () => {
    mockGetPositions.mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePredictPositions({ loadOnMount: false }),
    );

    expect(result.current.isLoading).toBe(false);
    expect(result.current.positions).toEqual([]);
  });

  it('does not report stale data before first load completes', () => {
    mockGetPositions.mockResolvedValue([]);

    const { result } = renderHook(() =>
      usePredictPositions({ loadOnMount: false }),
    );

    expect(result.current.isLoading).toBe(false);
  });

  it('handles errors correctly', async () => {
    const testError = new Error('Failed to load positions');
    mockGetPositions.mockRejectedValue(testError);

    const { result } = renderHook(() => usePredictPositions());

    expect(result.current.isLoading).toBe(true);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load positions');
    expect(result.current.positions).toEqual([]);
  });

  it('refreshes positions with isRefresh flag', async () => {
    mockGetPositions.mockResolvedValue([]);

    const { result } = renderHook(() => usePredictPositions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetPositions.mockClear();
    mockGetPositions.mockResolvedValue([
      {
        providerId: 'p1',
        marketId: 'm1',
        outcomeId: 'o1',
        size: 3,
        price: 1.3,
        conditionId: 'c1',
        icon: 'icon',
        title: 'Title',
        outcome: 'No',
        cashPnl: 20,
        currentValue: 13,
        percentPnl: 8,
        initialValue: 12.5,
        avgPrice: 1.25,
        redeemable: false,
      },
    ]);

    await act(async () => {
      await result.current.loadPositions({ isRefresh: true });
    });

    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      providerId: undefined,
      claimable: false,
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.positions).toHaveLength(1);
  });

  it('loads positions successfully', async () => {
    const positions = [
      {
        providerId: 'p1',
        marketId: 'm1',
        outcomeId: 'o1',
        size: 1,
        price: 1.1,
        conditionId: 'c1',
        icon: 'icon',
        title: 'Title',
        outcome: 'Yes',
        cashPnl: 5,
        currentValue: 11,
        percentPnl: 3,
        initialValue: 10.5,
        avgPrice: 1.05,
        redeemable: false,
      },
    ];
    mockGetPositions.mockResolvedValue(positions);

    const { result } = renderHook(() => usePredictPositions());

    expect(result.current.isLoading).toBe(true);

    // Wait for the async operation to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual(positions);
    expect(result.current.error).toBe(null);
  });

  it('sets up focus effect when refreshOnFocus is true', () => {
    const { result } = renderHook(() =>
      usePredictPositions({ refreshOnFocus: true }),
    );

    expect(mockUseFocusEffect).toHaveBeenCalled();
    expect(result.current.positions).toEqual([]);
  });

  it('still registers focus effect when refreshOnFocus is false (no refresh on focus)', () => {
    const { result } = renderHook(() =>
      usePredictPositions({ refreshOnFocus: false }),
    );

    expect(mockUseFocusEffect).toHaveBeenCalled();
    expect(result.current.positions).toEqual([]);
  });

  it('passes providerId when specified', async () => {
    mockGetPositions.mockResolvedValue([]);

    renderHook(() => usePredictPositions({ providerId: 'polymarket' }));

    await waitFor(() => {
      expect(mockGetPositions).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
        claimable: false,
      });
    });
  });

  it('passes claimable flag when specified', async () => {
    mockGetPositions.mockResolvedValue([]);

    renderHook(() => usePredictPositions({ claimable: true }));

    await waitFor(() => {
      expect(mockGetPositions).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: undefined,
        claimable: true,
      });
    });
  });

  it('calls getPositions with claimable false by default', async () => {
    mockGetPositions.mockResolvedValue([
      {
        providerId: 'p2',
        marketId: 'm2',
        outcomeId: 'o2',
        size: 2,
        price: 1.2,
        conditionId: 'c2',
        icon: 'icon2',
        title: 'Title2',
        outcome: 'No',
        cashPnl: 10,
        currentValue: 12,
        percentPnl: 5,
        initialValue: 11.5,
        avgPrice: 1.15,
        claimable: false,
      },
    ]);

    const { result } = renderHook(() => usePredictPositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should call getPositions with claimable: false by default
    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      providerId: undefined,
      claimable: false,
    });

    // Should return the positions from the provider (filtering now happens in provider)
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0].providerId).toBe('p2');
  });

  it('passes marketId when specified', async () => {
    mockGetPositions.mockResolvedValue([]);

    renderHook(() => usePredictPositions({ marketId: 'market123' }));

    await waitFor(() => {
      expect(mockGetPositions).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: undefined,
        claimable: false,
        marketId: 'market123',
      });
    });
  });

  it('handles non-Error object errors', async () => {
    mockGetPositions.mockRejectedValue('String error message');

    const { result } = renderHook(() => usePredictPositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load positions');
    expect(result.current.positions).toEqual([]);
  });

  describe('autoRefreshTimeout', () => {
    it('does not set up auto-refresh when autoRefreshTimeout is not provided', async () => {
      mockGetPositions.mockResolvedValue([]);

      renderHook(() => usePredictPositions());

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      // Clear mock and advance time
      mockGetPositions.mockClear();
      jest.advanceTimersByTime(5000);

      // Should not call getPositions again
      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('auto-refreshes positions at specified interval', async () => {
      mockGetPositions.mockResolvedValue([]);

      renderHook(() =>
        usePredictPositions({
          autoRefreshTimeout: 1000,
        }),
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      mockGetPositions.mockClear();

      // Advance time by 1 second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should have called getPositions again with isRefresh: true
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      mockGetPositions.mockClear();

      // Advance time by another second
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should have called getPositions again
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });
    });

    it('clears auto-refresh interval on unmount', async () => {
      mockGetPositions.mockResolvedValue([]);

      const { unmount } = renderHook(() =>
        usePredictPositions({
          autoRefreshTimeout: 1000,
        }),
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      mockGetPositions.mockClear();

      // Unmount the hook
      unmount();

      // Advance time
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      // Should not call getPositions after unmount
      expect(mockGetPositions).not.toHaveBeenCalled();
    });

    it('updates auto-refresh when autoRefreshTimeout changes', async () => {
      mockGetPositions.mockResolvedValue([]);

      const { rerender } = renderHook(
        ({ timeout }) =>
          usePredictPositions({
            autoRefreshTimeout: timeout,
          }),
        {
          initialProps: { timeout: 1000 },
        },
      );

      // Wait for initial load
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });

      mockGetPositions.mockClear();

      // Change the timeout
      rerender({ timeout: 2000 });

      // Advance time by 1 second (old interval)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should not have called yet (new interval is 2 seconds)
      expect(mockGetPositions).not.toHaveBeenCalled();

      // Advance time by another second (reaching 2 seconds total)
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should have called now
      await waitFor(() => {
        expect(mockGetPositions).toHaveBeenCalledTimes(1);
      });
    });

    it('uses isRefresh flag when auto-refreshing', async () => {
      const positions = [
        {
          providerId: 'p1',
          marketId: 'm1',
          outcomeId: 'o1',
          size: 1,
          price: 1.1,
          conditionId: 'c1',
          icon: 'icon',
          title: 'Title',
          outcome: 'Yes',
          cashPnl: 5,
          currentValue: 11,
          percentPnl: 3,
          initialValue: 10.5,
          avgPrice: 1.05,
          redeemable: false,
        },
      ];
      mockGetPositions.mockResolvedValue(positions);

      const { result } = renderHook(() =>
        usePredictPositions({
          autoRefreshTimeout: 1000,
        }),
      );

      // Wait for initial load
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toHaveLength(1);

      // Advance time to trigger auto-refresh
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // Should use isRefreshing, not isLoading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.positions).toHaveLength(1);
    });
  });
});
