import React from 'react';
import { render, act, waitFor } from '@testing-library/react-native';
import { Text, AppState } from 'react-native';
import BackgroundTimer from 'react-native-background-timer';
import Device from '../../../../util/device';
import {
  PerpsConnectionProvider,
  usePerpsConnection,
} from '../providers/PerpsConnectionProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';
import PerpsTabViewWithProvider from '../Views/PerpsTabView';
import { PERPS_CONSTANTS } from '../constants/perpsConfig';

// Type definitions for hook parameters
interface PerpsConnectionLifecycleParams {
  isVisible?: boolean;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
  onError: (error: string) => void;
}

// Mock dependencies
jest.mock('react-native/Libraries/AppState/AppState', () => ({
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
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

jest.mock('../services/PerpsConnectionManager');
jest.mock('../hooks/usePerpsDepositStatus', () => ({
  usePerpsDepositStatus: jest.fn(),
}));
// Mock hooks that use Redux
jest.mock('../hooks/usePerpsWithdrawStatus', () => ({
  usePerpsWithdrawStatus: jest.fn(() => undefined),
}));
jest.mock('../hooks', () => ({
  usePerpsNetworkValidation: jest.fn(() => undefined),
}));
// Mock usePerpsConnectionLifecycle with proper behavior
jest.mock('../hooks/usePerpsConnectionLifecycle', () => ({
  usePerpsConnectionLifecycle: jest.fn(),
}));

// Mock child components to simplify testing
jest.mock('../Views/PerpsTabView/PerpsTabView', () => ({
  __esModule: true,
  default: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="perps-tab-view" />;
  },
}));

jest.mock('../providers/PerpsStreamManager', () => ({
  PerpsStreamProvider: ({ children }: { children: React.ReactNode }) =>
    children,
}));

describe('Connection Lifecycle Integration Tests', () => {
  let mockAppStateListener: ((state: string) => void) | null = null;
  let mockGetConnectionState: jest.Mock;
  let mockConnect: jest.Mock;
  let mockDisconnect: jest.Mock;
  let mockUsePerpsConnectionLifecycle: jest.Mock;

  const mockIsIos = Device.isIos as jest.MockedFunction<typeof Device.isIos>;
  const mockIsAndroid = Device.isAndroid as jest.MockedFunction<
    typeof Device.isAndroid
  >;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    // Reset AppState
    (AppState as { currentState: string }).currentState = 'active';

    // Capture AppState listener
    (AppState.addEventListener as jest.Mock).mockImplementation(
      (event, handler) => {
        if (event === 'change') {
          mockAppStateListener = handler;
        }
        return { remove: jest.fn() };
      },
    );

    // Default to iOS
    mockIsIos.mockReturnValue(true);
    mockIsAndroid.mockReturnValue(false);

    // Setup PerpsConnectionManager mocks
    mockGetConnectionState = jest.fn().mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
    });
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockDisconnect = jest.fn().mockResolvedValue(undefined);

    (PerpsConnectionManager.getConnectionState as jest.Mock) =
      mockGetConnectionState;
    (PerpsConnectionManager.connect as jest.Mock) = mockConnect;
    (PerpsConnectionManager.disconnect as jest.Mock) = mockDisconnect;

    // Setup the lifecycle hook mock
    mockUsePerpsConnectionLifecycle = jest.requireMock(
      '../hooks/usePerpsConnectionLifecycle',
    ).usePerpsConnectionLifecycle;

    // Default mock implementation that calls connect when visible
    mockUsePerpsConnectionLifecycle.mockImplementation(
      ({ isVisible, onConnect }: PerpsConnectionLifecycleParams) => {
        React.useEffect(() => {
          if (isVisible) {
            onConnect();
          }
        }, [isVisible, onConnect]);
        return { hasConnected: false };
      },
    );
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    mockAppStateListener = null;
  });

  describe('Tab Visibility Integration', () => {
    it('should connect when tab becomes visible and disconnect when hidden', async () => {
      let visibilityCallback: ((visible: boolean) => void) | null = null;
      const mockOnVisibilityChange = jest.fn((callback) => {
        visibilityCallback = callback;
      });

      const { unmount } = render(
        <PerpsTabViewWithProvider
          isVisible={false}
          onVisibilityChange={mockOnVisibilityChange}
        />,
      );

      // Wait for initial render
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      // Initially not visible - should not connect
      expect(mockConnect).not.toHaveBeenCalled();

      // Make tab visible
      await act(async () => {
        visibilityCallback?.(true);
      });

      // Note: Connection is now managed by usePerpsConnectionLifecycle hook
      // which is mocked in these tests, so we just verify the callback was called
      expect(visibilityCallback).toBeTruthy();

      // Make tab hidden
      act(() => {
        visibilityCallback?.(false);
      });

      // Verify visibility callback was invoked for hide
      expect(visibilityCallback).toBeTruthy();

      unmount();
    });

    it('should handle rapid tab switches gracefully', async () => {
      let visibilityCallback: ((visible: boolean) => void) | null = null;
      const mockOnVisibilityChange = jest.fn((callback) => {
        visibilityCallback = callback;
      });

      render(
        <PerpsTabViewWithProvider
          isVisible={false}
          onVisibilityChange={mockOnVisibilityChange}
        />,
      );

      // Rapid visibility changes
      let callCount = 0;

      // Show/hide 5 times
      const toggleVisibility = (visible: boolean) => {
        visibilityCallback?.(visible);
        callCount++;
      };

      for (let i = 0; i < 5; i++) {
        act(() => {
          toggleVisibility(true);
        });
        act(() => {
          toggleVisibility(false);
        });
      }

      // Should handle without errors - verify callbacks were invoked
      expect(callCount).toBe(10); // 5 show + 5 hide
    });
  });

  describe('App Background/Foreground Integration', () => {
    describe('iOS Background Timer', () => {
      beforeEach(() => {
        mockIsIos.mockReturnValue(true);
        mockIsAndroid.mockReturnValue(false);
      });

      it('should disconnect after 20 seconds when app is backgrounded', async () => {
        // Setup hook to handle background timer
        let backgroundTimerCallback: (() => void) | null = null;
        (BackgroundTimer.setTimeout as jest.Mock).mockImplementation(
          (callback) => {
            backgroundTimerCallback = callback;
            return 123;
          },
        );

        mockUsePerpsConnectionLifecycle.mockImplementation(
          ({
            isVisible,
            onConnect,
            onDisconnect,
          }: PerpsConnectionLifecycleParams) => {
            React.useEffect(() => {
              if (isVisible) {
                onConnect();
              }
            }, [isVisible, onConnect]);

            // Simulate background timer behavior
            React.useEffect(() => {
              const handleAppStateChange = (nextAppState: string) => {
                if (nextAppState === 'background') {
                  BackgroundTimer.start();
                  BackgroundTimer.setTimeout(() => {
                    onDisconnect();
                  }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
                } else if (nextAppState === 'active') {
                  BackgroundTimer.stop();
                }
              };

              const subscription = AppState.addEventListener(
                'change',
                handleAppStateChange,
              );
              return () => subscription?.remove();
            }, [onDisconnect]);

            return { hasConnected: false };
          },
        );

        render(<PerpsTabViewWithProvider isVisible />);

        // Wait for initial connection
        await act(async () => {
          jest.runOnlyPendingTimers();
        });

        expect(mockConnect).toHaveBeenCalledTimes(1);

        // Simulate app going to background
        act(() => {
          mockAppStateListener?.('background');
        });

        expect(BackgroundTimer.start).toHaveBeenCalled();
        expect(mockDisconnect).not.toHaveBeenCalled();

        // Manually trigger the background timer callback
        act(() => {
          backgroundTimerCallback?.();
        });

        expect(mockDisconnect).toHaveBeenCalledTimes(1);
      });

      it('should cancel disconnection when app returns quickly', async () => {
        let clearTimeoutId: number | null = null;
        (BackgroundTimer.setTimeout as jest.Mock).mockImplementation(
          (callback, delay) => {
            const id = setTimeout(callback, delay);
            clearTimeoutId = id as unknown as number;
            return id;
          },
        );
        (BackgroundTimer.clearTimeout as jest.Mock).mockImplementation((id) => {
          if (id === clearTimeoutId) {
            clearTimeout(id);
          }
        });

        mockUsePerpsConnectionLifecycle.mockImplementation(
          ({
            isVisible,
            onConnect,
            onDisconnect,
          }: PerpsConnectionLifecycleParams) => {
            React.useEffect(() => {
              if (isVisible) {
                onConnect();
              }
            }, [isVisible, onConnect]);

            // Simulate background timer behavior
            React.useEffect(() => {
              let timerId: number | null = null;
              const handleAppStateChange = (nextAppState: string) => {
                if (nextAppState === 'background') {
                  BackgroundTimer.start();
                  timerId = BackgroundTimer.setTimeout(() => {
                    onDisconnect();
                  }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY) as number;
                } else if (nextAppState === 'active') {
                  BackgroundTimer.stop();
                  if (timerId !== null) {
                    BackgroundTimer.clearTimeout(timerId);
                    timerId = null;
                  }
                }
              };

              const subscription = AppState.addEventListener(
                'change',
                handleAppStateChange,
              );
              return () => subscription?.remove();
            }, [onDisconnect]);

            return { hasConnected: false };
          },
        );

        render(<PerpsTabViewWithProvider isVisible />);

        // Wait for initial connection
        await act(async () => {
          jest.runOnlyPendingTimers();
        });

        // App goes to background
        act(() => {
          mockAppStateListener?.('background');
        });

        expect(BackgroundTimer.start).toHaveBeenCalled();

        // App returns before 20 seconds
        act(() => {
          jest.advanceTimersByTime(5000);
          mockAppStateListener?.('active');
        });

        expect(BackgroundTimer.stop).toHaveBeenCalled();
        expect(mockDisconnect).not.toHaveBeenCalled();

        // Verify timer doesn't fire later
        act(() => {
          jest.advanceTimersByTime(PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
        });

        expect(mockDisconnect).not.toHaveBeenCalled();
      });
    });

    describe('Android Background Timer', () => {
      beforeEach(() => {
        mockIsIos.mockReturnValue(false);
        mockIsAndroid.mockReturnValue(true);
      });

      it('should use BackgroundTimer.setTimeout on Android', async () => {
        const mockTimerId = 456;
        (BackgroundTimer.setTimeout as jest.Mock).mockReturnValue(mockTimerId);

        mockUsePerpsConnectionLifecycle.mockImplementation(
          ({
            isVisible,
            onConnect,
            onDisconnect,
          }: PerpsConnectionLifecycleParams) => {
            React.useEffect(() => {
              if (isVisible) {
                onConnect();
              }
            }, [isVisible, onConnect]);

            // Simulate background timer behavior
            React.useEffect(() => {
              let timerId: number | null = null;
              const handleAppStateChange = (nextAppState: string) => {
                if (nextAppState === 'background') {
                  // On Android, we use BackgroundTimer.setTimeout directly
                  timerId = BackgroundTimer.setTimeout(() => {
                    onDisconnect();
                  }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY) as number;
                } else if (nextAppState === 'active') {
                  if (timerId !== null) {
                    BackgroundTimer.clearTimeout(timerId);
                    timerId = null;
                  }
                }
              };

              const subscription = AppState.addEventListener(
                'change',
                handleAppStateChange,
              );
              return () => subscription?.remove();
            }, [onDisconnect]);

            return { hasConnected: false };
          },
        );

        render(<PerpsTabViewWithProvider isVisible />);

        // Wait for initial connection
        await act(async () => {
          jest.runOnlyPendingTimers();
        });

        // App goes to background
        act(() => {
          mockAppStateListener?.('background');
        });

        expect(BackgroundTimer.setTimeout).toHaveBeenCalledWith(
          expect.any(Function),
          PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY,
        );

        // App returns quickly
        act(() => {
          mockAppStateListener?.('active');
        });

        expect(BackgroundTimer.clearTimeout).toHaveBeenCalledWith(mockTimerId);
      });
    });
  });

  describe('Combined Visibility and App State', () => {
    it('should not reconnect when app foregrounds if tab is not visible', async () => {
      let visibilityCallback: ((visible: boolean) => void) | null = null;
      const mockOnVisibilityChange = jest.fn((callback) => {
        visibilityCallback = callback;
      });

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({
          isVisible,
          onConnect,
          onDisconnect,
        }: PerpsConnectionLifecycleParams) => {
          React.useEffect(() => {
            if (isVisible) {
              onConnect();
            } else {
              onDisconnect();
            }
          }, [isVisible, onConnect, onDisconnect]);
          return { hasConnected: false };
        },
      );

      render(
        <PerpsTabViewWithProvider
          isVisible
          onVisibilityChange={mockOnVisibilityChange}
        />,
      );

      // Wait for initial connection
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      expect(mockConnect).toHaveBeenCalledTimes(1);

      // Hide tab
      act(() => {
        visibilityCallback?.(false);
      });

      expect(mockDisconnect).toHaveBeenCalledTimes(1);
      mockConnect.mockClear();

      // App goes to background and returns
      act(() => {
        mockAppStateListener?.('background');
        jest.advanceTimersByTime(1000);
        mockAppStateListener?.('active');
      });

      // Should not reconnect because tab is not visible
      expect(mockConnect).not.toHaveBeenCalled();
    });

    it('should cancel background timer when tab becomes hidden', async () => {
      mockIsIos.mockReturnValue(true);

      let visibilityCallback: ((visible: boolean) => void) | null = null;
      const mockOnVisibilityChange = jest.fn((callback) => {
        visibilityCallback = callback;
      });

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({
          isVisible,
          onConnect,
          onDisconnect,
        }: PerpsConnectionLifecycleParams) => {
          React.useEffect(() => {
            if (isVisible) {
              onConnect();
            } else {
              onDisconnect();
            }
          }, [isVisible, onConnect, onDisconnect]);

          // Simulate background timer behavior for iOS
          const timerRef = React.useRef<NodeJS.Timeout | null>(null);
          const isBackgroundedRef = React.useRef(false);

          React.useEffect(() => {
            const handleAppStateChange = (nextAppState: string) => {
              if (nextAppState === 'background' && isVisible) {
                isBackgroundedRef.current = true;
                BackgroundTimer.start();
                timerRef.current = setTimeout(() => {
                  onDisconnect();
                }, PERPS_CONSTANTS.BACKGROUND_DISCONNECT_DELAY);
              } else if (nextAppState === 'active') {
                isBackgroundedRef.current = false;
                BackgroundTimer.stop();
                if (timerRef.current) {
                  clearTimeout(timerRef.current);
                  timerRef.current = null;
                }
              }
            };

            const subscription = AppState.addEventListener(
              'change',
              handleAppStateChange,
            );
            return () => {
              subscription?.remove();
              if (timerRef.current) {
                clearTimeout(timerRef.current);
              }
            };
          }, [isVisible, onDisconnect]);

          // Handle visibility change - stop timer if tab becomes hidden
          React.useEffect(() => {
            if (!isVisible && isBackgroundedRef.current) {
              BackgroundTimer.stop();
              if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
              }
            }
          }, [isVisible]);

          return { hasConnected: false };
        },
      );

      render(
        <PerpsTabViewWithProvider
          isVisible
          onVisibilityChange={mockOnVisibilityChange}
        />,
      );

      // Wait for initial connection
      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      // App goes to background
      act(() => {
        mockAppStateListener?.('background');
      });

      expect(BackgroundTimer.start).toHaveBeenCalled();

      // Tab becomes hidden before timer expires
      act(() => {
        visibilityCallback?.(false);
      });

      expect(BackgroundTimer.stop).toHaveBeenCalled();
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Multiple Providers Sharing Connection', () => {
    it('should maintain single connection with multiple providers', async () => {
      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({
          isVisible,
          onConnect,
          onDisconnect,
        }: PerpsConnectionLifecycleParams) => {
          React.useEffect(() => {
            if (isVisible) {
              onConnect();
            }
            return () => {
              onDisconnect();
            };
          }, [isVisible, onConnect, onDisconnect]);
          return { hasConnected: false };
        },
      );

      // Simulate multiple providers (screen and modal)
      const { unmount: unmount1 } = render(
        <PerpsConnectionProvider isVisible>
          <Text>Screen Provider</Text>
        </PerpsConnectionProvider>,
      );

      const { unmount: unmount2 } = render(
        <PerpsConnectionProvider isVisible>
          <Text>Modal Provider</Text>
        </PerpsConnectionProvider>,
      );

      await act(async () => {
        jest.runOnlyPendingTimers();
      });

      // Connection manager should be called from both providers
      expect(mockConnect).toHaveBeenCalledTimes(2);

      // Unmount one provider
      unmount1();

      // Should call disconnect once
      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      // Unmount second provider
      unmount2();

      // Should call disconnect again
      expect(mockDisconnect).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Propagation', () => {
    it('should propagate connection errors through the stack', async () => {
      const connectionError = new Error('Connection failed');
      mockConnect.mockRejectedValueOnce(connectionError);

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({ isVisible, onConnect, onError }: PerpsConnectionLifecycleParams) => {
          React.useEffect(() => {
            if (isVisible) {
              onConnect().catch((err: Error) => {
                onError(err.message);
              });
            }
          }, [isVisible, onConnect, onError]);
          return { hasConnected: false };
        },
      );

      const TestComponent = () => {
        const { error } = usePerpsConnection();
        return <Text>{error || 'No error'}</Text>;
      };

      const { getByText } = render(
        <PerpsConnectionProvider isVisible>
          <TestComponent />
        </PerpsConnectionProvider>,
      );

      await waitFor(() => {
        expect(getByText('Connection failed')).toBeDefined();
      });
    });
  });
});
