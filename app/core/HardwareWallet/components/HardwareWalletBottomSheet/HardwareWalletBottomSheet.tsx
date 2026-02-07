/* eslint-disable no-console */
import React, { useMemo, useRef, useCallback, useEffect } from 'react';
import { StyleSheet } from 'react-native';

import BottomSheet, {
  BottomSheetRef,
} from '../../../../component-library/components/BottomSheets/BottomSheet';

import { useTheme } from '../../../../util/theme';

import {
  useHardwareWalletState,
  useHardwareWalletConfig,
  useHardwareWalletActions,
} from '../../contexts';
import { ConnectionStatus } from '../../connectionState';
import { HardwareWalletType } from '../../helpers';

import {
  ConnectingContent,
  DeviceSelectionContent,
  AwaitingAppContent,
  AwaitingConfirmationContent,
  ErrorContent,
  SuccessContent,
} from './contents';
import { DiscoveredDevice } from '../../types';

// Test IDs
export const HARDWARE_WALLET_BOTTOM_SHEET_TEST_ID =
  'hardware-wallet-bottom-sheet';

const createStyles = (colors: { background: { default: string } }) =>
  StyleSheet.create({
    bottomSheet: {
      backgroundColor: colors.background.default,
    },
  });

export interface HardwareWalletBottomSheetProps {
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
 * - Connecting: Shows tips and loading spinner
 * - AwaitingApp: Prompts user to open Ethereum app
 * - AwaitingConfirmation: Prompts user to confirm on device
 * - Error: Shows error with recovery actions
 *
 * The sheet visibility is controlled by the connection state from context.
 */
export const HardwareWalletBottomSheet: React.FC<
  HardwareWalletBottomSheetProps
> = ({
  onClose,
  onCancel,
  successAutoDismissMs = 1000,
  onConnectionSuccess,
  onAwaitingConfirmationCancel,
}) => {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const bottomSheetRef = useRef<BottomSheetRef>(null);

  // Get state and actions from context
  const { connectionState, deviceSelection } = useHardwareWalletState();
  const { walletType } = useHardwareWalletConfig();
  const { retry, closeDeviceSelection, selectDevice, rescan, connect } =
    useHardwareWalletActions();

  // Extract device selection state from context
  const { devices, selectedDevice, isScanning } = deviceSelection;

  // Determine if sheet should be visible
  const shouldShow = useMemo(() => {
    switch (connectionState.status) {
      case ConnectionStatus.Scanning:
      case ConnectionStatus.Connecting:
      case ConnectionStatus.Connected:
      case ConnectionStatus.AwaitingApp:
      case ConnectionStatus.AwaitingConfirmation:
      case ConnectionStatus.ErrorState:
      case ConnectionStatus.Success:
        return true;
      default:
        return false;
    }
  }, [connectionState.status]);

  // Debug: log visibility changes
  useEffect(() => {
    console.log(
      '[HardwareWalletBottomSheet] shouldShow:',
      shouldShow,
      'status:',
      connectionState.status,
    );
  }, [shouldShow, connectionState.status]);

  // Handle sheet close
  const handleClose = useCallback(() => {
    // If we're in any active state (scanning, connecting, error, etc.),
    // call closeDeviceSelection to properly clean up and resolve any pending promises
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

  // Handle cancel during awaiting confirmation state
  // This uses the specific callback from provider, which triggers the stored onReject
  const handleAwaitingConfirmationCancel = useCallback(() => {
    onAwaitingConfirmationCancel?.();
  }, [onAwaitingConfirmationCancel]);

  // Handle error continue - user wants to retry the operation
  // Only manual dismiss (swipe down) should resolve with false
  const handleErrorContinue = useCallback(async () => {
    await retry();
  }, [retry]);

  // Handle error dismiss - for ACKNOWLEDGE errors, just close the sheet
  // This is used when the error cannot be recovered by retrying
  const handleErrorDismiss = useCallback(() => {
    closeDeviceSelection();
  }, [closeDeviceSelection]);

  // Handle success dismiss - trigger callback which will resolve the promise
  // and transition state properly
  const handleSuccessDismiss = useCallback(() => {
    onConnectionSuccess?.();
  }, [onConnectionSuccess]);

  // Handle device selection - use context action
  const handleSelectDevice = useCallback(
    (selectedDev: DiscoveredDevice) => {
      selectDevice(selectedDev);
    },
    [selectDevice],
  );

  // Handle confirm device selection - connect to selected device.
  // The provider will automatically continue the ensureDeviceReady flow after connect.
  // We do NOT call ensureDeviceReady here - that would create a nested flow.
  const handleConfirmDeviceSelection = useCallback(async () => {
    if (selectedDevice) {
      console.log(
        '[HardwareWalletBottomSheet] Connecting to device:',
        selectedDevice.id,
      );
      // Just connect - the provider will handle the rest via connectAndVerify
      await connect(selectedDevice.id);
      // The provider's ensureDeviceReady flow will automatically continue
      // and show success state when ready
    }
  }, [selectedDevice, connect]);

  // Handle rescan - use context action
  const handleRescan = useCallback(() => {
    rescan();
  }, [rescan]);

  // Handle cancel device selection
  const handleCancelDeviceSelection = useCallback(() => {
    closeDeviceSelection();
    onCancel?.();
  }, [closeDeviceSelection, onCancel]);

  // Get the device type for content components
  const deviceType = walletType ?? HardwareWalletType.Ledger;

  // Render content based on state
  const renderContent = () => {
    switch (connectionState.status) {
      case ConnectionStatus.Success:
        return (
          <SuccessContent
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
        // Show connecting content for both states - just informational, no button
        // User can swipe down to cancel
        return <ConnectingContent deviceType={deviceType} />;

      case ConnectionStatus.AwaitingApp:
        return (
          <AwaitingAppContent
            deviceType={deviceType}
            requiredApp={
              connectionState.status === 'awaiting_app'
                ? connectionState.requiredApp
                : undefined
            }
            onContinue={handleErrorContinue}
          />
        );

      case ConnectionStatus.AwaitingConfirmation:
        return (
          <AwaitingConfirmationContent
            deviceType={deviceType}
            operationType={
              connectionState.status === 'awaiting_confirmation'
                ? connectionState.operationType
                : undefined
            }
            onCancel={handleAwaitingConfirmationCancel}
          />
        );

      case ConnectionStatus.ErrorState:
        return (
          <ErrorContent
            error={
              connectionState.status === 'error' ? connectionState.error : null
            }
            deviceType={deviceType}
            onContinue={handleErrorContinue}
            onDismiss={handleErrorDismiss}
          />
        );

      default:
        return null;
    }
  };

  // Don't render if sheet shouldn't show
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

export default HardwareWalletBottomSheet;
