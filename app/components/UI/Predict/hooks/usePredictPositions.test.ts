import { renderHook, act } from '@testing-library/react-hooks';
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
      },
    ]);

    const { result } = renderHook(() => usePredictPositions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    // Wait for the async operation to complete
    await act(async () => {
      // The effect should trigger the loadPositions call
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
    });
    expect(result.current.positions).toHaveLength(1);
    expect(result.current.isLoading).toBe(false);
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
    const onError = jest.fn();

    const { result } = renderHook(() => usePredictPositions({ onError }));

    expect(result.current.isLoading).toBe(true);

    // Wait for the async operation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(result.current.error).toBe('Failed to load positions');
    expect(result.current.positions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(onError).toHaveBeenCalledWith('Failed to load positions');
  });

  it('refreshes positions with isRefresh flag', async () => {
    mockGetPositions.mockResolvedValue([]);

    const { result } = renderHook(() => usePredictPositions());

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
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
      },
    ]);

    await act(async () => {
      await result.current.loadPositions({ isRefresh: true });
    });

    expect(mockGetPositions).toHaveBeenCalledWith({
      address: '0x1234567890123456789012345678901234567890',
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.positions).toHaveLength(1);
  });

  it('calls onSuccess callback when positions load successfully', async () => {
    const onSuccess = jest.fn();
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
      },
    ];
    mockGetPositions.mockResolvedValue(positions);

    renderHook(() => usePredictPositions({ onSuccess }));

    // Wait for the async operation to complete
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(onSuccess).toHaveBeenCalledWith(positions);
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
});
