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
import { isQRHardwareScanError } from '../../errors';

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

  retryEnsureDeviceReady: () => Promise<void>;
  selectDevice: (device: DiscoveredDevice) => void;
  rescan: () => void;
  connect: (deviceId: string) => Promise<void>;

  /** Callback when sheet is dismissed (handles all cleanup) */
  onClose: () => void;
  /** Show success state briefly before hiding (ms, 0 to disable) */
  successAutoDismissMs?: number;
  /** Callback when connection succeeds (e.g., to navigate to account selection) */
  onConnectionSuccess?: () => void;
  /** Callback when user cancels during awaiting confirmation state */
  onAwaitingConfirmationCancel?: () => void;
  /** Callback fired when the user taps the CTA on an error/recovery screen. */
  onCTAClicked?: () => void;
  /** Callback when the user retries a QR scan error from the bottom sheet. */
  onRetryQrScan?: () => void;
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
  retryEnsureDeviceReady,
  selectDevice,
  rescan,
  connect,
  onClose,
  successAutoDismissMs = 1000,
  onConnectionSuccess,
  onAwaitingConfirmationCancel,
  onCTAClicked,
  onRetryQrScan,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bottomSheetRef = useRef<BottomSheetRef>(null);
  const [openQrScannerOnMount, setOpenQrScannerOnMount] = React.useState(false);

  const { devices, selectedDevice, isScanning } = deviceSelection;

  const shouldShow = useMemo(() => {
    if (!walletType) return false;
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
  }, [connectionState.status, walletType]);

  useEffect(() => {
    DevLogger.log(
      '[HardwareWalletBottomSheet] shouldShow:',
      shouldShow,
      'status:',
      connectionState.status,
    );
  }, [shouldShow, connectionState.status]);

  const handleClose = useCallback(() => {
    if (connectionState.status === ConnectionStatus.AwaitingConfirmation) {
      onAwaitingConfirmationCancel?.();
    }
    onClose();
  }, [connectionState.status, onAwaitingConfirmationCancel, onClose]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    onAwaitingConfirmationCancel?.();
  }, [onAwaitingConfirmationCancel]);

  const handleErrorContinue = useCallback(async () => {
    onCTAClicked?.();
    if (
      walletType === HardwareWalletType.Qr &&
      connectionState.status === ConnectionStatus.ErrorState &&
      isQRHardwareScanError(connectionState.error)
    ) {
      setOpenQrScannerOnMount(true);
      onRetryQrScan?.();
      return;
    }
    await retryEnsureDeviceReady();
  }, [
    connectionState,
    onCTAClicked,
    onRetryQrScan,
    retryEnsureDeviceReady,
    walletType,
  ]);

  const handleErrorDismiss = useCallback(() => {
    onCTAClicked?.();
    onClose();
  }, [onClose, onCTAClicked]);

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
    onClose();
  }, [onClose]);

  const handleQrScannerOpened = useCallback(() => {
    setOpenQrScannerOnMount(false);
  }, []);

  const renderContent = () => {
    if (!walletType) return null;
    switch (connectionState.status) {
      case ConnectionStatus.Ready:
        return (
          <SuccessContent
            deviceType={walletType}
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
            deviceType={walletType}
            onSelectDevice={handleSelectDevice}
            onConfirmSelection={handleConfirmDeviceSelection}
            onRescan={handleRescan}
            onCancel={handleCancelDeviceSelection}
          />
        );

      case ConnectionStatus.Connecting:
      case ConnectionStatus.Connected:
        return <ConnectingContent deviceType={walletType} />;

      case ConnectionStatus.AwaitingApp:
        return (
          <AwaitingAppContent
            deviceType={walletType}
            requiredApp={connectionState.appName}
            onContinue={handleErrorContinue}
          />
        );

      case ConnectionStatus.AwaitingConfirmation:
        return (
          <AwaitingConfirmationContent
            deviceType={walletType}
            operationType={connectionState.operationType}
            onCancel={handleAwaitingConfirmationCancel}
            openQrScannerOnMount={openQrScannerOnMount}
            onQrScannerOpened={handleQrScannerOpened}
          />
        );

      case ConnectionStatus.ErrorState:
        return (
          <ErrorContent
            error={connectionState.error}
            deviceType={walletType}
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
