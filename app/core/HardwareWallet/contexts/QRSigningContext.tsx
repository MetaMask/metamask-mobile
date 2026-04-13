import { createContext, useContext } from 'react';
import { QrScanRequest } from '@metamask/eth-qr-keyring';

export interface QRSigningContextValue {
  /** The pending QR scan request from the keyring, if any. */
  pendingScanRequest?: QrScanRequest;
  /** Whether the pending request is a SIGN-type QR object. */
  isSigningQRObject: boolean;
  /** Mark the current QR scan request as completed (suppresses cancel-on-navigate). */
  setRequestCompleted: () => void;
  /** Whether the request has been completed. */
  isRequestCompleted: boolean;
  /** Reject the pending QR scan request if one exists. */
  cancelQRScanRequestIfPresent: () => Promise<void>;
}

const QRSigningContext = createContext<QRSigningContextValue | undefined>(
  undefined,
);

QRSigningContext.displayName = 'QRSigningContext';

export const useQRSigning = (): QRSigningContextValue => {
  const context = useContext(QRSigningContext);
  if (context === undefined) {
    throw new Error(
      'useQRSigning must be used within a HardwareWalletProvider',
    );
  }
  return context;
};

export default QRSigningContext;
