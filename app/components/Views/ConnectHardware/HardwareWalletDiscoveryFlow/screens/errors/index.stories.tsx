import React from 'react';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryErrorScreen from './DiscoveryErrorScreen';
import { type DiscoveryErrorScreenVariant } from './discoveryErrorScreenConfigs';

const noop = () => undefined;

export default {
  title: 'Views / Connect Hardware / Discovery Flow / Error Screens',
};

const storyForVariant = (variant: DiscoveryErrorScreenVariant) => ({
  render: () => (
    <DiscoveryErrorScreen
      variant={variant}
      onRetry={noop}
      onNotNow={noop}
      onContinue={noop}
      walletType={HardwareWalletType.Ledger}
    />
  ),
});

export const DeviceUnresponsive = storyForVariant('device-unresponsive');
export const DeviceLocked = storyForVariant('device-locked');
export const AppNotOpen = storyForVariant('app-not-open');
export const BluetoothOff = storyForVariant('transport-unavailable');
export const BluetoothConnectionFailed = storyForVariant(
  'transport-connection-failed',
);
export const BluetoothAccessDenied = storyForVariant('bluetooth-access-denied');
export const LocationAccessDenied = storyForVariant('location-access-denied');
export const NearbyDevicesDenied = storyForVariant('nearby-devices-denied');
export const SomethingWentWrong = storyForVariant('something-went-wrong');
