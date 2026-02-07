import { useEffect, useRef, useCallback } from 'react';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  useHardwareWalletActions,
  isUserCancellation,
} from '../../../core/HardwareWallet';

export interface LedgerConfirmationModalProps {
  onConfirmation: () => Promise<void>;
  onRejection: () => void;
  deviceId: string;
  /** The type of operation - affects the "Awaiting confirmation" UI text */
  operationType?: 'transaction' | 'message';
}

const LedgerConfirmationModal = ({
  onConfirmation,
  onRejection,
  deviceId,
  operationType = 'transaction',
}: LedgerConfirmationModalProps) => {
  const { trackEvent, createEventBuilder } = useMetrics();
  const hasStartedRef = useRef(false);

  const {
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWalletActions();

  // Track rejection for analytics
  const handleRejection = useCallback(
    (error?: unknown) => {
      // Track analytics for non-user-initiated rejections
      if (error && !isUserCancellation(error)) {
        trackEvent(
          createEventBuilder(MetaMetricsEvents.HARDWARE_WALLET_ERROR)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
              error: error instanceof Error ? error.message : String(error),
            })
            .build(),
        );
      } else if (!error) {
        // User manually rejected (e.g., pressed reject on device)
        trackEvent(
          createEventBuilder(MetaMetricsEvents.DAPP_TRANSACTION_CANCELLED)
            .addProperties({
              device_type: HardwareDeviceTypes.LEDGER,
            })
            .build(),
        );
      }

      onRejection();
    },
    [onRejection, trackEvent, createEventBuilder],
  );

  // Main flow - runs once on mount
  useEffect(() => {
    // Prevent double execution
    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    const runSigningFlow = async () => {
      try {
        const isReady = await ensureDeviceReady(deviceId);

        if (!isReady) {
          // User cancelled during connection or device not available
          handleRejection();
          return;
        }

        showAwaitingConfirmation(operationType, () => {
          handleRejection();
        });

        try {
          await onConfirmation();

          hideAwaitingConfirmation();
        } catch (signingError) {
          hideAwaitingConfirmation();

          // Don't show error UI for user cancellation on device
          if (!isUserCancellation(signingError)) {
            showHardwareWalletError(signingError);
          }

          handleRejection(signingError);
        }
      } catch (connectionError) {
        if (!isUserCancellation(connectionError)) {
          showHardwareWalletError(connectionError);
        }
        handleRejection(connectionError);
      }
    };

    runSigningFlow();
  }, [
    deviceId,
    operationType,
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
    onConfirmation,
    handleRejection,
  ]);

  // This component renders nothing - all UI is handled by HardwareWalletBottomSheet
  return null;
};

export default LedgerConfirmationModal;
