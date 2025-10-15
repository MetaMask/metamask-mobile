import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePredictClaimablePositions } from './usePredictClaimablePositions';
import { usePredictTrading } from './usePredictTrading';
import { useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountAddress } from '../../../../selectors/accountsController';

// Mock dependencies
jest.mock('./usePredictTrading');
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

describe('usePredictClaimablePositions', () => {
  const mockGetClaimablePositions = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.Mock;
  const mockUseSelector = useSelector as jest.Mock;
  const mockSelectSelectedInternalAccountAddress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectSelectedInternalAccountAddress.mockReturnValue(
      '0x1234567890123456789012345678901234567890',
    );
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return '0x1234567890123456789012345678901234567890';
      }
      return undefined;
    });
    (usePredictTrading as jest.Mock).mockReturnValue({
      getClaimablePositions: mockGetClaimablePositions,
    });
  });

  it('loads claimable positions on mount by default', async () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([
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
        redeemable: true,
      },
    ]);

    // Act
    const { result } = renderHook(() => usePredictClaimablePositions());

    // Assert - initial state
    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    // Assert - after async operation completes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetClaimablePositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      providerId: undefined,
    });
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.error).toBe(null);
  });

  it('does not load on mount when loadOnMount is false', () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([]);

    // Act
    renderHook(() => usePredictClaimablePositions({ loadOnMount: false }));

    // Assert
    expect(mockGetClaimablePositions).not.toHaveBeenCalled();
  });

  it('handles errors correctly', async () => {
    // Arrange
    const testError = new Error('Failed to load claimable positions');
    mockGetClaimablePositions.mockRejectedValue(testError);

    // Act
    const { result } = renderHook(() => usePredictClaimablePositions());

    // Assert - initial state
    expect(result.current.isLoading).toBe(true);

    // Assert - after async operation completes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load claimable positions');
    expect(result.current.positions).toEqual([]);
  });

  it('handles non-Error exceptions', async () => {
    // Arrange
    mockGetClaimablePositions.mockRejectedValue('string error');

    // Act
    const { result } = renderHook(() => usePredictClaimablePositions());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to load positions');
    expect(result.current.positions).toEqual([]);
  });

  it('refreshes positions with isRefresh flag', async () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([]);

    const { result } = renderHook(() => usePredictClaimablePositions());

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetClaimablePositions.mockClear();
    mockGetClaimablePositions.mockResolvedValue([
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
        redeemable: true,
      },
    ]);

    // Act
    await act(async () => {
      await result.current.loadPositions({ isRefresh: true });
    });

    // Assert
    expect(mockGetClaimablePositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
      providerId: undefined,
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.positions).toHaveLength(1);
  });

  it('sets isRefreshing when refresh is true', async () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([]);

    const { result } = renderHook(() => usePredictClaimablePositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    mockGetClaimablePositions.mockClear();
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetClaimablePositions.mockReturnValue(promise);

    // Act
    act(() => {
      result.current.loadPositions({ isRefresh: true });
    });

    // Assert - while refreshing
    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(true);
    });
    expect(result.current.isLoading).toBe(false);

    // Complete the promise
    act(() => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.isRefreshing).toBe(false);
    });
  });

  it('clears positions and sets isLoading when not refreshing', async () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([
      {
        providerId: 'p1',
        marketId: 'm1',
        outcomeId: 'o1',
        size: 1,
        price: 1.0,
        conditionId: 'c1',
        icon: 'icon',
        title: 'Title',
        outcome: 'Yes',
        cashPnl: 5,
        currentValue: 10,
        percentPnl: 3,
        initialValue: 9.5,
        avgPrice: 1.0,
        redeemable: true,
      },
    ]);

    const { result } = renderHook(() => usePredictClaimablePositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toHaveLength(1);

    mockGetClaimablePositions.mockClear();
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    mockGetClaimablePositions.mockReturnValue(promise);

    // Act - load without refresh
    act(() => {
      result.current.loadPositions({ isRefresh: false });
    });

    // Assert - positions should be cleared and isLoading should be true
    await waitFor(() => {
      expect(result.current.isLoading).toBe(true);
    });
    expect(result.current.positions).toEqual([]);
    expect(result.current.isRefreshing).toBe(false);

    // Complete the promise
    act(() => {
      resolvePromise();
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it('loads positions successfully', async () => {
    // Arrange
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
        redeemable: true,
      },
    ];
    mockGetClaimablePositions.mockResolvedValue(positions);

    // Act
    const { result } = renderHook(() => usePredictClaimablePositions());

    // Assert - initial state
    expect(result.current.isLoading).toBe(true);

    // Assert - after async operation completes
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual(positions);
    expect(result.current.error).toBe(null);
  });

  it('sets up focus effect when refreshOnFocus is true', () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      usePredictClaimablePositions({ refreshOnFocus: true }),
    );

    // Assert
    expect(mockUseFocusEffect).toHaveBeenCalled();
    expect(result.current.positions).toEqual([]);
  });

  it('still registers focus effect when refreshOnFocus is false', () => {
    // Arrange & Act
    const { result } = renderHook(() =>
      usePredictClaimablePositions({ refreshOnFocus: false }),
    );

    // Assert
    expect(mockUseFocusEffect).toHaveBeenCalled();
    expect(result.current.positions).toEqual([]);
  });

  it('passes providerId when specified', async () => {
    // Arrange
    mockGetClaimablePositions.mockResolvedValue([]);

    // Act
    renderHook(() =>
      usePredictClaimablePositions({ providerId: 'polymarket' }),
    );

    // Assert
    await waitFor(() => {
      expect(mockGetClaimablePositions).toHaveBeenCalledWith({
        address: '0x1234567890123456789012345678901234567890',
        providerId: 'polymarket',
      });
    });
  });

  it('clears error when loading positions', async () => {
    // Arrange - first call fails
    mockGetClaimablePositions.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => usePredictClaimablePositions());

    await waitFor(() => {
      expect(result.current.error).toBe('Network error');
    });

    // Act - second call succeeds
    mockGetClaimablePositions.mockResolvedValue([]);

    await act(async () => {
      await result.current.loadPositions();
    });

    // Assert - error should be cleared
    expect(result.current.error).toBe(null);
  });

  it('uses selected account address for loading positions', async () => {
    // Arrange
    const testAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
    mockUseSelector.mockImplementation((selector) => {
      if (selector === selectSelectedInternalAccountAddress) {
        return testAddress;
      }
      return undefined;
    });
    mockGetClaimablePositions.mockResolvedValue([]);

    // Act
    renderHook(() => usePredictClaimablePositions());

    // Assert
    await waitFor(() => {
      expect(mockGetClaimablePositions).toHaveBeenCalledWith({
        address: testAddress,
        providerId: undefined,
      });
    });
  });

  it('calls getClaimablePositions instead of getPositions', async () => {
    // Arrange
    const mockGetPositions = jest.fn();
    (usePredictTrading as jest.Mock).mockReturnValue({
      getClaimablePositions: mockGetClaimablePositions,
      getPositions: mockGetPositions,
    });
    mockGetClaimablePositions.mockResolvedValue([]);

    // Act
    renderHook(() => usePredictClaimablePositions());

    // Assert
    await waitFor(() => {
      expect(mockGetClaimablePositions).toHaveBeenCalled();
    });
    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('returns only claimable positions', async () => {
    // Arrange
    const claimablePositions = [
      {
        providerId: 'p1',
        marketId: 'm1',
        outcomeId: 'o1',
        size: 2,
        price: 1.2,
        conditionId: 'c1',
        icon: 'icon',
        title: 'Claimable Market',
        outcome: 'Yes',
        cashPnl: 10,
        currentValue: 12,
        percentPnl: 5,
        initialValue: 11.5,
        avgPrice: 1.15,
        claimable: true,
      },
      {
        providerId: 'p2',
        marketId: 'm2',
        outcomeId: 'o2',
        size: 3,
        price: 1.5,
        conditionId: 'c2',
        icon: 'icon2',
        title: 'Another Claimable Market',
        outcome: 'No',
        cashPnl: 15,
        currentValue: 18,
        percentPnl: 8,
        initialValue: 16.5,
        avgPrice: 1.45,
        claimable: true,
      },
    ];
    mockGetClaimablePositions.mockResolvedValue(claimablePositions);

    // Act
    const { result } = renderHook(() => usePredictClaimablePositions());

    // Assert
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.positions).toEqual(claimablePositions);
    expect(result.current.positions).toHaveLength(2);
    expect(result.current.positions.every((p) => p.claimable)).toBe(true);
  });
});
