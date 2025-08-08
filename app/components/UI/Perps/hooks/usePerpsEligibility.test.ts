import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { usePerpsEligibility } from './usePerpsEligibility';
import { backgroundState } from '../../../../util/test/initial-root-state';
import { act } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';

jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      refreshEligibility: jest.fn(),
    },
  },
}));

const createMockState = ({ isEligible = false }: { isEligible: boolean }) => ({
  engine: {
    backgroundState: {
      ...backgroundState,
      PerpsController: {
        isEligible,
        activeProvider: 'hyperliquid',
        isTestnet: false,
        connectionStatus: 'disconnected' as
          | 'disconnected'
          | 'connecting'
          | 'connected',
        positions: [],
        accountState: null,
        pendingOrders: [],
        depositStatus: 'idle' as
          | 'idle'
          | 'preparing'
          | 'depositing'
          | 'success'
          | 'error',
        currentDepositTxHash: null,
        depositError: null,
        activeDepositTransactions: {},
        lastError: null,
        lastUpdateTimestamp: 0,
      },
    },
  },
});

describe('usePerpsEligibility', () => {
  const mockRefreshEligibility = jest.mocked(
    Engine.context.PerpsController.refreshEligibility,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockRefreshEligibility.mockResolvedValue(undefined);
  });

  describe('initial state', () => {
    it('returns initial state correctly', () => {
      const { result } = renderHookWithProvider(() => usePerpsEligibility(), {
        state: createMockState({ isEligible: false }),
      });

      expect(result.current.isEligible).toBe(false);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.refreshPerpsEligibility).toBeDefined();
      expect(typeof result.current.refreshPerpsEligibility).toBe('function');
    });
  });

  describe('loading state', () => {
    it('sets loading to true during refresh and false after completion', async () => {
      let resolvePromise: () => void;

      const mockPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      mockRefreshEligibility.mockReturnValue(mockPromise);

      const { result } = renderHookWithProvider(() => usePerpsEligibility(), {
        state: createMockState({ isEligible: false }),
      });

      expect(result.current.isLoading).toBe(false);

      act(() => {
        result.current.refreshPerpsEligibility();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        resolvePromise();
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('sets loading to false even if refresh fails', async () => {
      let rejectPromise: (error: Error) => void;

      const mockPromise = new Promise<void>((_, reject) => {
        rejectPromise = reject;
      });

      mockRefreshEligibility.mockReturnValue(mockPromise);

      const { result } = renderHookWithProvider(() => usePerpsEligibility(), {
        state: createMockState({ isEligible: false }),
      });

      expect(result.current.isLoading).toBe(false);

      // Start the refresh but don't await it yet
      act(() => {
        result.current.refreshPerpsEligibility();
      });

      // Check that loading is now true
      expect(result.current.isLoading).toBe(true);

      // Now reject the promise and await completion
      await act(async () => {
        rejectPromise(new Error('API Error'));
      });

      // Check that loading is false after error
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('refreshPerpsEligibility functionality', () => {
    it('calls Engine.context.PerpsController.refreshEligibility', async () => {
      const { result } = renderHookWithProvider(() => usePerpsEligibility(), {
        state: createMockState({ isEligible: false }),
      });

      await act(async () => {
        await result.current.refreshPerpsEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(mockRefreshEligibility).toHaveBeenCalledWith();
    });

    it('handles refresh errors gracefully', async () => {
      const errorMessage = 'Eligibility refresh failed';
      mockRefreshEligibility.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHookWithProvider(() => usePerpsEligibility(), {
        state: createMockState({ isEligible: false }),
      });

      await act(async () => {
        await result.current.refreshPerpsEligibility();
      });

      expect(mockRefreshEligibility).toHaveBeenCalledTimes(1);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(
        `Failed to refresh perps eligibility: Error: Eligibility refresh failed`,
      );
    });
  });
});
