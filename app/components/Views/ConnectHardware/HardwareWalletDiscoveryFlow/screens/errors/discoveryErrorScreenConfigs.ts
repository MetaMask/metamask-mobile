import type { ImageSourcePropType } from 'react-native';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import BluetoothConnectionFailedImage from '../../../../../../images/bluetooth-connection-failed.png';
import EthereumAppClosedImage from '../../../../../../images/ethereum-app-closed.png';
import NearbyDevicesDeniedImage from '../../../../../../images/nearby-devices-denied.png';
import { DiscoveryStep } from '../../DiscoveryFlow.machine.types';

export const DISCOVERY_ERROR_STEPS = [
  DiscoveryStep.DeviceUnresponsive,
  DiscoveryStep.DeviceLocked,
  DiscoveryStep.AppNotOpen,
  DiscoveryStep.BluetoothAccessDenied,
  DiscoveryStep.LocationAccessDenied,
  DiscoveryStep.NearbyDevicesDenied,
  DiscoveryStep.TransportUnavailable,
  DiscoveryStep.TransportConnectionFailed,
] as const satisfies readonly DiscoveryStep[];

export type DiscoveryFlowErrorStep = (typeof DISCOVERY_ERROR_STEPS)[number];

export type DiscoveryErrorScreenVariant =
  | DiscoveryFlowErrorStep
  | 'something-went-wrong';

export type DiscoveryErrorButtonRole =
  | 'retry'
  | 'open-settings'
  | 'not-now'
  | 'continue';

export interface DiscoveryErrorScreenButtonConfig {
  role: DiscoveryErrorButtonRole;
  testID: string;
  labelKey?: string;
}

export interface DiscoveryErrorScreenConfig {
  titleKey: string;
  subtitleKey: string;
  testID: string;
  imageSource?: ImageSourcePropType;
  rive?: {
    artboardName: string;
    stateMachineName: string;
    stateTrigger: string;
  };
  primaryButton?: DiscoveryErrorScreenButtonConfig;
  secondaryButton?: DiscoveryErrorScreenButtonConfig;
  getSubtitleParams?: (
    walletType: HardwareWalletType,
  ) => Record<string, string>;
}

const LEDGER_RIVE = {
  artboardName: 'Ledger',
  stateMachineName: 'Ledger_states',
} as const;

const openSettingsButtons = (
  settingsTestID: string,
  notNowTestID: string,
): Pick<DiscoveryErrorScreenConfig, 'primaryButton' | 'secondaryButton'> => ({
  primaryButton: {
    role: 'open-settings',
    testID: settingsTestID,
  },
  secondaryButton: {
    role: 'not-now',
    testID: notNowTestID,
  },
});

export const DISCOVERY_ERROR_SCREEN_CONFIGS: Record<
  DiscoveryErrorScreenVariant,
  DiscoveryErrorScreenConfig
> = {
  'device-unresponsive': {
    titleKey: 'ledger.unresponsive',
    subtitleKey: 'ledger.unresponsive_message',
    testID: 'ledger-unresponsive-animation',
    rive: { ...LEDGER_RIVE, stateTrigger: 'error' },
    primaryButton: {
      role: 'retry',
      testID: 'ledger-unresponsive-retry-button',
    },
  },
  'device-locked': {
    titleKey: 'ledger.ledger_is_locked',
    subtitleKey: 'ledger.ledger_locked_message_continue',
    testID: 'ledger-locked-animation',
    rive: { ...LEDGER_RIVE, stateTrigger: 'ledger_locked' },
    secondaryButton: {
      role: 'retry',
      testID: 'ledger-locked-retry-button',
    },
  },
  'app-not-open': {
    titleKey: 'ledger.ethereum_app_closed',
    subtitleKey: 'ledger.ethereum_app_closed_message',
    testID: 'ledger-eth-closed-image',
    imageSource: EthereumAppClosedImage,
    primaryButton: {
      role: 'retry',
      testID: 'ledger-eth-closed-retry-button',
    },
  },
  'bluetooth-access-denied': {
    titleKey: 'ledger.bluetooth_access_denied',
    subtitleKey: 'ledger.bluetooth_access_denied_message',
    testID: 'ledger-bt-access-denied-image',
    imageSource: BluetoothConnectionFailedImage,
    ...openSettingsButtons(
      'ledger-bt-access-denied-settings-button',
      'ledger-bt-access-denied-not-now-button',
    ),
  },
  'location-access-denied': {
    titleKey: 'ledger.location_access_denied',
    subtitleKey: 'ledger.location_access_denied_message',
    testID: 'ledger-location-denied-image',
    imageSource: NearbyDevicesDeniedImage,
    ...openSettingsButtons(
      'ledger-location-denied-settings-button',
      'ledger-location-denied-not-now-button',
    ),
  },
  'nearby-devices-denied': {
    titleKey: 'ledger.nearby_devices_denied',
    subtitleKey: 'ledger.nearby_devices_denied_message',
    testID: 'ledger-nearby-denied-image',
    imageSource: NearbyDevicesDeniedImage,
    ...openSettingsButtons(
      'ledger-nearby-denied-settings-button',
      'ledger-nearby-denied-not-now-button',
    ),
  },
  'transport-unavailable': {
    titleKey: 'ledger.bluetooth_turned_off',
    subtitleKey: 'ledger.bluetooth_turned_off_message',
    testID: 'ledger-bt-off-image',
    imageSource: BluetoothConnectionFailedImage,
    ...openSettingsButtons(
      'ledger-bt-off-settings-button',
      'ledger-bt-off-not-now-button',
    ),
  },
  'transport-connection-failed': {
    titleKey: 'ledger.bluetooth_connection_failed',
    subtitleKey: 'ledger.bluetooth_connection_failed_reconnect',
    testID: 'ledger-bt-failed-image',
    imageSource: BluetoothConnectionFailedImage,
    primaryButton: {
      role: 'retry',
      testID: 'ledger-bt-failed-retry-button',
    },
  },
  'something-went-wrong': {
    titleKey: 'hardware_wallet.error.title',
    subtitleKey: 'hardware_wallet.errors.unknown_error',
    testID: 'discovery-generic-error-animation',
    rive: { ...LEDGER_RIVE, stateTrigger: 'error' },
    primaryButton: {
      role: 'continue',
      testID: 'discovery-generic-error-continue-button',
      labelKey: 'hardware_wallet.error.continue',
    },
    secondaryButton: {
      role: 'retry',
      testID: 'discovery-generic-error-retry-button',
      labelKey: 'hardware_wallet.error.retry',
    },
    getSubtitleParams: (walletType) => ({
      device: walletType === HardwareWalletType.Ledger ? 'Ledger' : 'device',
    }),
  },
};

/**
 * Looks up the configuration for a discovery-flow error screen by its
 * variant (e.g. "device-locked", "transport-unavailable",
 * "something-went-wrong"). Returns undefined if the variant has no entry.
 *
 * @param variant - The error screen variant to look up.
 * @returns The screen configuration, or undefined when no entry exists.
 */
export const getDiscoveryErrorScreenConfig = (
  variant: DiscoveryErrorScreenVariant,
): DiscoveryErrorScreenConfig => DISCOVERY_ERROR_SCREEN_CONFIGS[variant];
