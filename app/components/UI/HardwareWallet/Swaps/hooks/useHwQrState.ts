import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHardwareWallet } from '../../../../../core/HardwareWallet';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { updateHardwareWalletsSwaps } from '../../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from '../HardwareWalletsSwaps.state';

interface UseHwQrStateOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
}

/**
 * Terminal states that indicate the swap flow has ended.
 * When transitioning to any of these from an active state,
 * any pending QR scan request should be cancelled.
 */
const TERMINAL_STATUSES: Set<HardwareWalletsSwapsStatus> = new Set([
  HardwareWalletsSwapsStatus.Failed,
  HardwareWalletsSwapsStatus.Rejected,
  HardwareWalletsSwapsStatus.Cancelled,
  HardwareWalletsSwapsStatus.Disconnected,
]);

export function useHwQrState({
  isEnabled,
  currentStatus,
}: UseHwQrStateOptions) {
  const dispatch = useDispatch();
  const { walletType, qr } = useHardwareWallet();

  const isQrHardwareWallet = walletType === HardwareWalletType.Qr;
  const pendingScanRequest = qr.pendingScanRequest;
  const isSigningQRObject = qr.isSigningQRObject;

  const [isReadingQrSignature, setIsReadingQrSignature] = useState(false);

  // Track whether we were previously in an active (Waiting) state so
  // we only cancel on a genuine transition, not on initial render.
  const wasActiveRef = useRef(false);
  // Track whether we already cancelled for the current terminal transition
  // to prevent duplicate cancellations.
  const hasCancelledForTerminalRef = useRef(false);

  useEffect(() => {
    setIsReadingQrSignature(false);
  }, [pendingScanRequest]);

  // Auto-cancel pending QR scan when transitioning from an active state
  // to a terminal state (Failed, Rejected, Cancelled, Disconnected).
  // This handles the case where the swap fails instantly (e.g., STX not
  // supported) but a QR scan request was already created by the keyring.
  useEffect(() => {
    const isActive =
      currentStatus === HardwareWalletsSwapsStatus.Waiting ||
      currentStatus === HardwareWalletsSwapsStatus.Submitted;
    const isTerminal = TERMINAL_STATUSES.has(currentStatus);

    if (isActive) {
      wasActiveRef.current = true;
      hasCancelledForTerminalRef.current = false;
    }

    if (
      isTerminal &&
      wasActiveRef.current &&
      !hasCancelledForTerminalRef.current &&
      isEnabled &&
      isQrHardwareWallet
    ) {
      hasCancelledForTerminalRef.current = true;
      qr.cancelQRScanRequestIfPresent();
    }
  }, [currentStatus, isEnabled, isQrHardwareWallet, qr]);

  const showInlineQrSigning = useMemo(
    () =>
      isEnabled &&
      isQrHardwareWallet &&
      Boolean(pendingScanRequest) &&
      currentStatus === HardwareWalletsSwapsStatus.Waiting,
    [isEnabled, isQrHardwareWallet, pendingScanRequest, currentStatus],
  );

  const handleQrSignatureCancel = useCallback(() => {
    qr.cancelQRScanRequestIfPresent();
    dispatch(
      updateHardwareWalletsSwaps({
        type: HardwareWalletsSwapsEventType.Rejected,
      }),
    );
  }, [qr, dispatch]);

  return {
    isReadingQrSignature,
    setIsReadingQrSignature,
    isQrHardwareWallet,
    showInlineQrSigning,
    handleQrSignatureCancel,
    pendingScanRequest,
  };
}
