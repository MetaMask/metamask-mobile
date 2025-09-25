import { renderHook, act } from '@testing-library/react-hooks';
import { waitFor } from '@testing-library/react-native';
import { usePredictPositions } from './usePredictPositions';
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

describe('usePredictPositions', () => {
  const mockGetPositions = jest.fn();
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
      getPositions: mockGetPositions,
    });
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

  it('filters out redeemable positions', async () => {
    mockGetPositions.mockResolvedValue([
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
        claimable: true, // This should be filtered out
      },
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
        claimable: false, // This should remain
      },
    ]);

    const { result } = renderHook(() => usePredictPositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Only the non-redeemable position should remain
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.positions[0].providerId).toBe('p2');
  });
});
