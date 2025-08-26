import { renderHook, act } from '@testing-library/react-hooks';
import { usePredictPositions } from './usePredictPositions';
import { usePredictTrading } from './usePredictTrading';
import { useFocusEffect } from '@react-navigation/native';

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

describe('usePredictPositions', () => {
  const mockGetPositions = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositions(),
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    await waitForNextUpdate();

    expect(mockGetPositions).toHaveBeenCalled();
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

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositions({ onError }),
    );

    await waitForNextUpdate();

    expect(result.current.error).toBe('Failed to load positions');
    expect(result.current.positions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(onError).toHaveBeenCalledWith('Failed to load positions');
  });

  it('refreshes positions with isRefresh flag', async () => {
    mockGetPositions.mockResolvedValue([]);

    const { result, waitForNextUpdate } = renderHook(() =>
      usePredictPositions(),
    );

    await waitForNextUpdate();

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

    expect(mockGetPositions).toHaveBeenCalled();
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

    const { waitForNextUpdate } = renderHook(() =>
      usePredictPositions({ onSuccess }),
    );

    await waitForNextUpdate();

    expect(onSuccess).toHaveBeenCalledWith(positions);
  });

  it('sets up focus effect when refreshOnFocus is true', () => {
    renderHook(() => usePredictPositions({ refreshOnFocus: true }));

    expect(mockUseFocusEffect).toHaveBeenCalled();
  });

  it('still registers focus effect when refreshOnFocus is false (no refresh on focus)', () => {
    renderHook(() => usePredictPositions({ refreshOnFocus: false }));

    expect(mockUseFocusEffect).toHaveBeenCalled();
  });
});
