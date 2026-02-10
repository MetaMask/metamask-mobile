import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import {
  HardwareWalletContextProvider,
  useHardwareWallet,
  type HardwareWalletContextValue,
} from './HardwareWalletContext';
import { ConnectionStatus, HardwareWalletType } from '@metamask/hw-wallet-sdk';

const defaultDeviceSelection = {
  devices: [],
  selectedDevice: null,
  isScanning: false,
  scanError: null,
};

// eslint-disable-next-line no-empty-function
const noop = () => {};
// eslint-disable-next-line no-empty-function
const asyncNoop = async () => {};
const asyncFalse = async () => false;

const createMockValue = (
  overrides: Partial<HardwareWalletContextValue> = {},
): HardwareWalletContextValue => ({
  walletType: null,
  deviceId: null,
  connectionState: { status: ConnectionStatus.Disconnected },
  deviceSelection: defaultDeviceSelection,
  closeDeviceSelection: noop,
  connect: asyncNoop,
  ensureDeviceReady: asyncFalse,
  setTargetWalletType: noop,
  showHardwareWalletError: noop,
  retry: asyncNoop,
  selectDevice: noop,
  rescan: noop,
  showAwaitingConfirmation: noop,
  hideAwaitingConfirmation: noop,
  ...overrides,
});

describe('HardwareWalletContext', () => {
  describe('HardwareWalletContextProvider', () => {
    it('should provide value to useHardwareWallet', () => {
      const value = createMockValue({
        walletType: HardwareWalletType.Ledger,
        deviceId: 'device-123',
        connectionState: {
          status: ConnectionStatus.Connected,
          deviceId: 'device-123',
        },
      });

      const TestConsumer: React.FC = () => {
        const hw = useHardwareWallet();
        return (
          <View>
            <Text testID="walletType">{hw.walletType ?? 'null'}</Text>
            <Text testID="deviceId">{hw.deviceId ?? 'null'}</Text>
            <Text testID="status">{hw.connectionState.status}</Text>
          </View>
        );
      };

      render(
        <HardwareWalletContextProvider value={value}>
          <TestConsumer />
        </HardwareWalletContextProvider>,
      );

      expect(screen.getByTestId('walletType')).toHaveTextContent(
        HardwareWalletType.Ledger,
      );
      expect(screen.getByTestId('deviceId')).toHaveTextContent('device-123');
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    it('should provide actions via useHardwareWallet', () => {
      const connectMock = jest.fn();
      const value = createMockValue({ connect: connectMock });

      const TestConsumer: React.FC = () => {
        const { connect } = useHardwareWallet();
        return (
          <TouchableOpacity
            testID="connect"
            onPress={() => connect('device-123')}
          />
        );
      };

      render(
        <HardwareWalletContextProvider value={value}>
          <TestConsumer />
        </HardwareWalletContextProvider>,
      );

      fireEvent.press(screen.getByTestId('connect'));
      expect(connectMock).toHaveBeenCalledWith('device-123');
    });
  });

  describe('useHardwareWallet', () => {
    it('should throw when used outside provider', () => {
      const TestConsumer: React.FC = () => {
        useHardwareWallet();
        return null;
      };

      expect(() => render(<TestConsumer />)).toThrow(
        'useHardwareWallet must be used within a HardwareWalletContextProvider',
      );
    });
  });
});
