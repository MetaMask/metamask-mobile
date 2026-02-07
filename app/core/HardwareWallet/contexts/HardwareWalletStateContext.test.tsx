import React from 'react';
import { Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  HardwareWalletStateProvider,
  useHardwareWalletState,
  useConnectionStatus,
  useIsDeviceConnected,
  useIsOperationInProgress,
} from './HardwareWalletStateContext';
import { ConnectionState } from '../connectionState';

// Test component that uses all hooks
const TestConsumer: React.FC = () => {
  const { connectionState } = useHardwareWalletState();
  const status = useConnectionStatus();
  const isConnected = useIsDeviceConnected();
  const isInProgress = useIsOperationInProgress();

  return (
    <View>
      <Text testID="status">{connectionState.status}</Text>
      <Text testID="hookStatus">{status}</Text>
      <Text testID="isConnected">{isConnected.toString()}</Text>
      <Text testID="isInProgress">{isInProgress.toString()}</Text>
      {'deviceId' in connectionState && (
        <Text testID="deviceId">{connectionState.deviceId}</Text>
      )}
    </View>
  );
};

describe('HardwareWalletStateContext', () => {
  describe('HardwareWalletStateProvider', () => {
    it('should provide default disconnected state', () => {
      render(
        <HardwareWalletStateProvider>
          <TestConsumer />
        </HardwareWalletStateProvider>,
      );

      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('hookStatus')).toHaveTextContent(
        'disconnected',
      );
      expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
      expect(screen.getByTestId('isInProgress')).toHaveTextContent('false');
    });

    it('should provide connecting state', () => {
      render(
        <HardwareWalletStateProvider
          connectionState={ConnectionState.connecting('device-123')}
        >
          <TestConsumer />
        </HardwareWalletStateProvider>,
      );

      expect(screen.getByTestId('status')).toHaveTextContent('connecting');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
      expect(screen.getByTestId('isInProgress')).toHaveTextContent('true');
      expect(screen.getByTestId('deviceId')).toHaveTextContent('device-123');
    });

    it('should provide connected state', () => {
      render(
        <HardwareWalletStateProvider
          connectionState={ConnectionState.connected('device-456')}
        >
          <TestConsumer />
        </HardwareWalletStateProvider>,
      );

      expect(screen.getByTestId('status')).toHaveTextContent('connected');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('true');
      expect(screen.getByTestId('isInProgress')).toHaveTextContent('false');
      expect(screen.getByTestId('deviceId')).toHaveTextContent('device-456');
    });

    it('should provide awaiting app state', () => {
      render(
        <HardwareWalletStateProvider
          connectionState={ConnectionState.awaitingApp(
            'device-789',
            'Ethereum',
          )}
        >
          <TestConsumer />
        </HardwareWalletStateProvider>,
      );

      expect(screen.getByTestId('status')).toHaveTextContent('awaiting_app');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('true');
      expect(screen.getByTestId('isInProgress')).toHaveTextContent('true');
    });

    it('should provide awaiting confirmation state', () => {
      render(
        <HardwareWalletStateProvider
          connectionState={ConnectionState.awaitingConfirmation('device-abc')}
        >
          <TestConsumer />
        </HardwareWalletStateProvider>,
      );

      expect(screen.getByTestId('status')).toHaveTextContent(
        'awaiting_confirmation',
      );
      expect(screen.getByTestId('isConnected')).toHaveTextContent('true');
      expect(screen.getByTestId('isInProgress')).toHaveTextContent('true');
    });
  });

  describe('useHardwareWalletState', () => {
    it('should return default disconnected state when used outside provider', () => {
      // Note: We provide default values so it doesn't throw
      render(<TestConsumer />);

      expect(screen.getByTestId('status')).toHaveTextContent('disconnected');
      expect(screen.getByTestId('isConnected')).toHaveTextContent('false');
    });
  });
});
