import { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useHardwareWallet } from '../../../../core/HardwareWallet';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { updateHardwareWalletsSwaps } from '../../../../core/redux/slices/bridge';
import {
  HardwareWalletsSwapsStatus,
  HardwareWalletsSwapsEventType,
} from './HardwareWalletsSwaps.state';

interface UseHwQrStateOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
}

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

  const [isReadingQrSignature, setIsReadingQrSignature] = useState(false);

  const wasActiveRef = useRef(false);
  const hasCancelledForTerminalRef = useRef(false);

  useEffect(() => {
    setIsReadingQrSignature(false);
  }, [pendingScanRequest]);

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
