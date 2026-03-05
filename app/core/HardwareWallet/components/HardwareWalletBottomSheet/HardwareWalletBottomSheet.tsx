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
import { assertWalletType } from '../../helpers';
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
    if (connectionState.status === ConnectionStatus.AwaitingConfirmation) {
      onAwaitingConfirmationCancel?.();
    }
    onClose();
  }, [connectionState.status, onAwaitingConfirmationCancel, onClose]);

  const handleAwaitingConfirmationCancel = useCallback(() => {
    onAwaitingConfirmationCancel?.();
  }, [onAwaitingConfirmationCancel]);

  const handleErrorContinue = useCallback(async () => {
    await retryEnsureDeviceReady();
  }, [retryEnsureDeviceReady]);

  const handleErrorDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

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

  const deviceType = assertWalletType(walletType);

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
        return <ConnectingContent deviceType={deviceType} />;

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
