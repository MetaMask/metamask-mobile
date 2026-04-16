import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import { strings } from '../../../../locales/i18n';
import {
  Category,
  ErrorCode,
  HardwareWalletError,
  HardwareWalletType,
  Severity,
} from '@metamask/hw-wallet-sdk';
import { RecoveryAction } from './types';

export enum QRHardwareScanErrorType {
  NonURQrScanned = 'non_ur_qr_scanned',
  WrongURType = 'wrong_ur_type',
  URDecodeError = 'ur_decode_error',
  ScanException = 'scan_exception',
}

interface QRHardwareScanErrorMetadata {
  walletType: HardwareWalletType.Qr;
  recoveryAction: RecoveryAction.RETRY;
  qrHardwareScanErrorType: QRHardwareScanErrorType;
  qrScanPurpose: QrScanRequestType;
  receivedUrType?: string;
  isUrFormat: boolean;
}

interface CreateQRHardwareScanErrorParams {
  errorType: QRHardwareScanErrorType;
  purpose: QrScanRequestType;
  technicalMessage?: string;
  receivedUrType?: string;
  isUrFormat: boolean;
}

const getPurposeKey = (purpose: QrScanRequestType) =>
  purpose === QrScanRequestType.PAIR ? 'pair' : 'sign';

const getErrorCopyKeyPrefix = (
  errorType: QRHardwareScanErrorType,
  purpose: QrScanRequestType,
) => {
  switch (errorType) {
    case QRHardwareScanErrorType.NonURQrScanned:
      return `hardware_wallet.qr_scan_errors.non_ur_qr_scanned.${getPurposeKey(
        purpose,
      )}`;
    case QRHardwareScanErrorType.WrongURType:
      return `hardware_wallet.qr_scan_errors.wrong_ur_type.${getPurposeKey(
        purpose,
      )}`;
    case QRHardwareScanErrorType.URDecodeError:
    case QRHardwareScanErrorType.ScanException:
      return 'hardware_wallet.qr_scan_errors.ur_decode_error';
    default:
      return 'hardware_wallet.qr_scan_errors.ur_decode_error';
  }
};

const getDefaultTechnicalMessage = ({
  errorType,
  purpose,
}: Pick<CreateQRHardwareScanErrorParams, 'errorType' | 'purpose'>) => {
  switch (errorType) {
    case QRHardwareScanErrorType.NonURQrScanned:
      return 'Scanned QR code is not in UR format';
    case QRHardwareScanErrorType.WrongURType:
      return purpose === QrScanRequestType.PAIR
        ? 'Received UR type is not valid for pairing flow'
        : 'Received UR type is not valid for signing flow';
    case QRHardwareScanErrorType.URDecodeError:
      return 'Failed to decode UR QR code';
    case QRHardwareScanErrorType.ScanException:
      return 'Unexpected QR scanning exception';
    default:
      return 'Unexpected QR scanning exception';
  }
};

export function createQRHardwareScanError({
  errorType,
  purpose,
  technicalMessage,
  receivedUrType,
  isUrFormat,
}: CreateQRHardwareScanErrorParams): HardwareWalletError {
  const copyKeyPrefix = getErrorCopyKeyPrefix(errorType, purpose);

  return new HardwareWalletError(
    technicalMessage ?? getDefaultTechnicalMessage({ errorType, purpose }),
    {
      code: ErrorCode.Unknown,
      severity: Severity.Warning,
      category: Category.Unknown,
      userMessage: strings(`${copyKeyPrefix}.body`),
      metadata: {
        walletType: HardwareWalletType.Qr,
        recoveryAction: RecoveryAction.RETRY,
        qrHardwareScanErrorType: errorType,
        qrScanPurpose: purpose,
        receivedUrType,
        isUrFormat,
      } satisfies QRHardwareScanErrorMetadata,
    },
  );
}

export function isQRHardwareScanError(
  error: unknown,
): error is HardwareWalletError & { metadata: QRHardwareScanErrorMetadata } {
  if (!HardwareWalletError.isHardwareWalletError(error)) {
    return false;
  }

  const metadata = error.metadata as
    | Partial<QRHardwareScanErrorMetadata>
    | undefined;
  return Boolean(
    metadata?.walletType === HardwareWalletType.Qr &&
      metadata?.qrHardwareScanErrorType &&
      metadata?.qrScanPurpose,
  );
}

export function getQRHardwareScanErrorTitle(
  error: HardwareWalletError,
): string {
  const metadata = error.metadata as unknown as QRHardwareScanErrorMetadata;
  const copyKeyPrefix = getErrorCopyKeyPrefix(
    metadata.qrHardwareScanErrorType,
    metadata.qrScanPurpose,
  );

  return strings(`${copyKeyPrefix}.title`);
}
