import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import {
  type HardwareWalletErrorOptions,
  HardwareWalletType,
} from '@metamask/hw-wallet-sdk';
import { RecoveryAction } from './types';

export enum QRHardwareScanErrorType {
  NonURQrScanned = 'non_ur_qr_scanned',
  WrongURType = 'wrong_ur_type',
  URDecodeError = 'ur_decode_error',
  ScanException = 'scan_exception',
}

export interface QRHardwareScanErrorMetadata extends Record<string, unknown> {
  walletType: HardwareWalletType.Qr;
  recoveryAction: RecoveryAction.RETRY;
  qrHardwareScanErrorType: QRHardwareScanErrorType;
  qrScanPurpose: QrScanRequestType;
  receivedUrType?: string;
  isUrFormat: boolean;
}

export type QRHardwareScanErrorOptions = Omit<
  HardwareWalletErrorOptions,
  'metadata'
> & {
  metadata: QRHardwareScanErrorMetadata;
};
