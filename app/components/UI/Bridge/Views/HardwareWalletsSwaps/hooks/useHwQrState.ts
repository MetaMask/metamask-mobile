import { useCallback, useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useHardwareWallet } from '../../../../../../core/HardwareWallet';
import { HardwareWalletType } from '@metamask/hw-wallet-sdk';
import { updateHardwareWalletsSwaps } from '../../../../../../core/redux/slices/bridge';
import { HardwareWalletsSwapsStatus, HardwareWalletsSwapsEventType } from '../HardwareWalletsSwaps.state';

interface UseHwQrStateOptions {
  isEnabled: boolean;
  currentStatus: HardwareWalletsSwapsStatus;
}

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

  useEffect(() => {
    setIsReadingQrSignature(false);
  }, [pendingScanRequest]);

  const showInlineQrSigning = useMemo(
    () => {
      const result = isEnabled &&
        isQrHardwareWallet &&
        Boolean(pendingScanRequest) &&
        currentStatus === HardwareWalletsSwapsStatus.Waiting;
      if (result) {
        console.log('[HW-QrState] showInlineQrSigning=true', { isQrHardwareWallet, hasPendingScan: Boolean(pendingScanRequest), currentStatus });
      }
      return result;
    },
    [isEnabled, isQrHardwareWallet, pendingScanRequest, currentStatus],
  );

  const handleQrSignatureCancel = useCallback(() => {
    console.log('[HW-QrState] QR signature cancelled — dispatching REJECTED');
    qr.cancelQRScanRequestIfPresent();
    dispatch(updateHardwareWalletsSwaps({ type: HardwareWalletsSwapsEventType.Rejected }));
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
