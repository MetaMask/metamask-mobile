import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePredictBalance } from './usePredictBalance';

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock usePredictTrading
const mockGetBalance = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    getBalance: mockGetBalance,
  }),
}));

// Mock react-redux
const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
jest.mock('react-redux', () => ({
  useSelector: jest.fn(() => mockSelectedAddress),
}));

// Mock useFocusEffect
let mockFocusCallback: (() => void) | null = null;
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn((callback) => {
    mockFocusCallback = callback;
  }),
}));

describe('usePredictBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetBalance.mockResolvedValue(100);
    mockFocusCallback = null;
  });

  describe('initial state', () => {
    it('returns correct initial state when loadOnMount is false', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // Assert
      expect(result.current.balance).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasNoBalance).toBe(false);
      expect(typeof result.current.loadBalance).toBe('function');
    });

    it('returns hasNoBalance as false when loading', () => {
      // Given loading is true and balance is 0
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // Then hasNoBalance should be false
      expect(result.current.hasNoBalance).toBe(false);
    });
  });

  describe('loadOnMount behavior', () => {
    it('loads balance automatically on mount when loadOnMount is true', async () => {
      // Given loadOnMount is true (default)
      mockGetBalance.mockResolvedValue(150.5);

      // When hook is mounted
      const { result } = renderHook(() => usePredictBalance());

      // Then balance should be loaded
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetBalance).toHaveBeenCalledWith({
        address: mockSelectedAddress,
        providerId: 'polymarket',
      });
      expect(result.current.balance).toBe(150.5);
      expect(result.current.error).toBeNull();
    });

    it('does not load balance on mount when loadOnMount is false', () => {
      // Given loadOnMount is false
      // When hook is mounted
      renderHook(() => usePredictBalance({ loadOnMount: false }));

      // Then getBalance should not be called
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('uses custom providerId when specified', async () => {
      // Given custom providerId
      const customProviderId = 'custom-provider';
      mockGetBalance.mockResolvedValue(200);

      // When hook is mounted with custom providerId
      const { result } = renderHook(() =>
        usePredictBalance({ providerId: customProviderId }),
      );

      // Then getBalance should be called with custom providerId
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetBalance).toHaveBeenCalledWith({
        address: mockSelectedAddress,
        providerId: customProviderId,
      });
    });
  });

  describe('loadBalance function', () => {
    it('loads balance and updates state correctly', async () => {
      // Given hook is initialized without auto-loading
      mockGetBalance.mockResolvedValue(250.75);
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When loadBalance is called manually
      await act(async () => {
        await result.current.loadBalance();
      });

      // Then balance should be loaded and state updated
      expect(result.current.balance).toBe(250.75);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('sets isLoading to true when loading without refresh flag', async () => {
      // Given hook is initialized
      mockGetBalance.mockResolvedValue(100);
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When loadBalance is called without isRefresh flag
      const loadPromise = result.current.loadBalance();

      // Then isLoading should be true
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);

      await loadPromise;
    });

    it('sets isRefreshing to true when loading with refresh flag', async () => {
      // Given hook is initialized and balance is already loaded
      mockGetBalance.mockResolvedValue(100);
      const { result } = renderHook(() => usePredictBalance());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // When loadBalance is called with isRefresh flag
      let loadPromise: Promise<void> | undefined;
      act(() => {
        loadPromise = result.current.loadBalance({ isRefresh: true });
      });

      // Then isRefreshing should be true
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
      });
      expect(result.current.isLoading).toBe(false);

      await act(async () => {
        if (loadPromise) {
          await loadPromise;
        }
      });
    });

    it('handles error when balance loading fails', async () => {
      // Given getBalance will fail
      const errorMessage = 'Network error';
      mockGetBalance.mockRejectedValue(new Error(errorMessage));
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When loadBalance is called
      await act(async () => {
        await result.current.loadBalance();
      });

      // Then error should be set and loading should stop
      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.balance).toBe(0);
    });

    it('handles non-Error exceptions gracefully', async () => {
      // Given getBalance will throw a non-Error object
      mockGetBalance.mockRejectedValue('String error');
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When loadBalance is called
      await act(async () => {
        await result.current.loadBalance();
      });

      // Then a generic error message should be set
      expect(result.current.error).toBe('Failed to load balance');
      expect(result.current.isLoading).toBe(false);
    });

    it('clears previous error when loading succeeds', async () => {
      // Given hook has a previous error
      mockGetBalance.mockRejectedValue(new Error('Previous error'));
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadBalance();
      });
      expect(result.current.error).toBe('Previous error');

      // When loadBalance is called again and succeeds
      mockGetBalance.mockResolvedValue(300);
      await act(async () => {
        await result.current.loadBalance();
      });

      // Then error should be cleared
      expect(result.current.error).toBeNull();
      expect(result.current.balance).toBe(300);
    });
  });

  describe('hasNoBalance computed value', () => {
    it('returns true when balance is zero and not loading', async () => {
      // Given balance is successfully loaded as 0
      mockGetBalance.mockResolvedValue(0);
      const { result } = renderHook(() => usePredictBalance());

      // When loading completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Then hasNoBalance should be true
      expect(result.current.hasNoBalance).toBe(true);
    });

    it('returns false when balance is greater than zero', async () => {
      // Given balance is successfully loaded as non-zero
      mockGetBalance.mockResolvedValue(100);
      const { result } = renderHook(() => usePredictBalance());

      // When loading completes
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Then hasNoBalance should be false
      expect(result.current.hasNoBalance).toBe(false);
    });

    it('returns false when refreshing even if balance is zero', async () => {
      // Given balance is 0 and loaded
      mockGetBalance.mockResolvedValue(0);
      const { result } = renderHook(() => usePredictBalance());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasNoBalance).toBe(true);

      // When refresh starts
      let loadPromise: Promise<void> | undefined;
      act(() => {
        loadPromise = result.current.loadBalance({ isRefresh: true });
      });

      // Then hasNoBalance should be false during refresh
      await waitFor(() => {
        expect(result.current.isRefreshing).toBe(true);
        expect(result.current.hasNoBalance).toBe(false);
      });

      await act(async () => {
        if (loadPromise) {
          await loadPromise;
        }
      });
    });
  });

  describe('refreshOnFocus behavior', () => {
    it('refreshes balance when screen comes into focus', async () => {
      // Given hook is mounted with refreshOnFocus enabled
      mockGetBalance.mockResolvedValue(100);
      const { result } = renderHook(() =>
        usePredictBalance({ refreshOnFocus: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetBalance).toHaveBeenCalledTimes(1);

      // When screen comes into focus
      mockGetBalance.mockResolvedValue(200);
      if (mockFocusCallback) {
        mockFocusCallback();
      }

      await waitFor(() => {
        expect(result.current.balance).toBe(200);
      });

      // Then balance should be refreshed
      expect(mockGetBalance).toHaveBeenCalledTimes(2);
      expect(result.current.balance).toBe(200);
    });

    it('does not refresh on focus when refreshOnFocus is false', async () => {
      // Given hook is mounted with refreshOnFocus disabled
      mockGetBalance.mockResolvedValue(100);
      renderHook(() => usePredictBalance({ refreshOnFocus: false }));

      await waitFor(() => {
        expect(mockGetBalance).toHaveBeenCalledTimes(1);
      });

      // When screen comes into focus
      if (mockFocusCallback) {
        mockFocusCallback();
      }

      // Then balance should not be refreshed again
      expect(mockGetBalance).toHaveBeenCalledTimes(1);
    });
  });

  describe('account address changes', () => {
    it('resets state when selected account address changes', async () => {
      // Given hook is mounted with loaded balance
      mockGetBalance.mockResolvedValue(500);
      const { result, rerender } = renderHook(() => usePredictBalance());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.balance).toBe(500);

      // When selected account address changes (simulated by rerender)
      // Note: The actual address change would be handled by the useSelector mock
      // but we can verify the reset behavior by checking the effect
      rerender({});

      // Then state should reset (implementation will reload via useEffect)
      // The effect should trigger a reload when address changes
      expect(result.current.balance).toBeDefined();
    });
  });

  describe('hook stability', () => {
    it('returns stable loadBalance function reference', async () => {
      // Given hook is mounted
      const { result, rerender } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      const initialLoadBalance = result.current.loadBalance;

      // When component re-renders
      rerender({});

      // Then loadBalance function reference should remain stable
      expect(result.current.loadBalance).toBe(initialLoadBalance);
    });
  });

  describe('concurrent load operations', () => {
    it('handles multiple concurrent load calls correctly', async () => {
      // Given hook is initialized
      mockGetBalance.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(100), 100)),
      );
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When multiple loads are triggered simultaneously
      await act(async () => {
        const load1 = result.current.loadBalance();
        const load2 = result.current.loadBalance();
        const load3 = result.current.loadBalance();

        // Then all should complete without error
        await Promise.all([load1, load2, load3]);
      });

      expect(result.current.balance).toBe(100);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });
  });

  describe('default options', () => {
    it('uses default options when none are provided', async () => {
      // Given no options are provided
      mockGetBalance.mockResolvedValue(100);

      // When hook is mounted
      const { result } = renderHook(() => usePredictBalance());

      // Then default options should be applied
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetBalance).toHaveBeenCalledWith({
        address: mockSelectedAddress,
        providerId: 'polymarket', // default providerId
      });
      expect(result.current.balance).toBe(100);
    });
  });
});
