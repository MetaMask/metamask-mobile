import { useCallback, useRef } from 'react';
import type { HardwareWalletError } from '@metamask/hw-wallet-sdk';

import { useHardwareWallet } from '../contexts';

interface UseQrScanErrorForwardingOptions {
  hideScanner: () => void;
}

export function useQrScanErrorForwarding({
  hideScanner,
}: UseQrScanErrorForwardingOptions) {
  const { showHardwareWalletError } = useHardwareWallet();
  const pendingQrScanErrorRef = useRef<HardwareWalletError | null>(null);

  const onQRHardwareScanError = useCallback(
    (error: HardwareWalletError) => {
      pendingQrScanErrorRef.current = error;
      hideScanner();
    },
    [hideScanner],
  );

  const handleScannerModalHide = useCallback(() => {
    const pendingError = pendingQrScanErrorRef.current;
    if (!pendingError) {
      return;
    }

    pendingQrScanErrorRef.current = null;
    showHardwareWalletError(pendingError);
  }, [showHardwareWalletError]);

  return {
    onQRHardwareScanError,
    handleScannerModalHide,
  };
}
