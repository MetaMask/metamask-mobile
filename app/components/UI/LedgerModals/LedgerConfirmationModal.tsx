import { useEffect, useRef, useCallback } from 'react';
import { MetaMetricsEvents } from '../../../core/Analytics';
import { useMetrics } from '../../../components/hooks/useMetrics';
import { HardwareDeviceTypes } from '../../../constants/keyringTypes';
import {
  useHardwareWallet,
  isUserCancellation,
} from '../../../core/HardwareWallet';

export interface LedgerConfirmationModalProps {
  onConfirmation: () => Promise<void>;
  onRejection: () => void | Promise<void>;
  deviceId: string;
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
  const hasRejectedRef = useRef(false);

  const {
    ensureDeviceReady,
    showAwaitingConfirmation,
    hideAwaitingConfirmation,
    showHardwareWalletError,
  } = useHardwareWallet();

  // Track rejection for analytics
  const handleRejection = useCallback(
    async (error?: unknown) => {
      if (hasRejectedRef.current) return;
      hasRejectedRef.current = true;

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

      await onRejection();
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
          await handleRejection();
          return;
        }

        showAwaitingConfirmation(operationType, () => {
          // eslint-disable-next-line no-empty-function
          handleRejection().catch(() => {});
        });

        try {
          await onConfirmation();

          hideAwaitingConfirmation();
          if (hasRejectedRef.current) return;
        } catch (signingError) {
          hideAwaitingConfirmation();

          if (!hasRejectedRef.current && !isUserCancellation(signingError)) {
            showHardwareWalletError(signingError);
          }

          await handleRejection(signingError);
        }
      } catch (connectionError) {
        await handleRejection(connectionError);
      }
    };

    // eslint-disable-next-line no-empty-function
    runSigningFlow().catch(() => {});
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
