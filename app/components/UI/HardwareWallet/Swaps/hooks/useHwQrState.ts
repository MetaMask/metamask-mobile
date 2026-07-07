import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHardwareWallet } from '../../../../../core/HardwareWallet';
import { getHardwareWalletTypeForAddress } from '../../../../../core/HardwareWallet/helpers';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { updateHardwareWalletsSwaps } from '../../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from '../HardwareWalletsSwaps.state';

/**
 * Options for {@link useHwQrState}.
 *
 * @property isEnabled - Whether hardware wallet swaps are enabled for the current flow.
 * @property currentStatus - The current status of the hardware wallet swap flow.
 */
interface UseHwQrStateOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
  /**
   * Address of the hardware wallet. Used to derive wallet type when the
   * provider's walletType is not yet determined (or has been transiently
   * cleared via setPendingOperationAddress during the submit lifecycle).
   */
  walletAddress?: string;
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

/**
 * Hook that manages QR hardware wallet state during a swap flow.
 *
 * Responsibilities:
 * - Detects whether the connected wallet is a QR-based hardware wallet.
 * - Determines when to show the inline QR signing UI.
 * - Auto-cancels pending QR scan requests when the swap transitions to a
 * terminal state `Failed`, `Rejected`, `Cancelled`, `Disconnected`.
 * - Provides a cancel handler that rejects the scan and updates the swap state.
 *
 * @param options - See {@link UseHwQrStateOptions}.
 * @returns QR-related state and callbacks for the swap UI.
 */
export function useHwQrState({
  isEnabled,
  currentStatus,
  walletAddress,
}: UseHwQrStateOptions) {
  const dispatch = useDispatch();
  const { walletType, qr } = useHardwareWallet();

  const isQrHardwareWallet =
    walletType === HardwareWalletType.Qr ||
    (Boolean(walletAddress) &&
      getHardwareWalletTypeForAddress(walletAddress as string) ===
        HardwareWalletType.Qr);
  const { pendingScanRequest, cancelQRScanRequestIfPresent } = qr;

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

  /**
   * Auto-cancel pending QR scan when transitioning from an active state
   * to a terminal state (Failed, Rejected, Cancelled, Disconnected).
   * This handles the case where the swap fails instantly (e.g., STX not
   * supported) but a QR scan request was already created by the keyring.
   */
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
      cancelQRScanRequestIfPresent();
    }
  }, [
    currentStatus,
    isEnabled,
    isQrHardwareWallet,
    cancelQRScanRequestIfPresent,
  ]);

  const showInlineQrSigning = useMemo(
    () =>
      isEnabled &&
      isQrHardwareWallet &&
      Boolean(pendingScanRequest) &&
      currentStatus === HardwareWalletsSwapsStatus.Waiting,
    [isEnabled, isQrHardwareWallet, pendingScanRequest, currentStatus],
  );

  const handleQrSignatureCancel = useCallback(() => {
    cancelQRScanRequestIfPresent();
    dispatch(
      updateHardwareWalletsSwaps({
        type: HardwareWalletsSwapsEventType.Rejected,
      }),
    );
  }, [cancelQRScanRequestIfPresent, dispatch]);

  return {
    isReadingQrSignature,
    setIsReadingQrSignature,
    isQrHardwareWallet,
    showInlineQrSigning,
    handleQrSignatureCancel,
    pendingScanRequest,
  };
}
