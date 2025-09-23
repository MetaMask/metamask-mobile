import { renderHook, act } from '@testing-library/react-hooks';
import { AppState } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import Device from '../../../../util/device';
import { usePerpsConnectionLifecycle } from './usePerpsConnectionLifecycle';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

// Mock dependencies
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

    it('should disconnect immediately when tab becomes hidden', () => {
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

      // Change to hidden
      rerender({ isVisible: false });

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
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

    it('should schedule disconnection when app goes to background on iOS', () => {
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

      // Simulate app going to background
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.start).toHaveBeenCalled();
      expect(mockOnDisconnect).not.toHaveBeenCalled();

      // Advance time to trigger disconnection
      act(() => {
        jest.advanceTimersByTime(PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
      });

      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
      expect(BackgroundTimer.stop).toHaveBeenCalled();
    });

    it('should cancel disconnection when app returns to foreground quickly on iOS', () => {
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

      // Simulate app going to background
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.start).toHaveBeenCalled();

      // Return to foreground before timer expires
      act(() => {
        jest.advanceTimersByTime(5000); // 5 seconds
        mockAppStateListener?.('active');
      });

      expect(BackgroundTimer.stop).toHaveBeenCalled();
      expect(mockOnDisconnect).not.toHaveBeenCalled();

      // Verify timer doesn't fire later
      act(() => {
        jest.advanceTimersByTime(PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
      });
      expect(mockOnDisconnect).not.toHaveBeenCalled();
    });
  });

  describe('App State Changes - Android', () => {
    beforeEach(() => {
      mockIsIos.mockReturnValue(false);
      mockIsAndroid.mockReturnValue(true);
    });

    it('should schedule disconnection when app goes to background on Android', () => {
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

      // Simulate app going to background
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.setTimeout).toHaveBeenCalledWith(
        expect.any(Function),
        PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY,
      );
    });

    it('should cancel disconnection when app returns to foreground quickly on Android', () => {
      const mockTimerId = 123;
      (BackgroundTimer.setTimeout as jest.Mock).mockReturnValue(mockTimerId);

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

      // Simulate app going to background
      act(() => {
        mockAppStateListener?.('background');
      });

      // Return to foreground before timer expires
      act(() => {
        mockAppStateListener?.('active');
      });

      expect(BackgroundTimer.clearTimeout).toHaveBeenCalledWith(mockTimerId);
      expect(mockOnDisconnect).not.toHaveBeenCalled();
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

      // Hide tab
      rerender({ isVisible: false });
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);

      mockOnConnect.mockClear();

      // App goes to background and returns
      act(() => {
        mockAppStateListener?.('background');
        jest.advanceTimersByTime(1000);
        mockAppStateListener?.('active');
      });

      // Should not reconnect because tab is not visible
      expect(mockOnConnect).not.toHaveBeenCalled();
    });

    it('should cancel background timer when tab becomes hidden', () => {
      mockIsIos.mockReturnValue(true);
      const { rerender } = renderHook(
        ({ isVisible }) =>
          usePerpsConnectionLifecycle({
            isVisible,
            onConnect: mockOnConnect,
            onDisconnect: mockOnDisconnect,
          }),
        { initialProps: { isVisible: true } },
      );

      // App goes to background
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.start).toHaveBeenCalled();

      // Tab becomes hidden before timer expires
      rerender({ isVisible: false });

      expect(BackgroundTimer.stop).toHaveBeenCalled();
      expect(mockOnDisconnect).toHaveBeenCalledTimes(1);
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

    it('should clean up background timer on unmount', () => {
      mockIsIos.mockReturnValue(true);
      const { unmount } = renderHook(() =>
        usePerpsConnectionLifecycle({
          isVisible: true,
          onConnect: mockOnConnect,
          onDisconnect: mockOnDisconnect,
        }),
      );

      // Start background timer
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.start).toHaveBeenCalled();

      unmount();

      expect(BackgroundTimer.stop).toHaveBeenCalled();
    });
  });
});
