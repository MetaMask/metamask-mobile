import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { strings } from '../../../../locales/i18n';
import { Colors } from '../../../util/theme/models';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothPermissions from '../../../components/hooks/useBluetoothPermissions';
import ConfirmationStep from './Steps/ConfirmationStep';
import ErrorStep from './Steps/ErrorStep';
import OpenETHAppStep from './Steps/OpenETHAppStep';
import SearchingForDeviceStep from './Steps/SearchingForDeviceStep';
import { unlockLedgerDefaultAccount } from '../../../core/Ledger/Ledger';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import {
  BluetoothPermissionErrors,
  LedgerCommunicationErrors,
} from '../../../core/Ledger/ledgerErrors';

const createStyles = (colors: Colors) =>
  StyleSheet.create({
    wrapper: {
      backgroundColor: colors.background.default,
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      height: 450,
    },
    contentWrapper: {
      flex: 1,
      alignItems: 'center',
      marginTop: 35,
    },
  });

export interface LedgerConfirmationModalProps {
  onConfirmation: () => Promise<void>;
  onRejection: () => void;
  deviceId: string;
}

const LedgerConfirmationModal = ({
  onConfirmation,
  onRejection,
  deviceId,
}: LedgerConfirmationModalProps) => {
  const { colors } = useAppThemeFromContext() || mockTheme;
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { trackEvent } = useMetrics();
  const [permissionErrorShown, setPermissionErrorShown] = useState(false);
  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(deviceId);
  const [errorDetails, setErrorDetails] = useState<{
    title: string;
    subtitle: string;
  }>();

  const {
    hasBluetoothPermissions,
    bluetoothPermissionError,
    checkPermissions,
  } = useBluetoothPermissions();
  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions,
  );

  const connectLedger = () => {
    try {
      ledgerLogicToRun(async () => {
        await unlockLedgerDefaultAccount(false);
        await onConfirmation();
      });
    } catch (_e) {
      // Handle a super edge case of the user starting a transaction with the device connected
      // After arriving to confirmation the ETH app is not installed anymore this causes a crash.
      trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_ERROR, {
        device_type: 'Ledger',
        error: 'LEDGER_ETH_APP_NOT_INSTALLED',
      });
    }
  };

  // In case of manual rejection
  const onReject = () => {
    try {
      onRejection();
    } finally {
      trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_TRANSACTION_CANCELLED, {
        device_type: 'Ledger',
      });
    }
  };

  const onRetry = async () => {
    setPermissionErrorShown(false);

    if (!hasBluetoothPermissions) {
      await checkPermissions();
    }

    if (hasBluetoothPermissions && bluetoothOn) {
      connectLedger();
    }
  };

  useEffect(() => {
    hasBluetoothPermissions &&
      bluetoothOn &&
      !permissionErrorShown &&
      connectLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasBluetoothPermissions, bluetoothOn]);

  useEffect(() => {
    if (ledgerError) {
      switch (ledgerError) {
        case LedgerCommunicationErrors.FailedToOpenApp:
          setErrorDetails({
            title: strings('ledger.failed_to_open_eth_app'),
            subtitle: strings('ledger.ethereum_app_open_error'),
          });
          break;
        case LedgerCommunicationErrors.FailedToCloseApp:
          setErrorDetails({
            title: strings('ledger.running_app_close'),
            subtitle: strings('ledger.running_app_close_error'),
          });
          break;
        case LedgerCommunicationErrors.AppIsNotInstalled:
          setErrorDetails({
            title: strings('ledger.ethereum_app_not_installed'),
            subtitle: strings('ledger.ethereum_app_not_installed_error'),
          });
          break;
        case LedgerCommunicationErrors.LedgerIsLocked:
          setErrorDetails({
            title: strings('ledger.ledger_is_locked'),
            subtitle: strings('ledger.unlock_ledger_message'),
          });
          break;
        case LedgerCommunicationErrors.UserRefusedConfirmation:
          onReject();
          break;
        case LedgerCommunicationErrors.LedgerHasPendingConfirmation:
          setErrorDetails({
            title: strings('ledger.ledger_pending_confirmation'),
            subtitle: strings('ledger.ledger_pending_confirmation_error'),
          });
          break;
        case LedgerCommunicationErrors.NotSupported:
          setErrorDetails({
            title: strings('ledger.not_supported'),
            subtitle: strings('ledger.not_supported_error'),
          });
          break;
        case LedgerCommunicationErrors.UnknownError:
          setErrorDetails({
            title: strings('ledger.unknown_error'),
            subtitle: strings('ledger.unknown_error_message'),
          });
          break;
        case LedgerCommunicationErrors.NonceTooLow:
          setErrorDetails({
            title: strings('ledger.nonce_too_low'),
            subtitle: strings('ledger.nonce_too_low_error'),
          });
          break;
        case LedgerCommunicationErrors.LedgerDisconnected:
        default:
          setErrorDetails({
            title: strings('ledger.ledger_disconnected'),
            subtitle: strings('ledger.ledger_disconnected_error'),
          });
          break;
      }
      if (ledgerError !== LedgerCommunicationErrors.UserRefusedConfirmation) {
        trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_ERROR, {
          device_type: 'Ledger',
          error: `${ledgerError}`,
        });
      }
    }

    if (bluetoothPermissionError && !permissionErrorShown) {
      switch (bluetoothPermissionError) {
        case BluetoothPermissionErrors.LocationAccessBlocked:
          setErrorDetails({
            title: strings('ledger.location_access_blocked'),
            subtitle: strings('ledger.location_access_blocked_error'),
          });
          break;
        case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
          setErrorDetails({
            title: strings('ledger.nearbyDevices_access_blocked'),
            subtitle: strings('ledger.nearbyDevices_access_blocked_message'),
          });
          break;
        case BluetoothPermissionErrors.BluetoothAccessBlocked:
          setErrorDetails({
            title: strings('ledger.bluetooth_access_blocked'),
            subtitle: strings('ledger.bluetooth_access_blocked_message'),
          });
          break;
      }
      setPermissionErrorShown(true);
      trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_ERROR, {
        device_type: 'Ledger',
        error: 'LEDGER_BLUETOOTH_PERMISSION_ERR',
      });
    }

    if (bluetoothConnectionError) {
      setErrorDetails({
        title: strings('ledger.bluetooth_off'),
        subtitle: strings('ledger.bluetooth_off_message'),
      });
      trackEvent(MetaMetricsEvents.LEDGER_HARDWARE_WALLET_ERROR, {
        device_type: 'Ledger',
        error: 'LEDGER_BLUETOOTH_CONNECTION_ERR',
      });
    }

    if (
      !ledgerError &&
      !bluetoothPermissionError &&
      !bluetoothConnectionError &&
      !permissionErrorShown
    ) {
      setErrorDetails(undefined);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ledgerError,
    bluetoothConnectionError,
    bluetoothPermissionError,
    permissionErrorShown,
  ]);

  if (errorDetails) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <ErrorStep
            onReject={onReject}
            onRetry={onRetry}
            title={errorDetails?.title}
            subTitle={errorDetails?.subtitle}
            showViewSettings={
              permissionErrorShown ||
              !!bluetoothConnectionError ||
              !!bluetoothPermissionError
            }
            isRetryHide={
              ledgerError === LedgerCommunicationErrors.UnknownError ||
              ledgerError === LedgerCommunicationErrors.NonceTooLow ||
              ledgerError === LedgerCommunicationErrors.NotSupported
            }
          />
        </View>
      </SafeAreaView>
    );
  }

  if (!isSendingLedgerCommands) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <SearchingForDeviceStep />
        </View>
      </SafeAreaView>
    );
  }

  if (isAppLaunchConfirmationNeeded) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <OpenETHAppStep onReject={onReject} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.contentWrapper}>
        <ConfirmationStep onReject={onReject} />
      </View>
    </SafeAreaView>
  );
};

export default React.memo(LedgerConfirmationModal);
