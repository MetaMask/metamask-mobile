import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { Text } from 'react-native';
import { PerpsConnectionProvider } from './PerpsConnectionProvider';
import { usePerpsConnection } from '../hooks/usePerpsConnection';
import { PerpsConnectionManager } from '../services/PerpsConnectionManager';

jest.mock('../services/PerpsConnectionManager');

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    reset: jest.fn(),
  })),
}));
jest.mock('../../../../core/SDKConnect/utils/DevLogger', () => ({
  DevLogger: {
    log: jest.fn(),
  },
}));
jest.mock('../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));
jest.mock('../components/PerpsConnectionErrorView', () => ({
  __esModule: true,
  default: ({
    error,
    onRetry,
    showBackButton,
    retryAttempts,
  }: {
    error: string | Error;
    onRetry: () => void;
    showBackButton?: boolean;
    retryAttempts?: number;
  }) => {
    const { View, Text, TouchableOpacity } = jest.requireActual('react-native');
    return (
      <View testID="perps-connection-error">
        <Text>{error instanceof Error ? error.message : error}</Text>
        <TouchableOpacity onPress={onRetry} testID="retry-button">
          <Text>Retry</Text>
        </TouchableOpacity>
        {showBackButton && (
          <Text testID="back-button-indicator">Back button shown</Text>
        )}
        {retryAttempts !== undefined && (
          <Text testID="retry-attempts">{retryAttempts}</Text>
        )}
      </View>
    );
  },
}));
// Mock the withdrawal status hook that uses Redux
jest.mock('../hooks/usePerpsWithdrawStatus', () => ({
  usePerpsWithdrawStatus: jest.fn(() => undefined),
}));
// Mock network validation hook that may use Redux
jest.mock('../hooks', () => ({
  usePerpsNetworkValidation: jest.fn(() => undefined),
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
  let mockReconnectWithNewContext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();

    // Setup default mocks - set isInitialized to true by default so tests see children
    mockGetConnectionState = jest.fn().mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: true,
      error: null,
    });
    mockConnect = jest.fn().mockResolvedValue(undefined);
    mockDisconnect = jest.fn().mockResolvedValue(undefined);
    mockReconnectWithNewContext = jest.fn().mockResolvedValue(undefined);

    (PerpsConnectionManager.getConnectionState as jest.Mock) =
      mockGetConnectionState;
    (PerpsConnectionManager.connect as jest.Mock) = mockConnect;
    (PerpsConnectionManager.disconnect as jest.Mock) = mockDisconnect;
    (PerpsConnectionManager.reconnectWithNewContext as jest.Mock) =
      mockReconnectWithNewContext;
    (PerpsConnectionManager.getActiveProviderName as jest.Mock) = jest
      .fn()
      .mockReturnValue('hyperliquid');
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders children correctly when initialized', () => {
    const { getByText } = render(
      <PerpsConnectionProvider>
        <Text>Child Component</Text>
      </PerpsConnectionProvider>,
    );

    expect(getByText('Child Component')).toBeDefined();
  });

  it('renders children immediately even while connecting', () => {
    // Children should render even when isInitialized is false and isConnecting is true
    // Individual sections handle their own loading states with per-row skeletons
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: true,
      isInitialized: false,
    });

    const { getByText } = render(
      <PerpsConnectionProvider>
        <Text>Child Component</Text>
      </PerpsConnectionProvider>,
    );

    expect(getByText('Child Component')).toBeDefined();
  });

  it('provides connection state through context', async () => {
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

  it('updates state when polling', async () => {
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

  it('shows error view when connection state has error', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error: 'Connection failed',
    });

    const { getByTestId, getByText } = render(
      <PerpsConnectionProvider>
        <TestComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('perps-connection-error')).toBeTruthy();
      expect(getByText('Connection failed')).toBeTruthy();
    });
  });

  it('handles disconnect through context', async () => {
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

  it('handles connect through context', async () => {
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

  it('resets error', async () => {
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

  it('throws error when usePerpsConnection is used outside provider', () => {
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

  it('shows error view for unknown error string in connection state', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      error: 'Unknown connection error',
    });

    const { getByTestId, getByText } = render(
      <PerpsConnectionProvider>
        <TestComponent />
      </PerpsConnectionProvider>,
    );

    await waitFor(() => {
      expect(getByTestId('perps-connection-error')).toBeTruthy();
      expect(getByText('Unknown connection error')).toBeTruthy();
    });
  });

  it('handles errors in disconnect gracefully', async () => {
    const error = new Error('Disconnect failed');
    mockDisconnect.mockRejectedValueOnce(error);

    const TestDisconnectErrorComponent = () => {
      const { disconnect, error: contextError } = usePerpsConnection();

      React.useEffect(() => {
        disconnect().catch(() => {
          // Disconnect errors are handled gracefully
        });
      }, [disconnect]);

      return <Text>{contextError || 'No error'}</Text>;
    };

    const { getByText } = render(
      <PerpsConnectionProvider>
        <TestDisconnectErrorComponent />
      </PerpsConnectionProvider>,
    );

    // Disconnect errors should not propagate to the UI context
    await waitFor(() => {
      expect(getByText('No error')).toBeDefined();
    });

    // Reset mock for next tests
    mockDisconnect.mockResolvedValue(undefined);
  });

  describe('isFullScreen prop behavior', () => {
    it('shows back button immediately when isFullScreen is true', async () => {
      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId } = render(
        <PerpsConnectionProvider isFullScreen>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Back button should be shown immediately when isFullScreen is true
      await waitFor(() => {
        expect(getByTestId('perps-connection-error')).toBeDefined();
        expect(getByTestId('back-button-indicator')).toBeDefined();
      });
    });

    it('does not show back button initially when isFullScreen is false', async () => {
      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId, queryByTestId } = render(
        <PerpsConnectionProvider isFullScreen={false}>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Back button should NOT be shown initially when isFullScreen is false
      await waitFor(() => {
        expect(getByTestId('perps-connection-error')).toBeDefined();
        expect(queryByTestId('back-button-indicator')).toBeNull();
      });
    });

    it('shows back button after retry when isFullScreen is false', async () => {
      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId, queryByTestId } = render(
        <PerpsConnectionProvider isFullScreen={false}>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Initially no back button
      expect(queryByTestId('back-button-indicator')).toBeNull();

      // Mock connection failure on retry
      mockConnect.mockRejectedValueOnce(new Error('Retry failed'));

      // Click retry button
      const retryButton = getByTestId('retry-button');
      act(() => {
        retryButton.props.onPress();
      });

      // After retry attempt, back button should be shown
      await waitFor(() => {
        expect(getByTestId('back-button-indicator')).toBeDefined();
        expect(getByTestId('retry-attempts')).toHaveTextContent('1');
      });
    });
  });

  describe('retry logic behavior', () => {
    it('calls PerpsConnectionManager.reconnectWithNewContext on retry', async () => {
      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId } = render(
        <PerpsConnectionProvider>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Clear previous mock calls
      mockReconnectWithNewContext.mockClear();

      // Click retry button
      const retryButton = getByTestId('retry-button');
      act(() => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        // Should call PerpsConnectionManager.reconnectWithNewContext for full reset
        expect(mockReconnectWithNewContext).toHaveBeenCalledTimes(1);
      });
    });

    it('updates state after retry attempt', async () => {
      // Mock initial error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId, queryByTestId, getByText } = render(
        <PerpsConnectionProvider>
          <Text>Child Component</Text>
        </PerpsConnectionProvider>,
      );

      // Should show error view
      expect(getByTestId('perps-connection-error')).toBeDefined();

      // Mock successful connection on retry
      mockConnect.mockResolvedValueOnce(undefined);

      // Update mock to return connected state after retry
      mockGetConnectionState.mockReturnValue({
        isConnected: true,
        isConnecting: false,
        isInitialized: true,
        error: null,
      });

      // Click retry button
      const retryButton = getByTestId('retry-button');
      await act(async () => {
        retryButton.props.onPress();
      });

      // Should now show children instead of error view
      await waitFor(() => {
        expect(queryByTestId('perps-connection-error')).toBeNull();
        expect(getByText('Child Component')).toBeDefined();
      });
    });

    it('increments retry attempts on each retry', async () => {
      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId } = render(
        <PerpsConnectionProvider>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Mock connection failures
      mockReconnectWithNewContext.mockRejectedValue(
        new Error('Connection failed'),
      );

      // First retry
      const retryButton = getByTestId('retry-button');
      await act(async () => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('retry-attempts')).toHaveTextContent('1');
      });

      // Second retry
      await act(async () => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('retry-attempts')).toHaveTextContent('2');
      });

      // Third retry
      await act(async () => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('retry-attempts')).toHaveTextContent('3');
      });
    });

    it('resets retry attempts on successful connection', async () => {
      // Mock initial error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId, queryByTestId } = render(
        <PerpsConnectionProvider>
          <Text>Child Component</Text>
        </PerpsConnectionProvider>,
      );

      // Mock connection failure then success
      mockReconnectWithNewContext
        .mockRejectedValueOnce(new Error('First retry failed'))
        .mockResolvedValueOnce(undefined);

      // First retry (fails)
      const retryButton = getByTestId('retry-button');
      await act(async () => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        expect(getByTestId('retry-attempts')).toHaveTextContent('1');
      });

      // Update mock to return connected state for second retry
      mockGetConnectionState.mockReturnValue({
        isConnected: true,
        isConnecting: false,
        isInitialized: true,
        error: null,
      });

      // Second retry (succeeds)
      await act(async () => {
        retryButton.props.onPress();
      });

      // Should clear retry attempts and show children
      await waitFor(() => {
        expect(queryByTestId('perps-connection-error')).toBeNull();
        expect(queryByTestId('retry-attempts')).toBeNull();
      });
    });

    it('does not call resetError during retry', async () => {
      // Mock resetError
      const mockResetError = jest.fn();
      (PerpsConnectionManager.resetError as jest.Mock) = mockResetError;

      // Mock error state
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        error: 'Connection failed',
      });

      const { getByTestId } = render(
        <PerpsConnectionProvider>
          <Text>Test</Text>
        </PerpsConnectionProvider>,
      );

      // Clear previous mock calls
      mockResetError.mockClear();

      // Click retry button
      const retryButton = getByTestId('retry-button');
      act(() => {
        retryButton.props.onPress();
      });

      await waitFor(() => {
        // resetError should NOT be called during retry
        expect(mockResetError).not.toHaveBeenCalled();
        // reconnectWithNewContext is called instead of connect
        expect(mockReconnectWithNewContext).toHaveBeenCalled();
      });
    });
  });

  it('cleans up polling interval on unmount', () => {
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

  it('handles rapid state changes', async () => {
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

  describe('isCurrentlyConnecting method', () => {
    let mockIsCurrentlyConnecting: jest.Mock;

    beforeEach(() => {
      mockIsCurrentlyConnecting = jest.fn();
      (PerpsConnectionManager.isCurrentlyConnecting as jest.Mock) =
        mockIsCurrentlyConnecting;
    });

    it('returns true when connection manager is connecting', () => {
      // Arrange
      mockIsCurrentlyConnecting.mockReturnValue(true);

      // Act
      const result = PerpsConnectionManager.isCurrentlyConnecting();

      // Assert
      expect(result).toBe(true);
      expect(mockIsCurrentlyConnecting).toHaveBeenCalledTimes(1);
    });

    it('returns false when connection manager is not connecting', () => {
      // Arrange
      mockIsCurrentlyConnecting.mockReturnValue(false);

      // Act
      const result = PerpsConnectionManager.isCurrentlyConnecting();

      // Assert
      expect(result).toBe(false);
      expect(mockIsCurrentlyConnecting).toHaveBeenCalledTimes(1);
    });
  });
});
