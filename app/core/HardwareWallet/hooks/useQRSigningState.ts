import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { QrScanRequestType } from '@metamask/eth-qr-keyring';

import Engine from '../../Engine';
import type { RootState } from '../../../reducers';
import type { QRSigningContextValue } from '../contexts/QRSigningContext';

/**
 * Manages all QR signing state for the HardwareWalletProvider.
 *
 * Scanner visibility is intentionally NOT part of this context — the
 * awaiting-confirmation bottom-sheet content manages its own internal phase
 * (QR display vs. camera) as local component state.
 */
export const useQRSigningState = (): QRSigningContextValue => {
  const qrState = useSelector((state: RootState) => state.qrKeyringScanner);
  const pendingScanRequest = qrState?.pendingScanRequest;

  const isSigningQRObject = pendingScanRequest?.type === QrScanRequestType.SIGN;

  // This provider outlives individual QR signing requests, so completion state
  // must be cleared whenever Redux surfaces a new pending request.
  const [isRequestCompleted, setIsRequestCompleted] = useState(false);

  useEffect(() => {
    // `isRequestCompleted` suppresses cancel-on-navigate for the active request
    // only; reset it when a fresh request becomes pending.
    if (pendingScanRequest) {
      setIsRequestCompleted(false);
    }
  }, [pendingScanRequest]);

  const cancelQRScanRequestIfPresent = useCallback(async () => {
    if (!isSigningQRObject) {
      return;
    }
    Engine.getQrKeyringScanner().rejectPendingScan(
      new Error('Request cancelled'),
    );
    setIsRequestCompleted(true);
  }, [isSigningQRObject]);

  const setRequestCompleted = useCallback(() => {
    setIsRequestCompleted(true);
  }, []);

  return useMemo(
    () => ({
      pendingScanRequest,
      isSigningQRObject,
      setRequestCompleted,
      isRequestCompleted,
      cancelQRScanRequestIfPresent,
    }),
    [
      pendingScanRequest,
      isSigningQRObject,
      isRequestCompleted,
      setRequestCompleted,
      cancelQRScanRequestIfPresent,
    ],
  );
};
