import { QrScanRequestType } from '@metamask/eth-qr-keyring';
import {
  Category,
  ErrorCode,
  HardwareWalletError,
  HardwareWalletType,
  Severity,
} from '@metamask/hw-wallet-sdk';

import { RecoveryAction } from './types';
import {
  createQRHardwareScanError,
  getQRHardwareScanErrorTitle,
  isQRHardwareScanError,
  QRHardwareScanErrorType,
} from './qrScan';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

const createScanError = (
  overrides: Partial<Parameters<typeof createQRHardwareScanError>[0]> = {},
) =>
  createQRHardwareScanError({
    errorType: QRHardwareScanErrorType.NonURQrScanned,
    purpose: QrScanRequestType.PAIR,
    isUrFormat: false,
    ...overrides,
  });

describe('createQRHardwareScanError', () => {
  it('creates retryable hardware wallet errors with QR scan metadata', () => {
    const error = createScanError({
      receivedUrType: 'crypto-psbt',
    });

    expect(error).toBeInstanceOf(HardwareWalletError);
    expect(error.code).toBe(ErrorCode.Unknown);
    expect(error.severity).toBe(Severity.Warning);
    expect(error.category).toBe(Category.Unknown);
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.body',
    );
    expect(error.metadata).toStrictEqual({
      walletType: HardwareWalletType.Qr,
      recoveryAction: RecoveryAction.RETRY,
      qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
      qrScanPurpose: QrScanRequestType.PAIR,
      receivedUrType: 'crypto-psbt',
      isUrFormat: false,
    });
  });

  it('uses signing copy for non-UR QR codes during signing', () => {
    const error = createScanError({
      purpose: QrScanRequestType.SIGN,
    });

    expect(error.message).toBe('Scanned QR code is not in UR format');
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.sign.body',
    );
  });

  it('uses pairing copy and default technical message for wrong UR type in pairing flow', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.WrongURType,
      purpose: QrScanRequestType.PAIR,
      receivedUrType: 'eth-sign-request',
      isUrFormat: true,
    });

    expect(error.message).toBe(
      'Received UR type is not valid for pairing flow',
    );
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.wrong_ur_type.pair.body',
    );
  });

  it('uses signing copy and default technical message for wrong UR type in signing flow', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.WrongURType,
      purpose: QrScanRequestType.SIGN,
      receivedUrType: 'crypto-hdkey',
      isUrFormat: true,
    });

    expect(error.message).toBe(
      'Received UR type is not valid for signing flow',
    );
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.wrong_ur_type.sign.body',
    );
  });

  it('uses decode error copy for UR decode failures', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.URDecodeError,
      technicalMessage: 'Decoder rejected fragment',
      isUrFormat: true,
    });

    expect(error.message).toBe('Decoder rejected fragment');
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.ur_decode_error.body',
    );
  });

  it('uses decode error copy and default technical message for scan exceptions', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.ScanException,
      isUrFormat: true,
    });

    expect(error.message).toBe('Unexpected QR scanning exception');
    expect(error.userMessage).toBe(
      'hardware_wallet.qr_scan_errors.ur_decode_error.body',
    );
  });
});

describe('isQRHardwareScanError', () => {
  it('returns true for hardware wallet errors with QR scan metadata', () => {
    const error = createScanError();

    const result = isQRHardwareScanError(error);

    expect(result).toBe(true);
  });

  it('returns false for non-hardware-wallet errors', () => {
    const error = new Error('Scan failed');

    const result = isQRHardwareScanError(error);

    expect(result).toBe(false);
  });

  it('returns false for hardware wallet errors without QR metadata', () => {
    const error = new HardwareWalletError('Device disconnected', {
      code: ErrorCode.DeviceDisconnected,
      severity: Severity.Err,
      category: Category.Connection,
      userMessage: 'Device disconnected',
    });

    const result = isQRHardwareScanError(error);

    expect(result).toBe(false);
  });

  it('returns false for hardware wallet errors with a non-QR wallet type', () => {
    const error = new HardwareWalletError('Scan failed', {
      code: ErrorCode.Unknown,
      severity: Severity.Warning,
      category: Category.Unknown,
      userMessage: 'Scan failed',
      metadata: {
        walletType: HardwareWalletType.Ledger,
        qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
        qrScanPurpose: QrScanRequestType.PAIR,
      },
    });

    const result = isQRHardwareScanError(error);

    expect(result).toBe(false);
  });
});

describe('getQRHardwareScanErrorTitle', () => {
  it('returns pairing title for non-UR QR scan errors', () => {
    const error = createScanError();

    const title = getQRHardwareScanErrorTitle(error);

    expect(title).toBe(
      'hardware_wallet.qr_scan_errors.non_ur_qr_scanned.pair.title',
    );
  });

  it('returns signing title for wrong UR type errors', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.WrongURType,
      purpose: QrScanRequestType.SIGN,
      isUrFormat: true,
    });

    const title = getQRHardwareScanErrorTitle(error);

    expect(title).toBe(
      'hardware_wallet.qr_scan_errors.wrong_ur_type.sign.title',
    );
  });

  it('returns decode error title for scan exception errors', () => {
    const error = createScanError({
      errorType: QRHardwareScanErrorType.ScanException,
      isUrFormat: true,
    });

    const title = getQRHardwareScanErrorTitle(error);

    expect(title).toBe('hardware_wallet.qr_scan_errors.ur_decode_error.title');
  });
});
