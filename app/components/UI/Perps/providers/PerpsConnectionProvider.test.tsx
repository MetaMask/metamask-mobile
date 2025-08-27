import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import {
  PerpsConnectionProvider,
  usePerpsConnection,
} from './PerpsConnectionProvider';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

// Mock dependencies
jest.mock('../services/PerpsConnectionManager');
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));
jest.mock('../components/PerpsLoadingSkeleton', () => ({
  __esModule: true,
  default: () => {
    const { View } = jest.requireActual('react-native');
    return <View testID="perps-loading-skeleton" />;
  },
}));
jest.mock('../hooks/usePerpsDepositStatus', () => ({
  usePerpsDepositStatus: jest.fn(() => ({ depositInProgress: false })),
}));
jest.mock('../hooks/usePerpsConnectionLifecycle', () => ({
  usePerpsConnectionLifecycle: jest.fn(() => ({ hasConnected: false })),
}));

// Test component that uses the hook
interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isInitialized: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  resetError: () => void;
}

const TestComponent = ({
  onRender,
}: {
  onRender?: (data: ConnectionState) => void;
}) => {
  const connectionState = usePerpsConnection();

  // Call onRender with the current state
  React.useEffect(() => {
    onRender?.(connectionState);
  }, [connectionState, onRender]);

  return (
    <Text testID="connection-status">
      {connectionState.isConnected ? 'Connected' : 'Disconnected'}
    </Text>
  );
};

describe('PerpsConnectionProvider', () => {
  let mockGetConnectionState: jest.Mock;
  let mockConnect: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default mocks - set isInitialized to true by default so tests see children
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
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('should render children correctly when initialized', () => {
    const { getByText } = render(
      <PerpsConnectionProvider>
        <Text>Child Component</Text>
      </PerpsConnectionProvider>,
    );

    expect(getByText('Child Component')).toBeDefined();
  });

  it('should render loading skeleton when initializing', () => {
    // Set isInitialized to false to trigger loading skeleton
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: true,
      isInitialized: false,
    });

    const { getByTestId, queryByText } = render(
      <PerpsConnectionProvider>
        <Text>Child Component</Text>
      </PerpsConnectionProvider>,
    );

    expect(getByTestId('perps-loading-skeleton')).toBeDefined();
    expect(queryByText('Child Component')).toBeNull();
  });

  it('should connect on mount', async () => {
    // Mock the lifecycle hook to trigger connection when visible
    const mockLifecycleHook = jest.requireMock(
      '../hooks/usePerpsConnectionLifecycle',
    ).usePerpsConnectionLifecycle;

    mockLifecycleHook.mockImplementation(
      ({ onConnect }: { onConnect: () => Promise<void> }) => {
        // Simulate immediate connection since isVisible defaults to true
        setTimeout(() => onConnect(), 0);
        return { hasConnected: false };
      },
    );

    render(
      <PerpsConnectionProvider isVisible>
        <Text>Test</Text>
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should disconnect on unmount', async () => {
    // Mock the lifecycle hook to trigger disconnection on unmount
    const mockLifecycleHook = jest.requireMock(
      '../hooks/usePerpsConnectionLifecycle',
    ).usePerpsConnectionLifecycle;

    let disconnectCallback: (() => Promise<void>) | null = null;
    mockLifecycleHook.mockImplementation(
      ({ onDisconnect }: { onDisconnect: () => Promise<void> }) => {
        disconnectCallback = onDisconnect;
        return { hasConnected: false };
      },
    );

    const { unmount } = render(
      <PerpsConnectionProvider>
        <Text>Test</Text>
      </PerpsConnectionProvider>,
    );

    // Simulate unmount triggering disconnect
    if (disconnectCallback) {
      await (disconnectCallback as () => Promise<void>)();
    }
    unmount();

    expect(mockDisconnect).toHaveBeenCalledTimes(1);
  });

  it('should provide connection state through context', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
    });

    const { getByTestId } = render(
      <PerpsConnectionProvider>
        <TestComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('connection-status')).toHaveTextContent('Connected');
    });
  });

  it('should update state when polling', async () => {
    const onRender = jest.fn();

    // Start with initialized but disconnected state
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
    });

    render(
      <PerpsConnectionProvider>
        <TestComponent onRender={onRender} />
      </PerpsConnectionProvider>,
    );

    // Wait for initial render
    await waitFor(() => {
      expect(onRender).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: false,
        }),
      );
    });

    // Change connection state
    mockGetConnectionState.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
    });

    // Fast-forward polling interval
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(onRender).toHaveBeenCalledWith(
        expect.objectContaining({
          isConnected: true,
        }),
      );
    });
  });

  it('should handle connect errors', async () => {
    const error = new Error('Connection failed');
    mockConnect.mockRejectedValue(error);

    // Mock lifecycle hook to trigger error
    const mockLifecycleHook = jest.requireMock(
      '../hooks/usePerpsConnectionLifecycle',
    ).usePerpsConnectionLifecycle;

    mockLifecycleHook.mockImplementation(
      ({
        onConnect,
        onError,
      }: {
        onConnect: () => Promise<void>;
        onError: (error: string) => void;
      }) => {
        setTimeout(async () => {
          try {
            await onConnect();
          } catch (err) {
            onError(err instanceof Error ? err.message : String(err));
          }
        }, 0);
        return { hasConnected: false };
      },
    );

    const onRender = jest.fn();

    render(
      <PerpsConnectionProvider isVisible>
        <TestComponent onRender={onRender} />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(onRender).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Connection failed',
        }),
      );
    });
  });

  it('should handle disconnect through context', async () => {
    const TestDisconnectComponent = () => {
      const { disconnect } = usePerpsConnection();

      React.useEffect(() => {
        disconnect();
      }, [disconnect]);

      return <Text>Test</Text>;
    };

    render(
      <PerpsConnectionProvider>
        <TestDisconnectComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  it('should handle connect through context', async () => {
    const TestConnectComponent = () => {
      const { connect } = usePerpsConnection();

      React.useEffect(() => {
        connect();
      }, [connect]);

      return <Text>Test</Text>;
    };

    render(
      <PerpsConnectionProvider>
        <TestConnectComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      // Called once from component
      expect(mockConnect).toHaveBeenCalledTimes(1);
    });
  });

  it('should reset error', async () => {
    const error = new Error('Test error');
    mockConnect.mockRejectedValue(error);

    const TestResetComponent = () => {
      const { error: contextError, resetError } = usePerpsConnection();

      React.useEffect(() => {
        if (contextError) {
          resetError();
        }
      }, [contextError, resetError]);

      return <Text>{contextError || 'No error'}</Text>;
    };

    const { getByText } = render(
      <PerpsConnectionProvider>
        <TestResetComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(getByText('No error')).toBeDefined();
    });
  });

  it('should throw error when usePerpsConnection is used outside provider', () => {
    const TestComponentOutsideProvider = () => {
      usePerpsConnection();
      return <Text>Test</Text>;
    };

    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      render(<TestComponentOutsideProvider />);
    }).toThrow('perps.errors.connectionRequired');

    console.error = originalError;
  });

  it('should handle unknown errors in connect', async () => {
    // Non-Error object thrown
    mockConnect.mockRejectedValue('String error');

    // Mock lifecycle hook to trigger error with non-Error object
    const mockLifecycleHook = jest.requireMock(
      '../hooks/usePerpsConnectionLifecycle',
    ).usePerpsConnectionLifecycle;

    mockLifecycleHook.mockImplementation(
      ({
        onConnect,
        onError,
      }: {
        onConnect: () => Promise<void>;
        onError: (error: string) => void;
      }) => {
        setTimeout(async () => {
          try {
            await onConnect();
          } catch (err) {
            // Simulate unknown error handling
            onError(
              err instanceof Error ? err.message : 'Unknown connection error',
            );
          }
        }, 0);
        return { hasConnected: false };
      },
    );

    const onRender = jest.fn();

    render(
      <PerpsConnectionProvider isVisible>
        <TestComponent onRender={onRender} />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(onRender).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Unknown connection error',
        }),
      );
    });
  });

  it('should handle errors in disconnect', async () => {
    const error = new Error('Disconnect failed');
    mockDisconnect.mockRejectedValueOnce(error);

    const TestDisconnectErrorComponent = () => {
      const { disconnect, error: contextError } = usePerpsConnection();

      React.useEffect(() => {
        disconnect();
      }, [disconnect]);

      return <Text>{contextError || 'No error'}</Text>;
    };

    const { getByText } = render(
      <PerpsConnectionProvider>
        <TestDisconnectErrorComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(getByText('Disconnect failed')).toBeDefined();
    });

    // Reset mock for next tests
    mockDisconnect.mockResolvedValue(undefined);
  });

  it('should clean up polling interval on unmount', () => {
    // Reset disconnect mock to default behavior
    mockDisconnect.mockResolvedValue(undefined);

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <PerpsConnectionProvider>
        <Text>Test</Text>
      </PerpsConnectionProvider>,
    );

    act(() => {
      unmount();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  describe('usePerpsConnectionLifecycle Hook Integration', () => {
    let mockUsePerpsConnectionLifecycle: jest.Mock;

    beforeEach(() => {
      mockUsePerpsConnectionLifecycle = jest.requireMock(
        '../hooks/usePerpsConnectionLifecycle',
      ).usePerpsConnectionLifecycle;
    });

    it('should call usePerpsConnectionLifecycle with correct parameters', () => {
      const { rerender } = render(
        <PerpsConnectionProvider isVisible>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      expect(mockUsePerpsConnectionLifecycle).toHaveBeenCalledWith(
        expect.objectContaining({
          isVisible: true,
          onConnect: expect.any(Function),
          onDisconnect: expect.any(Function),
          onError: expect.any(Function),
        }),
      );

      // Test with different visibility
      rerender(
        <PerpsConnectionProvider isVisible={false}>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      expect(mockUsePerpsConnectionLifecycle).toHaveBeenLastCalledWith(
        expect.objectContaining({
          isVisible: false,
        }),
      );
    });

    it('should update connection state when hook onConnect is called', async () => {
      let capturedOnConnect: (() => Promise<void>) | null = null;

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({ onConnect }: { onConnect: () => Promise<void> }) => {
          capturedOnConnect = onConnect;
          return { hasConnected: false };
        },
      );

      mockGetConnectionState.mockReturnValue({
        isConnected: false, // Start disconnected
        isConnecting: false,
        isInitialized: true,
      });

      const TestComponentConnect = () => {
        const { isConnected } = usePerpsConnection();
        return <Text>{isConnected ? 'Connected' : 'Not Connected'}</Text>;
      };

      const { getByText } = render(
        <PerpsConnectionProvider isVisible>
          <TestComponentConnect />
        </PerpsConnectionProvider>,
      );

      // Initially not connected
      expect(getByText('Not Connected')).toBeDefined();

      // Call the onConnect callback
      await act(async () => {
        if (capturedOnConnect) {
          // Update mock to return connected state after connect
          mockGetConnectionState.mockReturnValue({
            isConnected: true,
            isConnecting: false,
            isInitialized: true,
          });
          await capturedOnConnect();
        }
      });

      await waitFor(() => {
        expect(mockConnect).toHaveBeenCalled();
        expect(getByText('Connected')).toBeDefined();
      });
    });

    it('should update connection state when hook onDisconnect is called', async () => {
      let capturedOnDisconnect: (() => Promise<void>) | null = null;

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({ onDisconnect }: { onDisconnect: () => Promise<void> }) => {
          capturedOnDisconnect = onDisconnect;
          return { hasConnected: true };
        },
      );

      mockGetConnectionState
        .mockReturnValueOnce({
          isConnected: true,
          isConnecting: false,
          isInitialized: true,
        })
        .mockReturnValue({
          isConnected: false,
          isConnecting: false,
          isInitialized: false,
        });

      const TestComponentDisconnect = () => {
        const { isConnected } = usePerpsConnection();
        return <Text>{isConnected ? 'Connected' : 'Not Connected'}</Text>;
      };

      const { getByText } = render(
        <PerpsConnectionProvider isVisible={false}>
          <TestComponentDisconnect />
        </PerpsConnectionProvider>,
      );

      // Initially connected
      expect(getByText('Connected')).toBeDefined();

      // Call the onDisconnect callback
      await act(async () => {
        if (capturedOnDisconnect) {
          await capturedOnDisconnect();
        }
      });

      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
      });
    });

    it('should set error when hook onError is called', () => {
      let capturedOnError: ((error: string) => void) | null = null;

      mockUsePerpsConnectionLifecycle.mockImplementation(
        ({ onError }: { onError: (error: string) => void }) => {
          capturedOnError = onError;
          return { hasConnected: false };
        },
      );

      const TestComponentError = () => {
        const { error } = usePerpsConnection();
        return <Text>{error || 'No error'}</Text>;
      };

      const { getByText } = render(
        <PerpsConnectionProvider>
          <TestComponentError />
        </PerpsConnectionProvider>,
      );

      expect(getByText('No error')).toBeDefined();

      // Call the onError callback
      act(() => {
        if (capturedOnError) {
          capturedOnError('Test error message');
        }
      });

      expect(getByText('Test error message')).toBeDefined();
    });

    it('should handle visibility changes through the hook', () => {
      const { rerender } = render(
        <PerpsConnectionProvider isVisible>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Initial call with visible
      expect(mockUsePerpsConnectionLifecycle).toHaveBeenCalledWith(
        expect.objectContaining({ isVisible: true }),
      );

      // Change to not visible
      rerender(
        <PerpsConnectionProvider isVisible={false}>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      expect(mockUsePerpsConnectionLifecycle).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: false }),
      );

      // Change back to visible
      rerender(
        <PerpsConnectionProvider isVisible>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      expect(mockUsePerpsConnectionLifecycle).toHaveBeenLastCalledWith(
        expect.objectContaining({ isVisible: true }),
      );
    });
  });

  it('should handle rapid state changes', async () => {
    const onRender = jest.fn();

    render(
      <PerpsConnectionProvider>
        <TestComponent onRender={onRender} />
      </PerpsConnectionProvider>,
    );

    // Simulate rapid state changes
    for (let i = 0; i < 5; i++) {
      mockGetConnectionState.mockReturnValue({
        isConnected: i % 2 === 0,
        isConnecting: false,
        isInitialized: true,
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });
    }

    await waitFor(() => {
      // Should have been called multiple times with different states
      expect(onRender).toHaveBeenCalledTimes(6); // Initial + 5 updates
    });
  });
});
