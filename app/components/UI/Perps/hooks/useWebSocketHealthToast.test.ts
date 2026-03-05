/**
 * Tests for useWebSocketHealthToast hook
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useWebSocketHealthToast } from './useWebSocketHealthToast';
import { WebSocketConnectionState } from '@metamask/perps-controller';

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
    it('skips toast when first callback is CONNECTED (happy path)', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });

    it('skips toast when first callback is DISCONNECTED (snapshot only, not a real event)', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });

    it('skips toast when first callback is CONNECTING (snapshot only, not a real event)', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });

    it('schedules Connecting banner after Disconnected snapshot when WS starts reconnecting', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 0);
      });

      // Second callback: real transition
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 1);
      });

      expect(mockShow).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connecting,
        1,
      );
    });
  });

  describe('State transitions', () => {
    it('shows Disconnected toast after CONNECTED → DISCONNECTED transition', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

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

    it('shows Connecting toast after DISCONNECTED → CONNECTING transition', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });
      mockShow.mockClear();

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

    it('shows Connected toast on reconnection after DISCONNECTED → CONNECTING → CONNECTED', () => {
      renderHook(() => useWebSocketHealthToast());

      // Snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      mockShow.mockClear();

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });
      mockShow.mockClear();

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
    });

    it('omits Connected toast on initial connection with no prior disconnection', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('Retry callback', () => {
    it('registers retry callback on mount', () => {
      renderHook(() => useWebSocketHealthToast());

      expect(mockSetOnRetry).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls PerpsController.reconnect when retry callback is invoked', () => {
      renderHook(() => useWebSocketHealthToast());

      const retryCallback = mockSetOnRetry.mock.calls[0][0];

      act(() => {
        retryCallback();
      });

      expect(mockReconnect).toHaveBeenCalled();
    });
  });

  describe('Cleanup on unmount', () => {
    it('calls unsubscribe and hide on unmount', () => {
      const { unmount } = renderHook(() => useWebSocketHealthToast());

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockHide).toHaveBeenCalled();
    });
  });

  describe('Reconnection attempt tracking', () => {
    it('passes reconnection attempt number to show()', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });
      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });
      mockShow.mockClear();

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
    it('skips subscription when isConnected is false', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: false,
        isInitialized: true,
      });

      mockSubscribeToConnectionState.mockClear();

      renderHook(() => useWebSocketHealthToast());

      expect(mockSubscribeToConnectionState).not.toHaveBeenCalled();
    });

    it('skips subscription when isInitialized is false', () => {
      mockUsePerpsConnection.mockReturnValue({
        isConnected: true,
        isInitialized: false,
      });

      mockSubscribeToConnectionState.mockClear();

      renderHook(() => useWebSocketHealthToast());

      expect(mockSubscribeToConnectionState).not.toHaveBeenCalled();
    });

    it('subscribes when both isConnected and isInitialized are true', () => {
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
    it('omits offline banner when connection restores within the delay window', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockShow).not.toHaveBeenCalled();

      // Restore before delay expires
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 1);
      });
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        jest.advanceTimersByTime(OFFLINE_BANNER_DELAY_MS);
      });

      // Only the Connected (back-online) toast, not Disconnected
      expect(mockShow).toHaveBeenCalledTimes(1);
      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.Connected,
        0,
      );
    });
  });

  describe('DISCONNECTING state', () => {
    it('omits toast for DISCONNECTING state', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });
      mockShow.mockClear();

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnecting, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });
  });

  describe('Auto-retry behavior', () => {
    it('fires reconnect after auto-retry delay on CONNECTED → DISCONNECTED transition', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockReconnect).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS);
      });

      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });

    it('fires reconnect after auto-retry delay when WS transitions to DISCONNECTED after snapshot', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: snapshot (no auto-retry)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      expect(mockReconnect).not.toHaveBeenCalled();

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS);
      });

      expect(mockReconnect).toHaveBeenCalledTimes(1);
    });

    it('cancels pending auto-retry on DISCONNECTED → CONNECTING transition', () => {
      renderHook(() => useWebSocketHealthToast());

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connecting, 2);
      });

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('cancels pending auto-retry on DISCONNECTED → CONNECTED transition', () => {
      renderHook(() => useWebSocketHealthToast());

      // Snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('cancels pending auto-retry when manual retry is triggered', () => {
      renderHook(() => useWebSocketHealthToast());

      // Snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      const retryCallback = mockSetOnRetry.mock.calls[0][0];
      act(() => {
        retryCallback();
      });

      expect(mockReconnect).toHaveBeenCalledTimes(1);
      mockReconnect.mockClear();

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      expect(mockReconnect).not.toHaveBeenCalled();
    });

    it('cancels pending auto-retry on unmount', () => {
      const { unmount } = renderHook(() => useWebSocketHealthToast());

      // Snapshot
      act(() => {
        connectionStateCallback(WebSocketConnectionState.Connected, 0);
      });

      act(() => {
        connectionStateCallback(WebSocketConnectionState.Disconnected, 1);
      });

      unmount();

      act(() => {
        jest.advanceTimersByTime(AUTO_RETRY_DELAY_MS + 1000);
      });

      expect(mockReconnect).not.toHaveBeenCalled();
    });
  });
});
