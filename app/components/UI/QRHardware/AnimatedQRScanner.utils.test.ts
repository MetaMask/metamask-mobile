import { SUPPORTED_UR_TYPE } from '../../../constants/qr';
import {
  type QRHardwareScanError,
  QRHardwareScanErrorType,
} from '../../../core/HardwareWallet/errors';
import { isSameScanError } from './AnimatedQRScanner.utils';

describe('isSameScanError', () => {
  it('returns false when there is no previous scan error', () => {
    const currentError = {
      message: undefined,
      metadata: {
        qrHardwareScanErrorType: QRHardwareScanErrorType.NonURQrScanned,
        isUrFormat: false,
        receivedUrType: undefined,
      },
    } as unknown as QRHardwareScanError;

    expect(isSameScanError(null, currentError)).toBe(false);
  });

  it('returns true when scan error metadata matches', () => {
    const previousError = {
      message: 'Expected crypto-hdkey QR code',
      metadata: {
        qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
        isUrFormat: true,
        receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
      },
    } as unknown as QRHardwareScanError;
    const currentError = {
      message: 'Expected crypto-hdkey QR code',
      metadata: {
        qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
        isUrFormat: true,
        receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
      },
    } as unknown as QRHardwareScanError;

    expect(isSameScanError(previousError, currentError)).toBe(true);
  });

  it('returns false when received UR types differ', () => {
    const previousError = {
      message: 'Expected crypto-hdkey QR code',
      metadata: {
        qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
        isUrFormat: true,
        receivedUrType: SUPPORTED_UR_TYPE.ETH_SIGNATURE,
      },
    } as unknown as QRHardwareScanError;
    const currentError = {
      message: 'Expected crypto-hdkey QR code',
      metadata: {
        qrHardwareScanErrorType: QRHardwareScanErrorType.WrongURType,
        isUrFormat: true,
        receivedUrType: SUPPORTED_UR_TYPE.CRYPTO_ACCOUNT,
      },
    } as unknown as QRHardwareScanError;

    expect(isSameScanError(previousError, currentError)).toBe(false);
  });
});
