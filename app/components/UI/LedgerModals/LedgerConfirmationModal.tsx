import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import useLedgerBluetooth from '../../hooks/Ledger/useLedgerBluetooth';
import useBluetooth from '../../hooks/Ledger/useBluetooth';
import useBluetoothPermissions from '../../../components/hooks/useBluetoothPermissions';
import ConfirmationStep from './Steps/ConfirmationStep';
import OpenETHAppStep from './Steps/OpenETHAppStep';
import SearchingForDeviceStep from './Steps/SearchingForDeviceStep';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { LedgerCommunicationErrors } from '../../../core/Ledger/ledgerErrors';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  useHardwareWalletError,
  HardwareWalletType,
} from '../../../core/HardwareWallet';

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
  const { trackEvent, createEventBuilder } = useMetrics();
  const [delayClose, setDelayClose] = useState(false);
  const [completeClose, setCompleteClose] = useState(false);
  const [permissionErrorShown, setPermissionErrorShown] = useState(false);
  const {
    isSendingLedgerCommands,
    isAppLaunchConfirmationNeeded,
    ledgerLogicToRun,
    error: ledgerError,
  } = useLedgerBluetooth(deviceId);

  // Use centralized error handling with bottom sheet
  const { parseAndShowError } = useHardwareWalletError();

  const {
    hasBluetoothPermissions,
    bluetoothPermissionError,
    checkPermissions,
  } = useBluetoothPermissions();
  const { bluetoothOn, bluetoothConnectionError } = useBluetooth(
    hasBluetoothPermissions,
  );

  const connectLedger = () => {
    console.log('[DEBUG LedgerConfirmationModal] connectLedger called');
    try {
      ledgerLogicToRun(async () => {
        console.log(
          '[DEBUG LedgerConfirmationModal] Inside ledgerLogicToRun callback',
        );
        await onConfirmation();
      });
    } catch (_e) {
      // Handle a super edge case of the user starting a transaction with the device connected
      // After arriving to confirmation the ETH app is not installed anymore this causes a crash.
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            error: 'LEDGER_ETH_APP_NOT_INSTALLED',
          })
          .build(),
      );
    }
  };

  // In case of manual rejection
  const onReject = () => {
    try {
      onRejection();
    } finally {
      trackEvent(
        createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
          })
          .build(),
      );
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
    if (isSendingLedgerCommands && !delayClose && !completeClose) {
      setDelayClose(true);
      setTimeout(() => {
        setDelayClose(false);
        setCompleteClose(true);
      }, 2000);
    }
  }, [completeClose, delayClose, isSendingLedgerCommands]);

  useEffect(() => {
    console.log(
      '[DEBUG LedgerConfirmationModal] ledgerError changed:',
      ledgerError,
    );
    if (ledgerError) {
      // Show error in centralized bottom sheet (except for user cancellation)
      if (ledgerError !== LedgerCommunicationErrors.UserRefusedConfirmation) {
        console.log(
          '[DEBUG LedgerConfirmationModal] Calling parseAndShowError with:',
          ledgerError,
        );
        parseAndShowError(ledgerError, HardwareWalletType.Ledger);
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              error: `${ledgerError}`,
            })
            .build(),
        );
        // Close the modal so user can see the error bottom sheet
        console.log(
          '[DEBUG LedgerConfirmationModal] Calling onRejection to close modal',
        );
        onRejection();
      } else {
        // User cancelled - just close the modal without showing error
        console.log(
          '[DEBUG LedgerConfirmationModal] User cancelled, calling onRejection',
        );
        onRejection();
      }
    }

    if (bluetoothPermissionError && !permissionErrorShown) {
      parseAndShowError(bluetoothPermissionError, HardwareWalletType.Ledger);
      setPermissionErrorShown(true);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            error: 'LEDGER_BLUETOOTH_PERMISSION_ERR',
          })
          .build(),
      );
    }

    if (bluetoothConnectionError) {
      parseAndShowError(
        new Error('BluetoothDisabled'),
        HardwareWalletType.Ledger,
      );
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            error: 'LEDGER_BLUETOOTH_CONNECTION_ERR',
          })
          .build(),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ledgerError,
    bluetoothConnectionError,
    bluetoothPermissionError,
    permissionErrorShown,
    onRejection,
    parseAndShowError,
    trackEvent,
    createEventBuilder,
  ]);

  // Check if there's an error state that should prevent the modal from showing the signing flow
  const hasError =
    ledgerError || bluetoothPermissionError || bluetoothConnectionError;

  // When an error occurs, show the searching step (spinner) while the error bottom sheet is displayed
  // This prevents showing "confirm on your ledger" when the device is actually locked/disconnected
  if (hasError) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <SearchingForDeviceStep />
        </View>
      </SafeAreaView>
    );
  }

  if (!isSendingLedgerCommands || !completeClose) {
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
