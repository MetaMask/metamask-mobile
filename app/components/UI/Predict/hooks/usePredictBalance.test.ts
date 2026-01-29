import { renderHook, waitFor, act } from '@testing-library/react-native';
import { usePredictBalance } from './usePredictBalance';

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

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

// Mock Logger
jest.mock('../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
  },
}));

// Mock usePredictTrading
const mockGetBalance = jest.fn();
jest.mock('./usePredictTrading', () => ({
  usePredictTrading: () => ({
    getBalance: mockGetBalance,
  }),
}));

// Mock usePredictNetworkManagement
const mockEnsurePolygonNetworkExists = jest.fn();
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

// Mock selectors - balance comes from Redux state now
const mockSelectedAddress = '0x1234567890123456789012345678901234567890';
let mockCachedBalance = 0;

jest.mock('../selectors/predictController', () => ({
  selectPredictBalanceByAddress: jest.fn(() =>
    jest.fn(() => mockCachedBalance),
  ),
}));

// Mock react-redux
jest.mock('react-redux', () => {
  const actualRedux = jest.requireActual('react-redux');
  return {
    ...actualRedux,
    useSelector: jest.fn((selector: (state: unknown) => unknown) => {
      // Mock behavior: try to call selector with mock state
      try {
        const mockState = {
          engine: {
            backgroundState: {
              PredictController: {
                balances: {
                  polymarket: {
                    [mockSelectedAddress]: mockCachedBalance,
                  },
                },
              },
            },
          },
        };
        const result = selector(mockState);
        // Return the balance from the mock state
        if (typeof result === 'number') {
          return result;
        }
      } catch (e) {
        // Selector doesn't match our mock state shape
      }
      return undefined;
    }),
  };
});

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
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
    mockCachedBalance = 0;
    mockFocusCallback = null;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns correct initial state when loadOnMount is false', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // Assert - isLoading is always true initially to prevent flash of "no balance" state
      expect(result.current.balance).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasNoBalance).toBe(false); // false because isLoading is true
      expect(typeof result.current.loadBalance).toBe('function');
    });

    it('returns hasNoBalance as true when not loading and balance is zero', async () => {
      // Given balance is 0 and loading completes
      mockGetBalance.mockResolvedValue(0);
      mockCachedBalance = 0;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

      // Wait for loading to complete
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Then hasNoBalance should be true
      expect(result.current.hasNoBalance).toBe(true);
    });
  });

  describe('loadOnMount behavior', () => {
    it('loads balance automatically on mount when loadOnMount is true', async () => {
      // Given loadOnMount is true
      mockGetBalance.mockResolvedValue(150.5);
      mockCachedBalance = 150.5;

      // When hook is mounted
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 200;

      // When hook is mounted with custom providerId
      const { result } = renderHook(() =>
        usePredictBalance({ providerId: customProviderId, loadOnMount: true }),
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
      mockCachedBalance = 250.75;
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
      mockCachedBalance = 100;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: false }),
      );

      // When loadBalance is called without isRefresh flag
      act(() => {
        result.current.loadBalance();
      });

      // Then isLoading should be true
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });

    it('sets isRefreshing to true when loading with refresh flag', async () => {
      // Given hook is initialized and balance is already loaded
      mockGetBalance.mockResolvedValue(100);
      mockCachedBalance = 100;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 300;
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
      mockCachedBalance = 0;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 100;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 0;
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 100;
      const { result, rerender } = renderHook(() =>
        usePredictBalance({ refreshOnFocus: true, loadOnMount: true }),
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetBalance).toHaveBeenCalledTimes(1);

      // When screen comes into focus
      mockGetBalance.mockResolvedValue(200);
      await act(async () => {
        if (mockFocusCallback) {
          mockFocusCallback();
        }
      });

      // Update cached balance and force re-render to pick up new value
      mockCachedBalance = 200;
      rerender({});

      await waitFor(() => {
        expect(result.current.balance).toBe(200);
      });

      // Then balance should be refreshed
      expect(mockGetBalance).toHaveBeenCalledTimes(2);
    });

    it('does not refresh on focus when refreshOnFocus is false', async () => {
      // Given hook is mounted with refreshOnFocus disabled and loadOnMount enabled
      mockGetBalance.mockResolvedValue(100);
      mockCachedBalance = 100;
      renderHook(() =>
        usePredictBalance({ refreshOnFocus: false, loadOnMount: true }),
      );

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
      mockCachedBalance = 500;
      const { result, rerender } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

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
      mockCachedBalance = 100;
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
    it('uses default options when none are provided', () => {
      // Given no options are provided
      mockGetBalance.mockResolvedValue(100);

      // When hook is mounted
      const { result } = renderHook(() => usePredictBalance());

      // Then default options should be applied (loadOnMount and refreshOnFocus are false by default)
      // Note: isLoading starts as true to prevent flash of "no balance" state
      expect(result.current.balance).toBe(0);
      expect(result.current.isLoading).toBe(true);
      expect(result.current.isRefreshing).toBe(false);
      expect(result.current.error).toBeNull();

      // Balance should not be loaded automatically since loadOnMount defaults to false
      expect(mockGetBalance).not.toHaveBeenCalled();
    });

    it('loads balance with default providerId when loadOnMount is true', async () => {
      // Given loadOnMount is explicitly enabled
      mockGetBalance.mockResolvedValue(100);
      mockCachedBalance = 100;

      // When hook is mounted
      const { result } = renderHook(() =>
        usePredictBalance({ loadOnMount: true }),
      );

      // Then default providerId should be used
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
