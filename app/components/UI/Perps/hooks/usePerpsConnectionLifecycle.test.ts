import { renderHook, act } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import Device from '../../../../util/device';
import { usePerpsConnectionLifecycle } from './usePerpsConnectionLifecycle';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

jest.mock('react-native', () => ({
  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('react-native-background-timer', () => ({
  setTimeout: jest.fn(),
  clearTimeout: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
}));

jest.mock('../../../../util/device');
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));

describe('usePerpsConnectionLifecycle', () => {
  let mockOnConnect: jest.Mock;
  let mockOnDisconnect: jest.Mock;
  let mockOnError: jest.Mock;
  let mockAppStateListener: ((state: string) => void) | null = null;

  const mockIsIos = Device.isIos as jest.MockedFunction<typeof Device.isIos>;
  const mockIsAndroid = Device.isAndroid as jest.MockedFunction<
    typeof Device.isAndroid
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockOnConnect = jest.fn().mockResolvedValue(undefined);
    mockOnDisconnect = jest.fn();
    mockOnError = jest.fn();

    // Default to iOS
    mockIsIos.mockReturnValue(true);
    mockIsAndroid.mockReturnValue(false);

    // Reset AppState current state
    (AppState as { currentState: string }).currentState = 'active';

    // Capture the AppState listener
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler;
        }
        return { remove: jest.fn() };
      },
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    mockAppStateListener = null;
  });

  describe('Tab Visibility Changes', () => {
    it('should connect when tab becomes visible', async () => {
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: false } },
      );

      expect(mockOnConnect).not.toHaveBeenCalled();

      // Change to visible
      rerender({ isVisible: true });

      // Wait for the 500ms delay
      await act(async () => {
        jest.advanceTimersByTime(500);
      });

      expect(mockOnConnect).toHaveBeenCalledTimes(1);
      expect(mockOnDisconnect).not.toHaveBeenCalled();
    });

    it('should disconnect immediately when tab becomes hidden (grace period handled by PerpsConnectionManager)', () => {
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: true } },
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Change to hidden - should call onDisconnect immediately (grace period managed by PerpsConnectionManager)
      rerender({ isVisible: false });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect and reconnect when tab visibility changes', () => {
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: true } },
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Tab becomes hidden - should disconnect immediately
      rerender({ isVisible: false });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      // Tab becomes visible again - should reconnect after delay
      rerender({ isVisible: true });

      act(() => {
        jest.advanceTimersByTime(500); // Wait for reconnection delay
      });

      expect(mockOnConnect).toHaveBeenCalledTimes(2);
    });

    it('should not manage connection when visibility is undefined', () => {
      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: undefined,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Should still connect initially
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // But visibility changes should not affect it
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('App State Changes - iOS', () => {
    beforeEach(() => {
      mockIsIos.mockReturnValue(true);
      mockIsAndroid.mockReturnValue(false);
    });

    it('should disconnect immediately when app goes to background on iOS', () => {
      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Simulate app going to background - should call onDisconnect immediately
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect and reconnect when app background/foreground cycle happens', () => {
      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Simulate app going to background - should disconnect immediately
      act(() => {
        mockAppStateListener?.('background');
      });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      // Return to foreground - should reconnect after delay
      act(() => {
        mockAppStateListener?.('active');
        jest.advanceTimersByTime(PERPS_CONSTANTS.ReconnectionDelayAndroidMs);
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('App State Changes - Android', () => {
    beforeEach(() => {
      mockIsIos.mockReturnValue(false);
      mockIsAndroid.mockReturnValue(true);
    });

    it('should disconnect immediately when app goes to background on Android', () => {
      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Simulate app going to background - should call onDisconnect immediately
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect and reconnect when app background/foreground cycle happens on Android', () => {
      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Simulate app going to background - should disconnect immediately
      act(() => {
        mockAppStateListener?.('background');
      });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      // Return to foreground - should reconnect after delay
      act(() => {
        mockAppStateListener?.('active');
        // Advance timer for the 300ms reconnection delay
        jest.advanceTimersByTime(300);
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Interaction between visibility and app state', () => {
    it('should not reconnect when app comes to foreground if tab is not visible', () => {
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: true } },
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // Hide tab - should disconnect immediately
      rerender({ isVisible: false });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      mockOnConnect.mockClear();

      // App goes to background and returns
      act(() => {
        mockAppStateListener?.('background');
        mockAppStateListener?.('active');
      });

      // Should not reconnect because tab is not visible
      expect(mockOnConnect).not.toHaveBeenCalled();
    });

    it('should handle app backgrounding and tab hiding independently', () => {
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: true } },
      );

      // Initial connection
      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      // App goes to background - should disconnect immediately
      act(() => {
        mockAppStateListener?.('background');
      });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      // Tab becomes hidden - since already disconnected, hook doesn't track state so may call disconnect
      rerender({ isVisible: false });
      // The hook calls disconnect when visibility changes regardless of current state
      expect(mockOnDisconnect).toHaveBeenCalledWith();
    });
  });

  describe('Error handling', () => {
    it('should call onError when connection fails', async () => {
      const error = new Error('Connection failed');
      mockOnConnect.mockRejectedValueOnce(error);

      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(mockOnError).toHaveBeenCalledWith('Connection failed');
    });

    it('should handle non-Error objects in connection failure', async () => {
      mockOnConnect.mockRejectedValueOnce('String error');

      renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
          onError: mockOnError,
        }),
      );

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(mockOnError).toHaveBeenCalledWith('Unknown connection error');
    });
  });

  describe('Cleanup', () => {
    it('should disconnect and clean up on unmount', () => {
      const { unmount } = renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      act(() => {
        jest.runOnlyPendingTimers();
      });
      expect(mockOnConnect).toHaveBeenCalledTimes(1);

      unmount();

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
    });
  });
});
