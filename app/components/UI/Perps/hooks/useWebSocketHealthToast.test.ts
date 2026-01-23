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

describe('useWebSocketHealthToast', () => {
  let mockUnsubscribe: jest.Mock;
  let connectionStateCallback: (
    state: WebSocketConnectionState,
    attempt: number,
  ) => void;

  beforeEach(() => {
    jest.clearAllMocks();
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
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });

      // Should not show toast for initial CONNECTED state
      expect(mockShow).not.toHaveBeenCalled();
    });

    it('should show toast when initial state is DISCONNECTED', () => {
      renderHook(() => useWebSocketHealthToast());

      // Simulate initial callback with DISCONNECTED state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTED, 1);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.DISCONNECTED,
        1,
      );
    });

    it('should show toast when initial state is CONNECTING', () => {
      renderHook(() => useWebSocketHealthToast());

      // Simulate initial callback with CONNECTING state
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTING, 2);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.CONNECTING,
        2,
      );
    });
  });

  describe('State transitions', () => {
    it('should show disconnected toast on CONNECTED → DISCONNECTED transition', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: CONNECTED (initial state)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });
      mockShow.mockClear();

      // Second callback: DISCONNECTED (transition)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTED, 1);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.DISCONNECTED,
        1,
      );
    });

    it('should show connecting toast on DISCONNECTED → CONNECTING transition', () => {
      renderHook(() => useWebSocketHealthToast());

      // First callback: DISCONNECTED (initial - marks as experienced disconnection)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTED, 1);
      });
      mockShow.mockClear();

      // Second callback: CONNECTING (transition)
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTING, 2);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.CONNECTING,
        2,
      );
    });

    it('should show success toast on reconnection (DISCONNECTED → CONNECTING → CONNECTED)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });

      // Disconnected
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTED, 1);
      });
      mockShow.mockClear();

      // Reconnecting
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTING, 2);
      });
      mockShow.mockClear();

      // Reconnected successfully
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.CONNECTED,
        0,
      );
    });

    it('should NOT show success toast on initial connection (no prior disconnection)', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED - should NOT show toast
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
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
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });

      // Disconnected
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTED, 1);
      });
      mockShow.mockClear();

      // Reconnecting with attempt 3
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTING, 3);
      });

      expect(mockShow).toHaveBeenCalledWith(
        WebSocketConnectionState.CONNECTING,
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

  describe('DISCONNECTING state', () => {
    it('should not show toast for DISCONNECTING state', () => {
      renderHook(() => useWebSocketHealthToast());

      // Initial: CONNECTED
      act(() => {
        connectionStateCallback(WebSocketConnectionState.CONNECTED, 0);
      });
      mockShow.mockClear();

      // DISCONNECTING - no toast
      act(() => {
        connectionStateCallback(WebSocketConnectionState.DISCONNECTING, 0);
      });

      expect(mockShow).not.toHaveBeenCalled();
    });
  });
});
