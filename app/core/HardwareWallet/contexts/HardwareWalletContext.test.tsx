import React from 'react';
import { Text, View, TouchableOpacity } from 'react-native';
import { render, screen, fireEvent } from '@testing-library/react-native';
import HardwareWalletContext, {
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
const asyncFalse = async () => false;

const createMockValue = (
  overrides: Partial<HardwareWalletContextValue> = {},
): HardwareWalletContextValue => ({
  walletType: null,
  deviceId: null,
  connectionState: { status: ConnectionStatus.Disconnected },
  deviceSelection: defaultDeviceSelection,
  ensureDeviceReady: asyncFalse,
  setTargetWalletType: noop,
  showHardwareWalletError: noop,
  showAwaitingConfirmation: noop,
  hideAwaitingConfirmation: noop,
  ...overrides,
});

describe('HardwareWalletContext', () => {
  describe('HardwareWalletContext.Provider', () => {
    it('provides value to useHardwareWallet', () => {
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
        <HardwareWalletContext.Provider value={value}>
          <TestConsumer />
        </HardwareWalletContext.Provider>,
      );

      expect(screen.getByTestId('walletType')).toHaveTextContent(
        HardwareWalletType.Ledger,
      );
      expect(screen.getByTestId('deviceId')).toHaveTextContent('device-123');
      expect(screen.getByTestId('status')).toHaveTextContent('connected');
    });

    it('provides actions via useHardwareWallet', () => {
      const ensureDeviceReadyMock = jest.fn();
      const value = createMockValue({
        ensureDeviceReady: ensureDeviceReadyMock,
      });

      const TestConsumer: React.FC = () => {
        const { ensureDeviceReady } = useHardwareWallet();
        return (
          <TouchableOpacity
            testID="ensureReady"
            onPress={() => ensureDeviceReady('device-123')}
          />
        );
      };

      render(
        <HardwareWalletContext.Provider value={value}>
          <TestConsumer />
        </HardwareWalletContext.Provider>,
      );

      fireEvent.press(screen.getByTestId('ensureReady'));
      expect(ensureDeviceReadyMock).toHaveBeenCalledWith('device-123');
    });
  });

  describe('useHardwareWallet', () => {
    it('throws when used outside provider', () => {
      const TestConsumer: React.FC = () => {
        useHardwareWallet();
        return null;
      };

      expect(() => render(<TestConsumer />)).toThrow(
        'useHardwareWallet must be used within a HardwareWalletProvider',
      );
    });
  });
});
