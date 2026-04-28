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

export interface QRHardwareScanErrorMetadata {
  walletType: HardwareWalletType.Qr;
  recoveryAction: RecoveryAction.RETRY;
  qrHardwareScanErrorType: QRHardwareScanErrorType;
  qrScanPurpose: QrScanRequestType;
  receivedUrType?: string;
  isUrFormat: boolean;
}

export type QRHardwareScanError = HardwareWalletError & {
  metadata: QRHardwareScanErrorMetadata;
};

function isQRHardwareScanErrorMetadata(
  metadata: unknown,
): metadata is QRHardwareScanErrorMetadata {
  if (!metadata || typeof metadata !== 'object') {
    return false;
  }

  const data = metadata as Record<string, unknown>;

  const hasValidReceivedUrType =
    !('receivedUrType' in data) ||
    data.receivedUrType === undefined ||
    typeof data.receivedUrType === 'string';

  const qrScanErrorTypes = Object.values(QRHardwareScanErrorType) as string[];
  const qrScanRequestTypes = Object.values(QrScanRequestType) as string[];

  return (
    data.walletType === HardwareWalletType.Qr &&
    data.recoveryAction === RecoveryAction.RETRY &&
    typeof data.qrHardwareScanErrorType === 'string' &&
    qrScanErrorTypes.includes(data.qrHardwareScanErrorType) &&
    typeof data.qrScanPurpose === 'string' &&
    qrScanRequestTypes.includes(data.qrScanPurpose) &&
    typeof data.isUrFormat === 'boolean' &&
    hasValidReceivedUrType
  );
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
}: CreateQRHardwareScanErrorParams): QRHardwareScanError {
  const copyKeyPrefix = getErrorCopyKeyPrefix(errorType, purpose);
  const metadata = {
    walletType: HardwareWalletType.Qr,
    recoveryAction: RecoveryAction.RETRY,
    qrHardwareScanErrorType: errorType,
    qrScanPurpose: purpose,
    receivedUrType,
    isUrFormat,
  } satisfies QRHardwareScanErrorMetadata;

  const error = new HardwareWalletError(
    technicalMessage ?? getDefaultTechnicalMessage({ errorType, purpose }),
    {
      code: ErrorCode.Unknown,
      severity: Severity.Warning,
      category: Category.Unknown,
      userMessage: strings(`${copyKeyPrefix}.body`),
      metadata,
    },
  );

  return Object.assign(error, { metadata });
}

export function isQRHardwareScanError(
  error: unknown,
): error is QRHardwareScanError {
  if (!HardwareWalletError.isHardwareWalletError(error)) {
    return false;
  }

  return isQRHardwareScanErrorMetadata(error.metadata);
}

export function getQRHardwareScanErrorTitle(
  error: QRHardwareScanError,
): string {
  const copyKeyPrefix = getErrorCopyKeyPrefix(
    error.metadata.qrHardwareScanErrorType,
    error.metadata.qrScanPurpose,
  );

  return strings(`${copyKeyPrefix}.title`);
}
