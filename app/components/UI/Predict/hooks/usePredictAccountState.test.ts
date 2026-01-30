import { renderHook, act, waitFor } from '@testing-library/react-native';
import Engine from '../../../../core/Engine';
import { usePredictAccountState } from './usePredictAccountState';

// Mock Engine
jest.mock('../../../../core/Engine', () => ({
  context: {
    PredictController: {
      getAccountState: jest.fn(),
    },
  },
}));

// Mock @react-navigation/native
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(() => {
    // Mock implementation
  }),
}));

// Mock DevLogger
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

import { DevLogger } from '../../../../core/SDKConnect/utils/DevLogger';

const mockDevLoggerLog = DevLogger.log as jest.Mock;

// Mock usePredictNetworkManagement
const mockEnsurePolygonNetworkExists = jest.fn().mockResolvedValue(undefined);
jest.mock('./usePredictNetworkManagement', () => ({
  usePredictNetworkManagement: () => ({
    ensurePolygonNetworkExists: mockEnsurePolygonNetworkExists,
  }),
}));

import { useFocusEffect } from '@react-navigation/native';

const mockGetAccountState = Engine.context.PredictController
  .getAccountState as jest.Mock;
const mockUseFocusEffect = useFocusEffect as jest.Mock;

describe('usePredictAccountState', () => {
  const mockAccountState = {
    address: '0x1234567890abcdef1234567890abcdef12345678',
    isDeployed: true,
    hasAllowances: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFocusEffect.mockImplementation(() => {
      // Default no-op implementation
    });
    mockGetAccountState.mockResolvedValue(mockAccountState);
    mockEnsurePolygonNetworkExists.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('starts with loading state set to true initially', () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Assert - initially loading is true (initial state)
      expect(result.current.isLoading).toBe(true);
    });

    it('loads account state on mount by default', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() => usePredictAccountState());

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetAccountState).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
      expect(result.current.address).toEqual(mockAccountState.address);
    });

    it('does not load account state on mount when loadOnMount is false', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Assert - wait a bit to ensure it doesn't load
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      });

      expect(mockGetAccountState).not.toHaveBeenCalled();
      expect(result.current.address).toBeUndefined();
    });
  });

  describe('loadAccountState function', () => {
    it('loads account state successfully', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(mockGetAccountState).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
      expect(result.current.address).toEqual(mockAccountState.address);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('uses custom providerId when specified', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);
      const customProviderId = 'custom-provider';

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({
          providerId: customProviderId,
          loadOnMount: false,
        }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(mockGetAccountState).toHaveBeenCalledWith({
        providerId: customProviderId,
      });
    });

    it('handles errors when loading account state', async () => {
      // Arrange
      const mockError = new Error('Failed to load account state');
      mockGetAccountState.mockRejectedValue(mockError);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.error).toBe('Failed to load account state');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.address).toBeUndefined();
    });

    it('handles non-Error exceptions', async () => {
      // Arrange
      mockGetAccountState.mockRejectedValue('String error');

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.error).toBe('Failed to load account state');
    });

    it('sets isLoading true during load', async () => {
      // Arrange
      let resolver: (value: typeof mockAccountState) => void = () => {
        // Initial no-op
      };
      const promise = new Promise<typeof mockAccountState>((resolve) => {
        resolver = resolve;
      });
      mockGetAccountState.mockReturnValue(promise);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Start loading without awaiting
      result.current.loadAccountState();

      // Assert - loading should be true during the call
      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });

      // Complete the promise
      await act(async () => {
        resolver(mockAccountState);
        await promise;
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('clears previous error on successful load', async () => {
      // Arrange
      mockGetAccountState
        .mockRejectedValueOnce(new Error('First error'))
        .mockResolvedValueOnce(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // First call - should fail
      await act(async () => {
        await result.current.loadAccountState();
      });

      expect(result.current.error).toBe('First error');

      // Second call - should succeed and clear error
      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.error).toBeNull();
      expect(result.current.address).toEqual(mockAccountState.address);
    });

    it('calls ensurePolygonNetworkExists before loading account state', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(mockEnsurePolygonNetworkExists).toHaveBeenCalledTimes(1);
      expect(mockGetAccountState).toHaveBeenCalled();
    });

    it('continues loading account state when ensurePolygonNetworkExists fails', async () => {
      // Arrange
      const networkError = new Error('Failed to add Polygon network');
      mockEnsurePolygonNetworkExists.mockRejectedValue(networkError);
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert - account state should still be loaded despite network error
      expect(result.current.address).toEqual(mockAccountState.address);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('logs error when ensurePolygonNetworkExists fails', async () => {
      // Arrange
      const networkError = new Error('Failed to add Polygon network');
      mockEnsurePolygonNetworkExists.mockRejectedValue(networkError);
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert - DevLogger should have been called with network error
      expect(mockDevLoggerLog).toHaveBeenCalledWith(
        'usePredictAccountState: Failed to ensure Polygon network exists',
        networkError,
      );
    });
  });

  describe('refresh functionality', () => {
    it('uses isRefreshing flag when loading with isRefresh option', async () => {
      // Arrange
      let resolver: (value: typeof mockAccountState) => void = () => {
        // Initial no-op
      };
      const promise = new Promise<typeof mockAccountState>((resolve) => {
        resolver = resolve;
      });
      mockGetAccountState.mockReturnValue(promise);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Start refreshing without awaiting
      await act(async () => {
        result.current.loadAccountState({ isRefresh: true });
        // Allow state to update
        await Promise.resolve();
      });

      // Assert - isRefreshing should be true during refresh
      expect(result.current.isRefreshing).toBe(true);

      // Complete the promise
      await act(async () => {
        resolver(mockAccountState);
        await promise;
      });

      expect(result.current.isRefreshing).toBe(false);
    });

    it('refreshes on focus when refreshOnFocus is true', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);
      let focusCallback: (() => void) | null = null;

      // Capture the focus callback
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      // Act
      renderHook(() =>
        usePredictAccountState({
          loadOnMount: false,
          refreshOnFocus: true,
        }),
      );

      // Clear the initial call
      mockGetAccountState.mockClear();

      // Assert - useFocusEffect should have been called
      expect(mockUseFocusEffect).toHaveBeenCalledTimes(1);
      expect(focusCallback).not.toBeNull();

      // Simulate screen focus
      await act(async () => {
        if (focusCallback) {
          await focusCallback();
        }
      });

      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalledTimes(1);
      });
    });

    it('does not refresh on focus when refreshOnFocus is false', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);
      let focusCallback: (() => void) | null = null;

      // Capture the focus callback
      mockUseFocusEffect.mockImplementation((callback) => {
        focusCallback = callback;
      });

      // Act
      renderHook(() =>
        usePredictAccountState({
          loadOnMount: false,
          refreshOnFocus: false,
        }),
      );

      // Clear any initial calls
      mockGetAccountState.mockClear();

      // Assert - useFocusEffect should have been called but callback shouldn't refresh
      expect(mockUseFocusEffect).toHaveBeenCalledTimes(1);

      // Simulate screen focus if callback was provided
      await act(async () => {
        if (focusCallback) {
          await focusCallback();
        }
      });

      // Should not have called getAccountState because refreshOnFocus is false
      expect(mockGetAccountState).not.toHaveBeenCalled();
    });
  });

  describe('computed values', () => {
    it('returns address from account state', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.address).toBe(mockAccountState.address);
    });

    it('returns isDeployed from account state', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.isDeployed).toBe(true);
    });

    it('returns false for isDeployed when account state is null', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Assert
      expect(result.current.isDeployed).toBe(false);
    });

    it('returns hasAllowances from account state', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.hasAllowances).toBe(true);
    });

    it('returns false for hasAllowances when account state is null', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Assert
      expect(result.current.hasAllowances).toBe(false);
    });

    it('returns undefined for address when account state is null', () => {
      // Arrange & Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      // Assert
      expect(result.current.address).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('handles account state with isDeployed false', async () => {
      // Arrange
      const undeployedState = {
        ...mockAccountState,
        isDeployed: false,
      };
      mockGetAccountState.mockResolvedValue(undeployedState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.isDeployed).toBe(false);
    });

    it('handles account state with hasAllowances false', async () => {
      // Arrange
      const noAllowancesState = {
        ...mockAccountState,
        hasAllowances: false,
      };
      mockGetAccountState.mockResolvedValue(noAllowancesState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(result.current.hasAllowances).toBe(false);
    });

    it('handles multiple rapid calls to loadAccountState', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await Promise.all([
          result.current.loadAccountState(),
          result.current.loadAccountState(),
          result.current.loadAccountState(),
        ]);
      });

      // Assert
      expect(mockGetAccountState).toHaveBeenCalledTimes(3);
      expect(result.current.address).toEqual(mockAccountState.address);
    });
  });

  describe('hook stability', () => {
    it('returns stable loadAccountState function reference', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result, rerender } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      const initialLoadAccountState = result.current.loadAccountState;

      // Trigger a re-render
      rerender({ loadOnMount: false });

      // Assert
      expect(result.current.loadAccountState).toBe(initialLoadAccountState);
    });

    it('computed values update when account state changes', async () => {
      // Arrange
      const updatedAccountState = {
        ...mockAccountState,
        address: '0x9876543210987654321098765432109876543210',
      };

      mockGetAccountState
        .mockResolvedValueOnce(mockAccountState)
        .mockResolvedValueOnce(updatedAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      const initialAddress = result.current.address;

      await act(async () => {
        await result.current.loadAccountState();
      });

      const updatedAddress = result.current.address;

      // Assert
      expect(initialAddress).toBe(mockAccountState.address);
      expect(updatedAddress).toBe(updatedAccountState.address);
    });
  });

  describe('default parameters', () => {
    it('uses polymarket as default providerId', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      const { result } = renderHook(() =>
        usePredictAccountState({ loadOnMount: false }),
      );

      await act(async () => {
        await result.current.loadAccountState();
      });

      // Assert
      expect(mockGetAccountState).toHaveBeenCalledWith({
        providerId: 'polymarket',
      });
    });

    it('uses true as default for loadOnMount', async () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Act
      renderHook(() => usePredictAccountState());

      // Assert
      await waitFor(() => {
        expect(mockGetAccountState).toHaveBeenCalled();
      });
    });

    it('uses true as default for refreshOnFocus', () => {
      // Arrange
      mockGetAccountState.mockResolvedValue(mockAccountState);

      // Just capture the callback, don't execute it
      mockUseFocusEffect.mockImplementation((callback) => callback);

      // Act
      renderHook(() => usePredictAccountState({ loadOnMount: false }));

      // Assert - useFocusEffect should have been called
      expect(mockUseFocusEffect).toHaveBeenCalled();
    });
  });
});
