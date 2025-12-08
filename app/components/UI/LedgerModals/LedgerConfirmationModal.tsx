import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { mockTheme, useAppThemeFromContext } from '../../../util/theme';
import { Colors } from '../../../util/theme/models';
import ConfirmationStep from './Steps/ConfirmationStep';
import OpenETHAppStep from './Steps/OpenETHAppStep';
import SearchingForDeviceStep from './Steps/SearchingForDeviceStep';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import { useHardwareWallet } from '../../../core/HardwareWallets';
import {
  HardwareWalletType,
  isAwaitingApp,
  isConnected,
  isConnecting,
  isDisconnected,
} from '../../../core/HardwareWallets/types';
import Logger from '../../../util/Logger';

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
  const { connectionState, executeWithWallet, connect, detectedWalletType } =
    useHardwareWallet();

  // Guards to prevent race conditions
  const hasInitiatedConnectionRef = useRef(false);
  const hasExecutedConfirmationRef = useRef(false);

  const connectLedger = useCallback(async () => {
    // Guard against multiple executions
    if (hasExecutedConfirmationRef.current) {
      Logger.log(
        '[LedgerConfirmationModal] Confirmation already executed, skipping',
      );
      return;
    }
    hasExecutedConfirmationRef.current = true;

    try {
      await executeWithWallet(async () => {
        await onConfirmation();
      });
    } catch (err) {
      // Reset flag on error to allow retry
      hasExecutedConfirmationRef.current = false;

      // Handle edge case: ETH app not installed after arriving at confirmation
      Logger.log('[LedgerConfirmationModal] executeWithWallet error:', err);
      trackEvent(
        createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
          .addProperties({
            device_type: HardwareDeviceTypes.LEDGER,
            error: 'LEDGER_ETH_APP_NOT_INSTALLED',
          })
          .build(),
      );
    }
  }, [executeWithWallet, onConfirmation, trackEvent, createEventBuilder]);

  // In case of manual rejection
  const onReject = useCallback(() => {
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
  }, [onRejection, trackEvent, createEventBuilder]);

  // Auto-start connection when modal loads (runs only once on mount)
  useEffect(() => {
    // Guard against multiple connection attempts
    if (hasInitiatedConnectionRef.current) {
      return;
    }

    if (isDisconnected(connectionState) && deviceId) {
      hasInitiatedConnectionRef.current = true;
      const walletType = detectedWalletType || HardwareWalletType.LEDGER;
      connect(walletType, deviceId);
    }
    // Only run on mount - intentionally excluding connectionState and connect to prevent retry loops
    // The connect function can change when state changes, which would cause infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, detectedWalletType]);

  // Execute confirmation when connected
  useEffect(() => {
    if (isConnected(connectionState) && !hasExecutedConfirmationRef.current) {
      connectLedger();
    }
  }, [connectionState, connectLedger]);

  // useEffect(() => {
  //   if (isSendingLedgerCommands && !delayClose && !completeClose) {
  //     setDelayClose(true);
  //     setTimeout(() => {
  //       setDelayClose(false);
  //       setCompleteClose(true);
  //     }, 2000);
  //   }
  // }, [completeClose, delayClose, isSendingLedgerCommands]);

  // useEffect(() => {
  //   if (error) {
  //     switch (ledgerError) {
  //       case LedgerCommunicationErrors.FailedToOpenApp:
  //         setErrorDetails({
  //           title: strings('ledger.failed_to_open_eth_app'),
  //           subtitle: strings('ledger.ethereum_app_open_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.FailedToCloseApp:
  //         setErrorDetails({
  //           title: strings('ledger.running_app_close'),
  //           subtitle: strings('ledger.running_app_close_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.AppIsNotInstalled:
  //         setErrorDetails({
  //           title: strings('ledger.ethereum_app_not_installed'),
  //           subtitle: strings('ledger.ethereum_app_not_installed_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.LedgerIsLocked:
  //         setErrorDetails({
  //           title: strings('ledger.ledger_is_locked'),
  //           subtitle: strings('ledger.unlock_ledger_message'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.BlindSignError:
  //         setErrorDetails({
  //           title: strings('ledger.blind_sign_error'),
  //           subtitle: strings('ledger.blind_sign_error_message'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.UserRefusedConfirmation:
  //         setErrorDetails({
  //           title: strings('ledger.user_reject_transaction'),
  //           subtitle: strings('ledger.user_reject_transaction_message'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.LedgerHasPendingConfirmation:
  //         setErrorDetails({
  //           title: strings('ledger.ledger_pending_confirmation'),
  //           subtitle: strings('ledger.ledger_pending_confirmation_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.NotSupported:
  //         setErrorDetails({
  //           title: strings('ledger.not_supported'),
  //           subtitle: strings('ledger.not_supported_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.UnknownError:
  //         setErrorDetails({
  //           title: strings('ledger.unknown_error'),
  //           subtitle: strings('ledger.unknown_error_message'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.NonceTooLow:
  //         setErrorDetails({
  //           title: strings('ledger.nonce_too_low'),
  //           subtitle: strings('ledger.nonce_too_low_error'),
  //         });
  //         break;
  //       case LedgerCommunicationErrors.LedgerDisconnected:
  //       default:
  //         setErrorDetails({
  //           title: strings('ledger.ledger_disconnected'),
  //           subtitle: strings('ledger.ledger_disconnected_error'),
  //         });
  //         break;
  //     }
  //     if (ledgerError !== LedgerCommunicationErrors.UserRefusedConfirmation) {
  //       trackEvent(
  //         createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
  //           .addProperties({
  //             device_type: HardwareDeviceTypes.LEDGER,
  //             error: `${ledgerError}`,
  //           })
  //           .build(),
  //       );
  //     }
  //   }

  //   if (bluetoothPermissionError && !permissionErrorShown) {
  //     switch (bluetoothPermissionError) {
  //       case BluetoothPermissionErrors.LocationAccessBlocked:
  //         setErrorDetails({
  //           title: strings('ledger.location_access_blocked'),
  //           subtitle: strings('ledger.location_access_blocked_error'),
  //         });
  //         break;
  //       case BluetoothPermissionErrors.NearbyDevicesAccessBlocked:
  //         setErrorDetails({
  //           title: strings('ledger.nearbyDevices_access_blocked'),
  //           subtitle: strings('ledger.nearbyDevices_access_blocked_message'),
  //         });
  //         break;
  //       case BluetoothPermissionErrors.BluetoothAccessBlocked:
  //         setErrorDetails({
  //           title: strings('ledger.bluetooth_access_blocked'),
  //           subtitle: strings('ledger.bluetooth_access_blocked_message'),
  //         });
  //         break;
  //     }
  //     setPermissionErrorShown(true);
  //     trackEvent(
  //       createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
  //         .addProperties({
  //           device_type: HardwareDeviceTypes.LEDGER,
  //           error: 'LEDGER_BLUETOOTH_PERMISSION_ERR',
  //         })
  //         .build(),
  //     );
  //   }

  //   if (bluetoothConnectionError) {
  //     setErrorDetails({
  //       title: strings('ledger.bluetooth_off'),
  //       subtitle: strings('ledger.bluetooth_off_message'),
  //     });

  //     trackEvent(
  //       createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
  //         .addProperties({
  //           device_type: HardwareDeviceTypes.LEDGER,
  //           error: 'LEDGER_BLUETOOTH_CONNECTION_ERR',
  //         })
  //         .build(),
  //     );
  //   }

  //   if (
  //     !ledgerError &&
  //     !bluetoothPermissionError &&
  //     !bluetoothConnectionError &&
  //     !permissionErrorShown
  //   ) {
  //     setErrorDetails(undefined);
  //   }

  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [
  //   ledgerError,
  //   bluetoothConnectionError,
  //   bluetoothPermissionError,
  //   permissionErrorShown,
  // ]);

  // if (errorDetails) {
  //   return (
  //     <SafeAreaView style={styles.wrapper}>
  //       <View style={styles.contentWrapper}>
  //         <ErrorStep
  //           onReject={onReject}
  //           onRetry={onRetry}
  //           title={errorDetails?.title}
  //           subTitle={errorDetails?.subtitle}
  //           showViewSettings={
  //             permissionErrorShown ||
  //             !!bluetoothConnectionError ||
  //             !!bluetoothPermissionError
  //           }
  //           isRetryHide={
  //             ledgerError === LedgerCommunicationErrors.UnknownError ||
  //             ledgerError === LedgerCommunicationErrors.NonceTooLow ||
  //             ledgerError === LedgerCommunicationErrors.NotSupported ||
  //             ledgerError === LedgerCommunicationErrors.BlindSignError ||
  //             ledgerError === LedgerCommunicationErrors.UserRefusedConfirmation
  //           }
  //         />
  //       </View>
  //     </SafeAreaView>
  //   );
  // }

  // Show searching step while disconnected or connecting
  if (isDisconnected(connectionState) || isConnecting(connectionState)) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <SearchingForDeviceStep />
        </View>
      </SafeAreaView>
    );
  }

  // Show open ETH app step when awaiting app
  if (isAwaitingApp(connectionState)) {
    return (
      <SafeAreaView style={styles.wrapper}>
        <View style={styles.contentWrapper}>
          <OpenETHAppStep onReject={onReject} />
        </View>
      </SafeAreaView>
    );
  }

  // Show confirmation step when connected or awaiting confirmation
  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.contentWrapper}>
        <ConfirmationStep onReject={onReject} />
      </View>
    </SafeAreaView>
  );
};

export default React.memo(LedgerConfirmationModal);
