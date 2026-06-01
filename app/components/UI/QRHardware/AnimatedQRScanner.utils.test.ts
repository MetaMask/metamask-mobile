import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import { isSameScanError } from './AnimatedQRScanner.utils';

function makeScanError(
  overrides: {
    message?: string;
    qrHardwareScanErrorType?: QRHardwareScanErrorType;
    isUrFormat?: boolean;
    receivedUrType?: string;
  } = {},
): QRHardwareScanError {
  return {
    message: overrides.message ?? 'Error',
    metadata: {
      qrHardwareScanErrorType:
        overrides.qrHardwareScanErrorType ??
        QRHardwareScanErrorType.NonURQrScanned,
      isUrFormat: overrides.isUrFormat ?? false,
      receivedUrType: overrides.receivedUrType,
    },
  } as unknown as QRHardwareScanError;
}

describe('isSameScanError', () => {
  it('returns false when there is no previous scan error', () => {
    expect(isSameScanError(null, makeScanError())).toBe(false);
  });

  it('returns true when all metadata fields match', () => {
    const shared = {
      message: 'Expected crypto-hdkey QR code',
      qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
      isUrFormat: true,
      receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
    };

    expect(isSameScanError(makeScanError(shared), makeScanError(shared))).toBe(
      true,
    );
  });

  it('returns true when both receivedUrType are undefined', () => {
    const shared = {
      message: 'Scanned QR code is not in UR format',
      qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
      isUrFormat: false,
    };

    expect(isSameScanError(makeScanError(shared), makeScanError(shared))).toBe(
      true,
    );
  });

  it.each([
    [
      'receivedUrType',
      { receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE },
      { receivedUrType: SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT },
    ],
    ['message', { message: 'Error A' }, { message: 'Error B' }],
    ['isUrFormat', { isUrFormat: true }, { isUrFormat: false }],
    [
      'qrHardwareScanErrorType',
      { qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned },
      { qrHardwareScanErrorType: QRHardwareScanErrorType.URDecodeError },
    ],
  ] as const)(
    'returns false when %s differs',
    (_field, prevOverrides, currOverrides) => {
      const base = {
        message: 'Error',
        isUrFormat: false,
        qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
      } as const;
      expect(
        isSameScanError(
          makeScanError({ ...base, ...prevOverrides }),
          makeScanError({ ...base, ...currOverrides }),
        ),
      ).toBe(false);
    },
  );
});
