/**
 * Tests for PerpsWebSocketHealthToast component
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import PerpsWebSocketHealthToast from './PerpsWebSocketHealthToast';
import { WebSocketConnectionState } from '../../controllers/types';
import { PerpsWebSocketHealthToastSelectorsIDs } from '../../Perps.testIds';

// Mock dependencies
jest.mock('../../../../../component-library/hooks', () => ({
  useStyles: () => ({
    styles: {
      container: {},
      toast: {},
      iconContainer: {},
      textContainer: {},
      retryButton: {},
    },
  }),
}));

jest.mock('../../../../../component-library/components/Texts/Text', () => {
  const { Text } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: { children: React.ReactNode }) => (
      <Text {...props}>{children}</Text>
    ),
    TextVariant: { BodyMD: 'BodyMD', BodySM: 'BodySM' },
    TextColor: { Default: 'Default', Alternative: 'Alternative' },
  };
});

jest.mock('../../../../../component-library/components/Icons/Icon', () => ({
  __esModule: true,
  default: () => null,
  IconName: { Connect: 'Connect' },
  IconSize: { Xl: 'Xl' },
  IconColor: { Error: 'Error', Warning: 'Warning', Success: 'Success' },
}));

jest.mock(
  '@metamask/design-system-react-native/dist/components/temp-components/Spinner/index.cjs',
  () => ({
    Spinner: () => null,
  }),
);

jest.mock('@metamask/design-system-react-native', () => ({
  IconColor: { PrimaryDefault: 'PrimaryDefault' },
  IconSize: { Md: 'Md' },
}));

jest.mock('../../../../../../locales/i18n', () => ({
  strings: (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      'perps.connection.websocket_disconnected': 'Disconnected',
      'perps.connection.websocket_disconnected_message':
        'Connection lost. Tap retry to reconnect.',
      'perps.connection.websocket_connecting': 'Connecting',
      'perps.connection.websocket_connecting_message': `Reconnecting (attempt ${params?.attempt || 0})...`,
      'perps.connection.websocket_connected': 'Connected',
      'perps.connection.websocket_connected_message':
        'Connection restored successfully.',
      'perps.connection.websocket_retry': 'Retry',
    };
    return translations[key] || key;
  },
}));

// Mock context
const mockHide = jest.fn();
const mockOnRetry = jest.fn();
const mockState = {
  isVisible: true,
  connectionState: WebSocketConnectionState.Disconnected,
  reconnectionAttempt: 1,
};

jest.mock('./PerpsWebSocketHealthToast.context', () => ({
  useWebSocketHealthToastContext: () => ({
    state: mockState,
    hide: mockHide,
    onRetry: mockOnRetry,
  }),
}));

describe('PerpsWebSocketHealthToast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset mock state
    mockState.isVisible = true;
    mockState.connectionState = WebSocketConnectionState.Disconnected;
    mockState.reconnectionAttempt = 1;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('Visibility', () => {
    it('does not render when isVisible is false', () => {
      mockState.isVisible = false;

      const { queryByTestId } = render(<PerpsWebSocketHealthToast />);

      expect(
        queryByTestId(PerpsWebSocketHealthToastSelectorsIDs.TOAST),
      ).toBeNull();
    });

    it('renders when isVisible is true and state becomes visible', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Disconnected;

      const { findByTestId } = render(<PerpsWebSocketHealthToast />);

      // Wait for the component to mount and animation to trigger
      await waitFor(
        async () => {
          const toast = await findByTestId(
            PerpsWebSocketHealthToastSelectorsIDs.TOAST,
          );
          expect(toast).toBeTruthy();
        },
        { timeout: 1000 },
      );
    });
  });

  describe('DISCONNECTED state', () => {
    it('displays disconnected message', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Disconnected;

      const { findByText } = render(<PerpsWebSocketHealthToast />);

      await waitFor(async () => {
        expect(await findByText('Disconnected')).toBeTruthy();
        expect(
          await findByText('Connection lost. Tap retry to reconnect.'),
        ).toBeTruthy();
      });
    });

    it('shows retry button when disconnected', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Disconnected;

      const { findByTestId } = render(<PerpsWebSocketHealthToast />);

      await waitFor(async () => {
        const retryButton = await findByTestId(
          PerpsWebSocketHealthToastSelectorsIDs.RETRY_BUTTON,
        );
        expect(retryButton).toBeTruthy();
      });
    });

    it('calls onRetry when retry button is pressed', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Disconnected;

      const { findByTestId } = render(<PerpsWebSocketHealthToast />);

      await waitFor(async () => {
        const retryButton = await findByTestId(
          PerpsWebSocketHealthToastSelectorsIDs.RETRY_BUTTON,
        );
        fireEvent.press(retryButton);
        expect(mockOnRetry).toHaveBeenCalled();
      });
    });
  });

  describe('CONNECTING state', () => {
    it('displays connecting message with attempt number', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connecting;
      mockState.reconnectionAttempt = 3;

      const { findByText } = render(<PerpsWebSocketHealthToast />);

      await waitFor(async () => {
        expect(await findByText('Connecting')).toBeTruthy();
        expect(await findByText('Reconnecting (attempt 3)...')).toBeTruthy();
      });
    });

    it('does not show retry button when connecting', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connecting;

      const { queryByTestId, findByTestId } = render(
        <PerpsWebSocketHealthToast />,
      );

      // Wait for toast to render
      await waitFor(async () => {
        await findByTestId(PerpsWebSocketHealthToastSelectorsIDs.TOAST);
      });

      expect(
        queryByTestId(PerpsWebSocketHealthToastSelectorsIDs.RETRY_BUTTON),
      ).toBeNull();
    });
  });

  describe('CONNECTED state', () => {
    it('displays connected message', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connected;

      const { findByText } = render(<PerpsWebSocketHealthToast />);

      await waitFor(async () => {
        expect(await findByText('Connected')).toBeTruthy();
        expect(
          await findByText('Connection restored successfully.'),
        ).toBeTruthy();
      });
    });

    it('does not show retry button when connected', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connected;

      const { queryByTestId, findByTestId } = render(
        <PerpsWebSocketHealthToast />,
      );

      // Wait for toast to render
      await waitFor(async () => {
        await findByTestId(PerpsWebSocketHealthToastSelectorsIDs.TOAST);
      });

      expect(
        queryByTestId(PerpsWebSocketHealthToastSelectorsIDs.RETRY_BUTTON),
      ).toBeNull();
    });

    it('auto-hides after 3 seconds when connected', async () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connected;

      render(<PerpsWebSocketHealthToast />);

      // Fast-forward time
      jest.advanceTimersByTime(3000);

      expect(mockHide).toHaveBeenCalled();
    });
  });

  describe('DISCONNECTING state', () => {
    it('does not render for DISCONNECTING state', () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Disconnecting;

      const { queryByTestId } = render(<PerpsWebSocketHealthToast />);

      expect(
        queryByTestId(PerpsWebSocketHealthToastSelectorsIDs.TOAST),
      ).toBeNull();
    });
  });

  describe('Cleanup', () => {
    it('clears timeout on unmount', () => {
      mockState.isVisible = true;
      mockState.connectionState = WebSocketConnectionState.Connected;

      const { unmount } = render(<PerpsWebSocketHealthToast />);

      unmount();

      // Advance timer to ensure no error is thrown
      jest.advanceTimersByTime(5000);

      // If timeout wasn't cleared, mockHide would be called after unmount
      // The test passes if no error is thrown
    });
  });
});
