import React from 'react';
import { render, act, waitFor, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { addBreadcrumb } from '@sentry/react-native';
import { PerpsGlobalErrorGate } from './PerpsGlobalErrorGate';
import { PerpsConnectionManager } from '../../services/PerpsConnectionManager';
import { MetaMetricsEvents } from '../../../../../core/Analytics';

jest.mock('../../services/PerpsConnectionManager');

jest.mock('@sentry/react-native', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    goBack: jest.fn(),
    canGoBack: jest.fn(() => true),
    reset: jest.fn(),
  })),
}));

jest.mock('../../../../../util/test/utils', () => ({
  isE2E: false,
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: jest.fn((key) => key),
}));

const mockTrack = jest.fn();
jest.mock('../../hooks/usePerpsEventTracking', () => ({
  usePerpsEventTracking: jest.fn(() => ({ track: mockTrack })),
}));

jest.mock('../PerpsConnectionErrorView', () => ({
  __esModule: true,
  default: ({
    error,
    onRetry,
    showBackButton,
    retryAttempts,
    isRetrying,
  }: {
    error: string | Error;
    onRetry: () => void;
    showBackButton?: boolean;
    retryAttempts?: number;
    isRetrying?: boolean;
  }) => {
    const {
      View,
      Text: RNText,
      TouchableOpacity,
    } = jest.requireActual('react-native');
    return (
      <View testID="perps-connection-error">
        <RNText testID="error-message">
          {error instanceof Error ? error.message : error}
        </RNText>
        <TouchableOpacity onPress={onRetry} testID="retry-button">
          <RNText>Retry</RNText>
        </TouchableOpacity>
        {showBackButton && (
          <RNText testID="back-button-indicator">Back button shown</RNText>
        )}
        {retryAttempts !== undefined && (
          <RNText testID="retry-attempts">{retryAttempts}</RNText>
        )}
        {isRetrying && <RNText testID="is-retrying">Retrying...</RNText>}
      </View>
    );
  },
}));

jest.mock('../../hooks/usePerpsWithdrawStatus', () => ({
  usePerpsWithdrawStatus: jest.fn(() => undefined),
}));

jest.mock('../../hooks', () => ({
  usePerpsNetworkValidation: jest.fn(() => undefined),
}));

describe('PerpsGlobalErrorGate', () => {
  let mockGetConnectionState: jest.Mock;
  let mockReconnectWithNewContext: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockGetConnectionState = jest.fn().mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: null,
    });
    mockReconnectWithNewContext = jest.fn().mockResolvedValue(undefined);

    (PerpsConnectionManager.getConnectionState as jest.Mock) =
      mockGetConnectionState;
    (PerpsConnectionManager.reconnectWithNewContext as jest.Mock) =
      mockReconnectWithNewContext;
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('renders children when there is no error', () => {
    const { getByText } = render(
      <PerpsGlobalErrorGate>
        <Text>Child Content</Text>
      </PerpsGlobalErrorGate>,
    );

    expect(getByText('Child Content')).toBeOnTheScreen();
  });

  it('renders error view when connection state has an error', () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId, queryByText } = render(
      <PerpsGlobalErrorGate>
        <Text>Child Content</Text>
      </PerpsGlobalErrorGate>,
    );

    expect(getByTestId('perps-connection-error')).toBeOnTheScreen();
    expect(queryByText('Child Content')).toBeNull();
  });

  it('shows children again when error clears', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId, queryByText, getByText, queryByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child Content</Text>
      </PerpsGlobalErrorGate>,
    );

    expect(getByTestId('perps-connection-error')).toBeOnTheScreen();
    expect(queryByText('Child Content')).toBeNull();

    mockGetConnectionState.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: null,
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(queryByTestId('perps-connection-error')).toBeNull();
      expect(getByText('Child Content')).toBeOnTheScreen();
    });
  });

  it('always shows back button on error view', () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    expect(getByTestId('back-button-indicator')).toBeOnTheScreen();
  });

  it('calls reconnectWithNewContext with force on retry', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    expect(mockReconnectWithNewContext).toHaveBeenCalledWith({ force: true });
  });

  it('increments retry attempts on each retry', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    mockReconnectWithNewContext.mockRejectedValue(
      new Error('Connection failed'),
    );

    const { getByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(getByTestId('retry-attempts')).toHaveTextContent('1');
    });

    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(getByTestId('retry-attempts')).toHaveTextContent('2');
    });
  });

  it('resets retry attempts on successful reconnection', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    mockReconnectWithNewContext
      .mockRejectedValueOnce(new Error('First retry failed'))
      .mockResolvedValueOnce(undefined);

    const { getByTestId, queryByTestId, getByText } = render(
      <PerpsGlobalErrorGate>
        <Text>Child Content</Text>
      </PerpsGlobalErrorGate>,
    );

    // First retry fails
    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(getByTestId('retry-attempts')).toHaveTextContent('1');
    });

    // Second retry succeeds — gate clears error and renders children
    mockGetConnectionState.mockReturnValue({
      isConnected: true,
      isConnecting: false,
      isInitialized: true,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: null,
    });

    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    await waitFor(() => {
      expect(queryByTestId('perps-connection-error')).toBeNull();
      expect(getByText('Child Content')).toBeOnTheScreen();
    });
  });

  describe('analytics debouncing', () => {
    it('fires PERPS_SCREEN_VIEWED once after debounce when error occurs', async () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      render(
        <PerpsGlobalErrorGate>
          <Text>Child</Text>
        </PerpsGlobalErrorGate>,
      );

      // Event should not fire immediately
      expect(mockTrack).not.toHaveBeenCalled();

      // Advance past debounce window
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);
      expect(mockTrack).toHaveBeenCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          screen_type: 'error',
          screen_name: 'connection_error',
          error_type: 'network',
          error_message: 'Connection failed',
          retry_attempts: 0,
        }),
      );
    });

    it('does not fire duplicate events for the same error', async () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      render(
        <PerpsGlobalErrorGate>
          <Text>Child</Text>
        </PerpsGlobalErrorGate>,
      );

      // Advance past debounce
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);

      // Advance more time — no additional events
      act(() => {
        jest.advanceTimersByTime(5000);
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);
    });

    it('suppresses analytics during rapid error flap cycles', () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      const { rerender } = render(
        <PerpsGlobalErrorGate>
          <Text>Child</Text>
        </PerpsGlobalErrorGate>,
      );

      // Error set — debounce timer starts
      act(() => {
        jest.advanceTimersByTime(500);
      });

      // Error clears within debounce window
      mockGetConnectionState.mockReturnValue({
        isConnected: true,
        isConnecting: false,
        isInitialized: true,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: null,
      });

      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Rerender with cleared error (polling detects it)
      rerender(
        <PerpsGlobalErrorGate>
          <Text>Child</Text>
        </PerpsGlobalErrorGate>,
      );

      // Wait past the original debounce window
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      // No event should have fired because the error cleared before debounce completed
      expect(mockTrack).not.toHaveBeenCalled();
    });

    it('fires one event per retry attempt', async () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      mockReconnectWithNewContext.mockRejectedValue(
        new Error('Connection failed'),
      );

      const { getByTestId } = render(
        <PerpsGlobalErrorGate>
          <Text>Child</Text>
        </PerpsGlobalErrorGate>,
      );

      // Initial error — advance past debounce
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTrack).toHaveBeenCalledTimes(1);

      // First retry
      await act(async () => {
        fireEvent.press(getByTestId('retry-button'));
      });

      // Advance past debounce for retry event
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockTrack).toHaveBeenCalledTimes(2);
      expect(mockTrack).toHaveBeenLastCalledWith(
        MetaMetricsEvents.PERPS_SCREEN_VIEWED,
        expect.objectContaining({
          retry_attempts: 1,
        }),
      );
    });
  });

  describe('sibling provider deduplication', () => {
    it('only one error view renders even with multiple children providers', () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      const { getAllByTestId } = render(
        <PerpsGlobalErrorGate>
          <Text>Stack 1</Text>
          <Text>Stack 2</Text>
          <Text>Stack 3</Text>
        </PerpsGlobalErrorGate>,
      );

      // Only one error view should exist
      expect(getAllByTestId('perps-connection-error')).toHaveLength(1);
    });
  });

  it('cleans up polling interval on unmount', () => {
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const { unmount } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    act(() => {
      unmount();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('forwards isConnecting as isRetrying to the error view', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: true,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    // isConnecting is picked up by the 100ms polling interval
    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('is-retrying')).toBeOnTheScreen();
    });
  });

  it('polls and reflects isConnecting changes', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    const { getByTestId, queryByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    expect(queryByTestId('is-retrying')).toBeNull();

    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: true,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    act(() => {
      jest.advanceTimersByTime(100);
    });

    await waitFor(() => {
      expect(getByTestId('is-retrying')).toBeOnTheScreen();
    });
  });

  it('adds Sentry breadcrumb when retry fails', async () => {
    mockGetConnectionState.mockReturnValue({
      isConnected: false,
      isConnecting: false,
      isInitialized: false,
      isDisconnecting: false,
      isInGracePeriod: false,
      error: 'Connection failed',
    });

    mockReconnectWithNewContext.mockRejectedValue(
      new Error('Reconnect failed'),
    );

    const { getByTestId } = render(
      <PerpsGlobalErrorGate>
        <Text>Child</Text>
      </PerpsGlobalErrorGate>,
    );

    await act(async () => {
      fireEvent.press(getByTestId('retry-button'));
    });

    expect(addBreadcrumb).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'perps.connection',
        message: 'Retry failed',
        level: 'warning',
        data: expect.objectContaining({
          error: 'Reconnect failed',
          retryAttempts: 1,
        }),
      }),
    );
  });

  describe('gate + suppressErrorView provider integration', () => {
    it('gate renders error view while suppressed children would normally render', () => {
      mockGetConnectionState.mockReturnValue({
        isConnected: false,
        isConnecting: false,
        isInitialized: false,
        isDisconnecting: false,
        isInGracePeriod: false,
        error: 'Connection failed',
      });

      const { getByTestId, queryByText, getAllByTestId } = render(
        <PerpsGlobalErrorGate>
          <Text>Provider A children</Text>
          <Text>Provider B children</Text>
          <Text>Provider C children</Text>
        </PerpsGlobalErrorGate>,
      );

      expect(getAllByTestId('perps-connection-error')).toHaveLength(1);
      expect(getByTestId('error-message')).toHaveTextContent(
        'Connection failed',
      );
      expect(queryByText('Provider A children')).toBeNull();
      expect(queryByText('Provider B children')).toBeNull();
      expect(queryByText('Provider C children')).toBeNull();
    });

    it('gate renders all children when there is no error', () => {
      const { getByText, queryByTestId } = render(
        <PerpsGlobalErrorGate>
          <Text>Provider A children</Text>
          <Text>Provider B children</Text>
          <Text>Provider C children</Text>
        </PerpsGlobalErrorGate>,
      );

      expect(queryByTestId('perps-connection-error')).toBeNull();
      expect(getByText('Provider A children')).toBeOnTheScreen();
      expect(getByText('Provider B children')).toBeOnTheScreen();
      expect(getByText('Provider C children')).toBeOnTheScreen();
    });
  });
});
