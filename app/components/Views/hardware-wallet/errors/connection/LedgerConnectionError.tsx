import React from 'react';
import { ErrorCode } from '@metamask/hw-wallet-sdk';
import { ButtonVariant } from '@metamask/design-system-react-native';

import { strings } from '../../../../../../locales/i18n';

import HardwareWalletTestIds from '../../hardwareWallet.testIds';
import ConnectionErrorState from './ConnectionErrorState';
import type { ConnectionErrorIllustrationVariant } from './ConnectionErrorIllustration';

type SupportedConnectionErrorCode =
  | ErrorCode.PermissionBluetoothDenied
  | ErrorCode.PermissionLocationDenied
  | ErrorCode.PermissionNearbyDevicesDenied
  | ErrorCode.BluetoothDisabled
  | ErrorCode.BluetoothConnectionFailed;

type LedgerConnectionErrorProps = {
  errorCode: SupportedConnectionErrorCode;
  isBusy?: boolean;
  onRetry: () => void;
  onContinue: () => void;
  onOpenSettings: () => void;
  onOpenBluetoothSettings: () => void;
};

type ConnectionErrorConfig = {
  testID: string;
  title: string;
  description: string;
  illustrationVariant: ConnectionErrorIllustrationVariant;
  actions: Array<{
    label: string;
    onPress: () => void;
    testID: string;
    variant: ButtonVariant;
  }>;
  bottomAction?: {
    label: string;
    onPress: () => void;
    testID: string;
    variant: ButtonVariant;
  };
};

export const isConnectionErrorCode = (
  errorCode?: ErrorCode,
): errorCode is SupportedConnectionErrorCode =>
  errorCode === ErrorCode.PermissionBluetoothDenied ||
  errorCode === ErrorCode.PermissionLocationDenied ||
  errorCode === ErrorCode.PermissionNearbyDevicesDenied ||
  errorCode === ErrorCode.BluetoothDisabled ||
  errorCode === ErrorCode.BluetoothConnectionFailed;

const LedgerConnectionError = ({
  errorCode,
  isBusy,
  onRetry,
  onContinue,
  onOpenSettings,
  onOpenBluetoothSettings,
}: LedgerConnectionErrorProps) => {
  const config: Record<SupportedConnectionErrorCode, ConnectionErrorConfig> = {
    [ErrorCode.PermissionBluetoothDenied]: {
      testID: HardwareWalletTestIds.ERROR_BLUETOOTH_ACCESS_DENIED,
      title: strings(
        'hardware_wallet.ledger_onboarding.bluetooth_access_denied_title',
      ),
      description: strings(
        'hardware_wallet.ledger_onboarding.bluetooth_access_denied_description',
      ),
      illustrationVariant: 'bluetoothAccessDenied',
      actions: [
        {
          label: strings('hardware_wallet.error.view_settings'),
          onPress: onOpenSettings,
          testID: HardwareWalletTestIds.VIEW_SETTINGS_BUTTON,
          variant: ButtonVariant.Primary,
        },
        {
          label: strings('hardware_wallet.error.retry'),
          onPress: onRetry,
          testID: HardwareWalletTestIds.RETRY_BUTTON,
          variant: ButtonVariant.Primary,
        },
      ],
      bottomAction: {
        label: strings('hardware_wallet.common.continue'),
        onPress: onContinue,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Secondary,
      },
    },
    [ErrorCode.PermissionLocationDenied]: {
      testID: HardwareWalletTestIds.ERROR_LOCATION_ACCESS_DENIED,
      title: strings(
        'hardware_wallet.ledger_onboarding.location_access_denied_title',
      ),
      description: strings(
        'hardware_wallet.ledger_onboarding.location_access_denied_description',
      ),
      illustrationVariant: 'locationAccessDenied',
      actions: [
        {
          label: strings('hardware_wallet.error.view_settings'),
          onPress: onOpenSettings,
          testID: HardwareWalletTestIds.VIEW_SETTINGS_BUTTON,
          variant: ButtonVariant.Primary,
        },
        {
          label: strings('hardware_wallet.error.retry'),
          onPress: onRetry,
          testID: HardwareWalletTestIds.RETRY_BUTTON,
          variant: ButtonVariant.Primary,
        },
      ],
      bottomAction: {
        label: strings('hardware_wallet.common.continue'),
        onPress: onContinue,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Secondary,
      },
    },
    [ErrorCode.PermissionNearbyDevicesDenied]: {
      testID: HardwareWalletTestIds.ERROR_NEARBY_DEVICES_ACCESS_DENIED,
      title: strings(
        'hardware_wallet.ledger_onboarding.nearby_devices_access_denied_title',
      ),
      description: strings(
        'hardware_wallet.ledger_onboarding.nearby_devices_access_denied_description',
      ),
      illustrationVariant: 'nearbyDevicesDenied',
      actions: [
        {
          label: strings('hardware_wallet.error.view_settings'),
          onPress: onOpenSettings,
          testID: HardwareWalletTestIds.VIEW_SETTINGS_BUTTON,
          variant: ButtonVariant.Primary,
        },
        {
          label: strings('hardware_wallet.error.retry'),
          onPress: onRetry,
          testID: HardwareWalletTestIds.RETRY_BUTTON,
          variant: ButtonVariant.Primary,
        },
      ],
      bottomAction: {
        label: strings('hardware_wallet.common.continue'),
        onPress: onContinue,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Secondary,
      },
    },
    [ErrorCode.BluetoothDisabled]: {
      testID: HardwareWalletTestIds.ERROR_BLUETOOTH_DISABLED,
      title: strings('hardware_wallet.ledger_onboarding.bluetooth_disabled_title'),
      description: strings(
        'hardware_wallet.ledger_onboarding.bluetooth_disabled_description',
      ),
      illustrationVariant: 'bluetoothDisabled',
      actions: [
        {
          label: strings('hardware_wallet.error.view_settings'),
          onPress: onOpenBluetoothSettings,
          testID: HardwareWalletTestIds.VIEW_SETTINGS_BUTTON,
          variant: ButtonVariant.Primary,
        },
        {
          label: strings('hardware_wallet.error.retry'),
          onPress: onRetry,
          testID: HardwareWalletTestIds.RETRY_BUTTON,
          variant: ButtonVariant.Primary,
        },
      ],
      bottomAction: {
        label: strings('hardware_wallet.common.continue'),
        onPress: onContinue,
        testID: HardwareWalletTestIds.CONTINUE_BUTTON,
        variant: ButtonVariant.Secondary,
      },
    },
    [ErrorCode.BluetoothConnectionFailed]: {
      testID: HardwareWalletTestIds.ERROR_BLUETOOTH_CONNECTION_FAILED,
      title: strings(
        'hardware_wallet.ledger_onboarding.bluetooth_connection_failed_title',
      ),
      description: strings(
        'hardware_wallet.ledger_onboarding.bluetooth_connection_failed_description',
      ),
      illustrationVariant: 'bluetoothConnectionFailed',
      actions: [
        {
          label: strings('hardware_wallet.error.retry'),
          onPress: onRetry,
          testID: HardwareWalletTestIds.RETRY_BUTTON,
          variant: ButtonVariant.Primary,
        },
        {
          label: strings('hardware_wallet.common.continue'),
          onPress: onContinue,
          testID: HardwareWalletTestIds.CONTINUE_BUTTON,
          variant: ButtonVariant.Primary,
        },
      ],
    },
  };

  const selectedConfig = config[errorCode];

  return <ConnectionErrorState {...selectedConfig} isBusy={isBusy} />;
};

export default LedgerConnectionError;
