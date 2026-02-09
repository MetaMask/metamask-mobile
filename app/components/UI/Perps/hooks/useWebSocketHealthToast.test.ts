/**
 * Tests for useWebSocketHealthToast hook
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocketHealthToast } from './useWebSocketHealthToast';
import { WebSocketConnectionState } from '../controllers/types';

// Mock usePerpsConnection
const mockUsePerpsConnection = jest.fn();
jest.mock('./usePerpsConnection', () => ({
  usePerpsConnection: () => mockUsePerpsConnection(),
}));

// Mock useWebSocketHealthToastContext
const mockShow = jest.fn();
const mockHide = jest.fn();
const mockSetOnRetry = jest.fn();
jest.mock('../components/PerpsWebSocketHealthToast', () => ({
  useWebSocketHealthToastContext: () => ({
    show: mockShow,
    hide: mockHide,
    setOnRetry: mockSetOnRetry,
  }),
}));

// Mock Engine
const mockReconnect = jest.fn();
const mockSubscribeToConnectionState = jest.fn();
jest.mock('../../../../core/Engine', () => ({
  context: {
    PerpsController: {
      get reconnect() {
        return mockReconnect;
      },
      get subscribeToConnectionState() {
        return mockSubscribeToConnectionState;
      },
    },
  },
}));

// Auto-retry delay constant (must match the one in the hook)
const AUTO_RETRY_DELAY_MS = 10000;
// Offline banner delay (must match the one in the hook)
const OFFLINE_BANNER_DELAY_MS = 1000;

describe('useWebSocketHealthToast', () => {
  let mockUnsubscribe: jest.Mock;
  let connectionStateCallback: (
    state: WebSocketConnectionState,
    attempt: number,
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    mockUnsubscribe = jest.fn();

    // Default mock implementation
    mockUsePerpsConnection.mockReturnValue({
      isConnected: true,
      isInitialized: true,
    });

    // Capture the callback when subscribing
    mockSubscribeToConnectionState.mockImplementation(
      (
        callback: (state: WebSocketConnectionState, attempt: number) => void,
      ) => {
        connectionStateCallback = callback;
        return mockUnsubscribe;
      },
    );
  });

  describe('Initial mount behavior', () => {
    it('should not show toast when initial state is CONNECTED', () => {
      renderHook(() => useWebSocketHealthToast());

      // Simulate initial callback with CONNECTED state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Should not show toast for initial CONNECTED state
      expect(mockShow).not.toHaveBeenCalled();
    });

    it('should show toast when initial state is DISCONNECTED (after delay)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Simulate initial callback with DISCONNECTED state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        1,
      );
    });

    it('should show toast when initial state is CONNECTING (after delay)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Simulate initial callback with CONNECTING state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connecting,
        2,
      );
    });
  });

  describe('State transitions', () => {
    it('should show disconnected toast on CONNECTED → DISCONNECTED transition (after delay)', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: CONNECTED (initial state)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

      // Second callback: DISCONNECTED (transition - schedules show after delay)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Disconnected,
        1,
      );
    });

    it('should show connecting toast on DISCONNECTED → CONNECTING transition (after delay)', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: DISCONNECTED (initial - marks as experienced disconnection)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });
      mockShow.mockClear();

      // Second callback: CONNECTING (transition - schedules show after delay)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connecting,
        2,
      );
    });

    it('should show success toast on reconnection (DISCONNECTED → CONNECTING → CONNECTED)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Disconnected (schedules show after delay; we reconnect before delay)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      mockShow.mockClear();

      // Reconnecting (schedules show after delay; we reconnect before delay)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });
      mockShow.mockClear();

      // Reconnected successfully (clears delay, shows Connected immediately)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
    });

    it('should NOT show success toast on initial connection (no prior disconnection)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED - should NOT show toast
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('Retry callback', () => {
    it('should register retry callback on mount', () => {
      renderHook(() => useWebSocketHealthToast());

      expect(mockSetOnRetry).toHaveBeenCalledWith(expect.any(Function));
    });

    it('should call PerpsController.reconnect when retry is invoked', () => {
      renderHook(() => useWebSocketHealthToast());

      // Get the retry callback that was registered
      const retryCallback = mockSetOnRetry.mock.calls[0][0];

      // Invoke the retry callback
      act(() => {
        retryCallback();
      });

      expect(mockReconnect).toHaveBeenCalled();
    });
  });

  describe('Cleanup on unmount', () => {
    it('should unsubscribe and hide toast on unmount', () => {
      const { unmount } = renderHook(() => useWebSocketHealthToast());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockHide).toHaveBeenCalled();
    });
  });

  describe('Reconnection attempt tracking', () => {
    it('should pass reconnection attempt number to show()', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Disconnected
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });
      mockShow.mockClear();

      // Reconnecting with attempt 3 (schedules show after delay)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 3);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connecting,
        3,
      );
    });
  });

  describe('Subscription behavior', () => {
    it('should not subscribe when isConnected is false', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: true,
      });

      mockSubscribeToConnectionState.mockClear();

      renderHook(() => useWebSocketHealthToast());

      expect(mockSubscribeToConnectionState).not.toHaveBeenCalled();
    });

    it('should not subscribe when isInitialized is false', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: false,
      });

      mockSubscribeToConnectionState.mockClear();

      renderHook(() => useWebSocketHealthToast());

      expect(mockSubscribeToConnectionState).not.toHaveBeenCalled();
    });

    it('should subscribe when both isConnected and isInitialized are true', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: true,
      });

      mockSubscribeToConnectionState.mockClear();

      renderHook(() => useWebSocketHealthToast());

      expect(mockSubscribeToConnectionState).toHaveBeenCalled();
    });
  });

  describe('Offline banner delay (flicker prevention)', () => {
    it('should NOT show offline banner if reconnected within delay', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

      // Disconnected (schedules show after 1s)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockShow).not.toHaveBeenCalled();

      // Reconnect before delay expires
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 1);
      });
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Advance past the banner delay - show was never scheduled for Disconnected/Connecting
      // because we cleared the timer when we got Connected
      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      // Should only have shown Connected (reconnection success), not Disconnected
      expect(mockShow).toHaveBeenCalledTimes(1);
      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
    });
  });

  describe('DISCONNECTING state', () => {
    it('should not show toast for DISCONNECTING state', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

      // DISCONNECTING - no toast
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnecting, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('Auto-retry behavior', () => {
    it('should schedule auto-retry when entering DISCONNECTED state', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Transition to DISCONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      // reconnect should not be called yet
      expect(mockReconnect).not.toHaveBeenCalled();

      // Advance timers by auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS);
      });

      // reconnect should now be called
      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });

    it('should schedule auto-retry when initial state is DISCONNECTED', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial callback with DISCONNECTED state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockReconnect).not.toHaveBeenCalled();

      // Advance timers by auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS);
      });

      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });

    it('should cancel auto-retry when entering CONNECTING state', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Transition to DISCONNECTED (schedules auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      // Transition to CONNECTING (should cancel auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });

      // Advance timers past auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      // reconnect should NOT have been called (auto-retry was cancelled)
      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('should cancel auto-retry when entering CONNECTED state', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: DISCONNECTED (schedules auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      // Transition to CONNECTED (should cancel auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      // Advance timers past auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      // reconnect should NOT have been called (auto-retry was cancelled)
      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('should cancel auto-retry when manual retry is triggered', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: DISCONNECTED (schedules auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      // Get the retry callback and invoke it (manual retry)
      const retryCallback = mockSetOnRetry.mock.calls[0][0];
      act(() => {
        retryCallback();
      });

      // Manual retry should have called reconnect
      expect(mockReconnect).toHaveBeenCalledTimes(1);
      mockReconnect.mockClear();

      // Advance timers past auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      // reconnect should NOT have been called again (auto-retry was cancelled by manual retry)
      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('should cancel auto-retry on unmount', () => {
      const { unmount } = renderHook(() => useWebSocketHealthToast());

      // Initial: DISCONNECTED (schedules auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      // Unmount
      unmount();

      // Advance timers past auto-retry delay
      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      // reconnect should NOT have been called (auto-retry was cancelled on unmount)
      expect(mockReconnect).not.toHaveBeenCalled();
    });
  });
});
