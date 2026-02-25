import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';

import { useTheme } from '../../../../util/theme';

import {
  HardwareWalletType,
  HardwareWalletConnectionState,
  ConnectionStatus,
} from '@metamask/hw-wallet-sdk';

import {
  ConnectingContent,
  DeviceSelectionContent,
  AwaitingAppContent,
  AwaitingConfirmationContent,
  ErrorContent,
  SuccessContent,
} from './contents';
import { DiscoveredDevice, type DeviceSelectionState } from '../../types';
import DevLogger from '../../../SDKConnect/utils/DevLogger';

export const HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID =
  'hardware-wallet-bottom-sheet';

const createStyles = (colors: { background: { default: string } }) =>
  StyleSheet.create({
    bottomSheet: {
      backgroundColor: colors.background.default,
    },
  });

export interface HardwareWalletBottomSheetProps {
  connectionState: HardwareWalletConnectionState;
  deviceSelection: DeviceSelectionState;
  walletType: HardwareWalletType | null;
  connectionTips: string[];

  retryLastOperation: () => Promise<void>;
  closeDeviceSelection: () => void;
  selectDevice: (device: DiscoveredDevice) => void;
  rescan: () => void;
  connect: (deviceId: string) => Promise<void>;

  /** Optional callback when sheet closes */
  onClose?: () => void;
  /** Optional callback when user cancels an operation */
  onCancel?: () => void;
  /** Show success state briefly before hiding (ms, 0 to disable) */
  successAutoDismissMs?: number;
  /** Callback when connection succeeds (e.g., to navigate to account selection) */
  onConnectionSuccess?: () => void;
  /** Callback when user cancels during awaiting confirmation state */
  onAwaitingConfirmationCancel?: () => void;
}

/**
 * Unified Hardware Wallet Bottom Sheet
 *
 * Automatically displays the appropriate content based on connection state:
 * - Scanning: Device selection list
 * - Connecting: Shows tips and loading spinner
 * - AwaitingApp: Prompts user to open correct app
 * - AwaitingConfirmation: Prompts user to confirm on device
 * - Error: Shows error with recovery actions
 * - Ready: Shows success feedback
 */
export const HardwareWalletBottomSheet: React.FC<
  HardwareWalletBottomSheetProps
> = ({
  connectionState,
  deviceSelection,
  walletType,
  connectionTips,
  retryLastOperation,
  closeDeviceSelection,
  selectDevice,
  rescan,
  connect,
  onClose,
  onCancel,
  successAutoDismissMs = 1000,
  onConnectionSuccess,
  onAwaitingConfirmationCancel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  const { devices, selectedDevice, isScanning } = deviceSelection;

  const shouldShow = useMemo(() => {
    switch (connectionState.status) {
      case ConnectionStatus.Scanning:
      case ConnectionStatus.Connecting:
      case ConnectionStatus.Connected:
      case ConnectionStatus.AwaitingApp:
      case ConnectionStatus.AwaitingConfirmation:
      case ConnectionStatus.ErrorState:
      case ConnectionStatus.Ready:
        return true;
      default:
        return false;
    }
  }, [connectionState.status]);

  useEffect(() => {
    DevLogger.log(
      '[HardwareWalletBottomSheet] shouldShow:',
      shouldShow,
      'status:',
      connectionState.status,
    );
  }, [shouldShow, connectionState.status]);

  const handleClose = useCallback(() => {
    if (
      connectionState.status === ConnectionStatus.Scanning ||
      connectionState.status === ConnectionStatus.Connecting ||
      connectionState.status === ConnectionStatus.AwaitingApp ||
      connectionState.status === ConnectionStatus.ErrorState
    ) {
      closeDeviceSelection();
    }
    onClose?.();
  }, [connectionState.status, closeDeviceSelection, onClose]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    onAwaitingConfirmationCancel?.();
  }, [onAwaitingConfirmationCancel]);

  const handleErrorContinue = useCallback(async () => {
    await retryLastOperation();
  }, [retryLastOperation]);

  const handleErrorDismiss = useCallback(() => {
    closeDeviceSelection();
  }, [closeDeviceSelection]);

  const handleSuccessDismiss = useCallback(() => {
    onConnectionSuccess?.();
  }, [onConnectionSuccess]);

  const handleSelectDevice = useCallback(
    (selectedDev: DiscoveredDevice) => {
      selectDevice(selectedDev);
    },
    [selectDevice],
  );

  const handleConfirmDeviceSelection = useCallback(async () => {
    if (selectedDevice) {
      DevLogger.log(
        '[HardwareWalletBottomSheet] Connecting to device:',
        selectedDevice.id,
      );
      await connect(selectedDevice.id);
    }
  }, [selectedDevice, connect]);

  const handleRescan = useCallback(() => {
    rescan();
  }, [rescan]);

  const handleCancelDeviceSelection = useCallback(() => {
    closeDeviceSelection();
    onCancel?.();
  }, [closeDeviceSelection, onCancel]);

  // The effective device type — only used when the sheet is visible,
  // so walletType should always be set by then.
  const deviceType = walletType ?? HardwareWalletType.Ledger;

  const renderContent = () => {
    switch (connectionState.status) {
      case ConnectionStatus.Ready:
        return (
          <SuccessContent
            deviceType={deviceType}
            onDismiss={handleSuccessDismiss}
            autoDismissMs={successAutoDismissMs}
          />
        );

      case ConnectionStatus.Scanning:
        return (
          <DeviceSelectionContent
            devices={devices}
            selectedDevice={selectedDevice ?? undefined}
            isScanning={isScanning}
            deviceType={deviceType}
            onSelectDevice={handleSelectDevice}
            onConfirmSelection={handleConfirmDeviceSelection}
            onRescan={handleRescan}
            onCancel={handleCancelDeviceSelection}
          />
        );

      case ConnectionStatus.Connecting:
      case ConnectionStatus.Connected:
        return (
          <ConnectingContent
            deviceType={deviceType}
            connectionTips={connectionTips}
          />
        );

      case ConnectionStatus.AwaitingApp:
        return (
          <AwaitingAppContent
            deviceType={deviceType}
            requiredApp={connectionState.appName}
            onContinue={handleErrorContinue}
          />
        );

      case ConnectionStatus.AwaitingConfirmation:
        return (
          <AwaitingConfirmationContent
            deviceType={deviceType}
            operationType={connectionState.operationType}
            onCancel={handleAwaitingConfirmationCancel}
          />
        );

      case ConnectionStatus.ErrorState:
        return (
          <ErrorContent
            error={connectionState.error}
            deviceType={deviceType}
            onContinue={handleErrorContinue}
            onDismiss={handleErrorDismiss}
          />
        );

      default:
        return null;
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <BottomSheet
      ref={bottomSheetRef}
      testID={HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID}
      isFullscreen={false}
      onClose={handleClose}
      shouldNavigateBack={false}
      style={styles.bottomSheet}
    >
      {renderContent()}
    </BottomSheet>
  );
};
