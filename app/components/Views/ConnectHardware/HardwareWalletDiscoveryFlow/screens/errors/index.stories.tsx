import React from 'react';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import DiscoveryErrorScreen from './DiscoveryErrorScreen';
import { type DiscoveryErrorScreenVariant } from './discoveryErrorScreenConfigs';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';

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

export const DeviceUnresponsive = storyForVariant(
  DiscoveryStep.DeviceUnresponsive,
);
export const DeviceLocked = storyForVariant(DiscoveryStep.DeviceLocked);
export const AppNotOpen = storyForVariant(DiscoveryStep.AppNotOpen);
export const BluetoothOff = storyForVariant(DiscoveryStep.TransportUnavailable);
export const BluetoothConnectionFailed = storyForVariant(
  DiscoveryStep.TransportConnectionFailed,
);
export const BluetoothAccessDenied = storyForVariant(
  DiscoveryStep.BluetoothAccessDenied,
);
export const LocationAccessDenied = storyForVariant(
  DiscoveryStep.LocationAccessDenied,
);
export const NearbyDevicesDenied = storyForVariant(
  DiscoveryStep.NearbyDevicesDenied,
);
export const SomethingWentWrong = storyForVariant('something-went-wrong');
