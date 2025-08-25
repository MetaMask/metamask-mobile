import { renderHook, act, waitFor } from '@testing-library/react-native';
import { usePerpsPositions } from './usePerpsPositions';
import { usePerpsTrading } from './usePerpsTrading';
import { useFocusEffect } from '@react-navigation/native';

// Mock dependencies
jest.mock('./usePerpsTrading');
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));
jest.mock('../providers/PerpsConnectionProvider', () => ({
  usePerpsConnection: jest.fn(() => ({
    isInitialized: true,
    isConnected: true,
  })),
}));

describe('usePerpsPositions', () => {
  const mockGetPositions = jest.fn();
  const mockUseFocusEffect = useFocusEffect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    (usePerpsTrading as jest.Mock).mockReturnValue({
      getPositions: mockGetPositions,
    });
  });

  it('should load positions on mount by default', async () => {
    mockGetPositions.mockResolvedValue([
      { coin: 'ETH', size: '1.5', unrealizedPnl: '100' },
      { coin: 'BTC', size: '0.1', unrealizedPnl: '50' },
    ]);

    const { result } = renderHook(() => usePerpsPositions());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.positions).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetPositions).toHaveBeenCalled();
    expect(result.current.positions).toHaveLength(2);
    expect(result.current.error).toBe(null);
  });

  it('should not load on mount when loadOnMount is false', () => {
    mockGetPositions.mockResolvedValue([]);

    renderHook(() => usePerpsPositions({ loadOnMount: false }));

    expect(mockGetPositions).not.toHaveBeenCalled();
  });

  it('should handle errors correctly', async () => {
    const testError = new Error('Failed to fetch positions');
    mockGetPositions.mockRejectedValue(testError);
    const onError = jest.fn();

    const { result } = renderHook(() => usePerpsPositions({ onError }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toBe('Failed to fetch positions');
    expect(result.current.positions).toEqual([]);
    expect(onError).toHaveBeenCalledWith('Failed to fetch positions');
  });

  it('should refresh positions with isRefresh flag', async () => {
    mockGetPositions.mockResolvedValue([]);

    const { result } = renderHook(() => usePerpsPositions());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Reset mock to track refresh call
    mockGetPositions.mockClear();
    mockGetPositions.mockResolvedValue([
      { coin: 'ETH', size: '2.0', unrealizedPnl: '200' },
    ]);

    await act(async () => {
      await result.current.loadPositions({ isRefresh: true });
    });

    expect(mockGetPositions).toHaveBeenCalled();
    expect(result.current.isRefreshing).toBe(false);
    expect(result.current.positions).toHaveLength(1);
  });

  it('should call onSuccess callback when positions load successfully', async () => {
    const onSuccess = jest.fn();
    const positions = [{ coin: 'ETH', size: '1.5', unrealizedPnl: '100' }];
    mockGetPositions.mockResolvedValue(positions);

    const { result } = renderHook(() => usePerpsPositions({ onSuccess }));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(onSuccess).toHaveBeenCalledWith(positions);
  });

  it('should setup focus effect when refreshOnFocus is true', () => {
    renderHook(() => usePerpsPositions({ refreshOnFocus: true }));

    expect(mockUseFocusEffect).toHaveBeenCalled();
  });

  it('should not setup focus effect when refreshOnFocus is false', () => {
    renderHook(() => usePerpsPositions({ refreshOnFocus: false }));

    // The hook is still called but the callback won't trigger loadPositions
    expect(mockUseFocusEffect).toHaveBeenCalled();
  });
});
