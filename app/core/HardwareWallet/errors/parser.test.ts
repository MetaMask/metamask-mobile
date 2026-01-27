import {
  ErrorCode,
  HardwareWalletError,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';
import { parseErrorByType } from './parser';
import { HardwareWalletType } from '../helpers';
import {
  LedgerCommunicationErrors,
  BluetoothPermissionErrors,
} from '../../Ledger/ledgerErrors';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('parseErrorByType', () => {
  const walletType = HardwareWalletType.Ledger;

  describe('when error is already a HardwareWalletError', () => {
    it('returns the error unchanged', () => {
      const existingError = new HardwareWalletError('Test error', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });

      const result = parseErrorByType(existingError, walletType);

      expect(result).toBe(existingError);
    });
  });

  describe('when error has explicit ErrorCode', () => {
    it('parses object with code property', () => {
      const error = {
        code: ErrorCode.BluetoothDisabled,
        message: 'Bluetooth is off',
      };

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.BluetoothDisabled);
      expect(result).toBeInstanceOf(HardwareWalletError);
    });
  });

  describe('when error is LedgerCommunicationErrors enum', () => {
    it('parses LedgerDisconnected', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.LedgerDisconnected,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.DeviceDisconnected);
    });

    it('parses LedgerHasPendingConfirmation', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.LedgerHasPendingConfirmation,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.UserConfirmationRequired);
    });

    it('parses FailedToOpenApp', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.FailedToOpenApp,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.DeviceStateEthAppClosed);
    });

    it('parses UserRefusedConfirmation', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.UserRefusedConfirmation,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.UserRejected);
    });

    it('parses LedgerIsLocked', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.LedgerIsLocked,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.AuthenticationDeviceLocked);
    });

    it('parses BlindSignError', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.BlindSignError,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.DeviceStateBlindSignNotSupported);
    });

    it('parses DeviceUnresponsive', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.DeviceUnresponsive,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.DeviceUnresponsive);
    });

    it('parses UnknownError', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.UnknownError,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.Unknown);
    });
  });

  describe('when error is BluetoothPermissionErrors enum', () => {
    it('parses BluetoothAccessBlocked', () => {
      const result = parseErrorByType(
        BluetoothPermissionErrors.BluetoothAccessBlocked,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.PermissionBluetoothDenied);
    });

    it('parses LocationAccessBlocked', () => {
      const result = parseErrorByType(
        BluetoothPermissionErrors.LocationAccessBlocked,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.PermissionLocationDenied);
    });

    it('parses NearbyDevicesAccessBlocked', () => {
      const result = parseErrorByType(
        BluetoothPermissionErrors.NearbyDevicesAccessBlocked,
        walletType,
      );

      expect(result.code).toBe(ErrorCode.PermissionNearbyDevicesDenied);
    });
  });

  describe('when error is object with code property as string', () => {
    it('parses object with LedgerCommunicationErrors code', () => {
      const error = { code: LedgerCommunicationErrors.LedgerDisconnected };

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceDisconnected);
    });
  });

  describe('when error is an Error with a name', () => {
    it('parses DisconnectedDevice', () => {
      const error = new Error('Device disconnected');
      error.name = 'DisconnectedDevice';

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceDisconnected);
    });

    it('parses DisconnectedDeviceDuringOperation', () => {
      const error = new Error('Disconnected during operation');
      error.name = 'DisconnectedDeviceDuringOperation';

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceDisconnected);
    });

    it('parses LockedDeviceError', () => {
      const error = new Error('Device is locked');
      error.name = 'LockedDeviceError';

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.AuthenticationDeviceLocked);
    });

    it('parses TransportOpenUserCancelled', () => {
      const error = new Error('User cancelled');
      error.name = 'TransportOpenUserCancelled';

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.UserCancelled);
    });

    it('parses LedgerTimeoutError', () => {
      const error = new Error('Timeout');
      error.name = 'LedgerTimeoutError';

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceUnresponsive);
    });
  });

  describe('when error is TransportStatusError with status code', () => {
    it('parses known status code 0x6985 (user rejected)', () => {
      const error = new Error('User rejected');
      error.name = 'TransportStatusError';
      (error as Error & { statusCode: number }).statusCode = 0x6985;

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.UserRejected);
    });

    it('parses 0x6985 as blind signing when message indicates signing', () => {
      const error = new Error('Blind signing is disabled');
      error.name = 'TransportStatusError';
      (error as Error & { statusCode: number }).statusCode = 0x6985;

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceStateBlindSignNotSupported);
    });

    it('parses known status code 0x5515 (device locked)', () => {
      const error = new Error('Device locked');
      error.name = 'TransportStatusError';
      (error as Error & { statusCode: number }).statusCode = 0x5515;

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.AuthenticationDeviceLocked);
    });
  });

  describe('when error has status code in message', () => {
    it('extracts hex status code from message', () => {
      const error = new Error('Ledger error 0x6b0c');

      const result = parseErrorByType(error, walletType);

      // 0x6b0c is LOCKED in our ADDITIONAL_STATUS_CODE_MAPPINGS
      expect(result.code).toBe(ErrorCode.AuthenticationDeviceLocked);
    });
  });

  describe('when error message matches patterns', () => {
    it('parses "disconnected" message', () => {
      const error = new Error('The device was disconnected');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceDisconnected);
    });

    it('parses "locked" message', () => {
      const error = new Error('Please unlock your device');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.AuthenticationDeviceLocked);
    });

    it('parses "blind signing" message', () => {
      const error = new Error('Blind signing must be enabled');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceStateBlindSignNotSupported);
    });

    it('parses "app" with "open" message', () => {
      const error = new Error('Please open the app on your device');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.DeviceStateEthAppClosed);
    });

    it('parses "rejected" message', () => {
      const error = new Error('Transaction was rejected');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.UserRejected);
    });

    it('parses "timeout" message', () => {
      const error = new Error('Connection timed out');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.ConnectionTimeout);
    });

    it('parses "bluetooth" with "off" message', () => {
      const error = new Error('Bluetooth is off');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.BluetoothDisabled);
    });

    it('parses "bluetooth" with "scan" message', () => {
      const error = new Error('Bluetooth scan failed');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.BluetoothScanFailed);
    });

    it('parses generic "bluetooth" message as connection failed', () => {
      const error = new Error('Bluetooth error occurred');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.BluetoothConnectionFailed);
    });
  });

  describe('when error is a plain string', () => {
    it('returns unknown error with message', () => {
      const result = parseErrorByType('Some error string', walletType);

      expect(result.code).toBe(ErrorCode.Unknown);
      expect(result.message).toBe('Some error string');
    });
  });

  describe('when error is undefined or null', () => {
    it('returns unknown error for undefined', () => {
      const result = parseErrorByType(undefined, walletType);

      expect(result.code).toBe(ErrorCode.Unknown);
    });

    it('returns unknown error for null', () => {
      const result = parseErrorByType(null, walletType);

      expect(result.code).toBe(ErrorCode.Unknown);
    });
  });

  describe('when error is an unknown Error', () => {
    it('returns unknown error with original message', () => {
      const error = new Error('Something unexpected happened');

      const result = parseErrorByType(error, walletType);

      expect(result.code).toBe(ErrorCode.Unknown);
    });
  });

  describe('wallet type is included in error', () => {
    it('includes Ledger wallet type in metadata', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.LedgerDisconnected,
        HardwareWalletType.Ledger,
      );

      expect(result.metadata?.walletType).toBe(HardwareWalletType.Ledger);
    });

    it('includes QR wallet type in metadata', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.LedgerDisconnected,
        HardwareWalletType.QR,
      );

      expect(result.metadata?.walletType).toBe(HardwareWalletType.QR);
    });
  });

  describe('recoveryAction is included in error', () => {
    it('includes ACKNOWLEDGE action for user rejection', () => {
      const result = parseErrorByType(
        LedgerCommunicationErrors.UserRefusedConfirmation,
        walletType,
      );

      expect(result.metadata?.recoveryAction).toBe('acknowledge');
    });

    it('includes OPEN_BLUETOOTH_SETTINGS action for bluetooth disabled', () => {
      const result = parseErrorByType(
        BluetoothPermissionErrors.BluetoothAccessBlocked,
        walletType,
      );

      expect(result.metadata?.recoveryAction).toBe('open_app_settings');
    });
  });
});
