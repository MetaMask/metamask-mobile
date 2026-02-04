import React from 'react';
import { Text, View } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import {
  HardwareWalletConfigProvider,
  useHardwareWalletConfig,
} from './HardwareWalletConfigContext';
import { HardwareWalletType } from '../helpers';
import { BluetoothPermissionState, LocationPermissionState } from '../types';

// Test component that uses the hook
const TestConsumer: React.FC = () => {
  const config = useHardwareWalletConfig();
  return (
    <View>
      <Text testID="isHardwareWalletAccount">
        {config.isHardwareWalletAccount.toString()}
      </Text>
      <Text testID="walletType">{config.walletType ?? 'null'}</Text>
      <Text testID="deviceId">{config.deviceId ?? 'null'}</Text>
      <Text testID="isBluetoothEnabled">
        {config.isBluetoothEnabled.toString()}
      </Text>
      <Text testID="bluetoothPermission">{config.permissions.bluetooth}</Text>
    </View>
  );
};

describe('HardwareWalletConfigContext', () => {
  describe('HardwareWalletConfigProvider', () => {
    it('should provide default values', () => {
      render(
        <HardwareWalletConfigProvider>
          <TestConsumer />
        </HardwareWalletConfigProvider>,
      );

      expect(screen.getByTestId('isHardwareWalletAccount')).toHaveTextContent(
        'false',
      );
      expect(screen.getByTestId('walletType')).toHaveTextContent('null');
      expect(screen.getByTestId('deviceId')).toHaveTextContent('null');
      expect(screen.getByTestId('isBluetoothEnabled')).toHaveTextContent(
        'false',
      );
      expect(screen.getByTestId('bluetoothPermission')).toHaveTextContent(
        'unknown',
      );
    });

    it('should provide custom values', () => {
      const permissions = {
        bluetooth: BluetoothPermissionState.Granted,
        location: LocationPermissionState.Granted,
        allGranted: true,
      };

      render(
        <HardwareWalletConfigProvider
          isHardwareWalletAccount
          walletType={HardwareWalletType.Ledger}
          deviceId="device-123"
          isBluetoothEnabled
          permissions={permissions}
        >
          <TestConsumer />
        </HardwareWalletConfigProvider>,
      );

      expect(screen.getByTestId('isHardwareWalletAccount')).toHaveTextContent(
        'true',
      );
      expect(screen.getByTestId('walletType')).toHaveTextContent(
        HardwareWalletType.Ledger,
      );
      expect(screen.getByTestId('deviceId')).toHaveTextContent('device-123');
      expect(screen.getByTestId('isBluetoothEnabled')).toHaveTextContent(
        'true',
      );
      expect(screen.getByTestId('bluetoothPermission')).toHaveTextContent(
        'granted',
      );
    });
  });

  describe('useHardwareWalletConfig', () => {
    it('should return default values when used outside provider', () => {
      // Note: We provide default values so it doesn't throw
      // This allows the hook to be used safely even without a provider
      render(<TestConsumer />);

      expect(screen.getByTestId('isHardwareWalletAccount')).toHaveTextContent(
        'false',
      );
      expect(screen.getByTestId('walletType')).toHaveTextContent('null');
    });
  });
});
