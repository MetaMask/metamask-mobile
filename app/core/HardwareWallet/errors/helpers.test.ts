import {
  ErrorCode,
  HardwareWalletError,
  Severity,
  Category,
} from '@metamask/hw-wallet-sdk';
import {
  isHardwareWalletError,
  isUserCancellation,
  getIconForErrorCode,
  getIconColorForErrorCode,
  getTitleForErrorCode,
} from './helpers';
import { HardwareWalletType } from '../helpers';
import {
  IconName,
  IconColor,
} from '../../../component-library/components/Icons/Icon';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('error helpers', () => {
  describe('isHardwareWalletError', () => {
    it('returns true for HardwareWalletError instance', () => {
      const error = new HardwareWalletError('Test', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Test',
      });

      expect(isHardwareWalletError(error)).toBe(true);
    });

    it('returns false for regular Error', () => {
      const error = new Error('Regular error');

      expect(isHardwareWalletError(error)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isHardwareWalletError('error string')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isHardwareWalletError(null)).toBe(false);
    });

    it('returns false for undefined', () => {
      expect(isHardwareWalletError(undefined)).toBe(false);
    });

    it('returns false for object with similar shape', () => {
      const fakeError = {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Test',
      };

      expect(isHardwareWalletError(fakeError)).toBe(false);
    });
  });

  describe('isUserCancellation', () => {
    it('returns true for UserRejected error', () => {
      const error = new HardwareWalletError('User rejected', {
        code: ErrorCode.UserRejected,
        severity: Severity.Info,
        category: Category.UserAction,
        userMessage: 'User rejected',
      });

      expect(isUserCancellation(error)).toBe(true);
    });

    it('returns true for UserCancelled error', () => {
      const error = new HardwareWalletError('User cancelled', {
        code: ErrorCode.UserCancelled,
        severity: Severity.Info,
        category: Category.UserAction,
        userMessage: 'User cancelled',
      });

      expect(isUserCancellation(error)).toBe(true);
    });

    it('returns false for other HardwareWalletError codes', () => {
      const error = new HardwareWalletError('Device disconnected', {
        code: ErrorCode.DeviceDisconnected,
        severity: Severity.Err,
        category: Category.Connection,
        userMessage: 'Device disconnected',
      });

      expect(isUserCancellation(error)).toBe(false);
    });

    it('returns false for regular Error', () => {
      const error = new Error('User rejected');

      expect(isUserCancellation(error)).toBe(false);
    });

    it('returns false for string', () => {
      expect(isUserCancellation('UserRejected')).toBe(false);
    });

    it('returns false for null', () => {
      expect(isUserCancellation(null)).toBe(false);
    });
  });

  describe('getIconForErrorCode', () => {
    it('returns Lock icon for AuthenticationDeviceLocked', () => {
      const icon = getIconForErrorCode(ErrorCode.AuthenticationDeviceLocked);

      expect(icon).toBe(IconName.Lock);
    });

    it('returns Plug icon for DeviceDisconnected', () => {
      const icon = getIconForErrorCode(ErrorCode.DeviceDisconnected);

      expect(icon).toBe(IconName.Plug);
    });

    it('returns Connect icon for BluetoothDisabled', () => {
      const icon = getIconForErrorCode(ErrorCode.BluetoothDisabled);

      expect(icon).toBe(IconName.Connect);
    });

    it('returns Setting icon for DeviceStateEthAppClosed', () => {
      const icon = getIconForErrorCode(ErrorCode.DeviceStateEthAppClosed);

      expect(icon).toBe(IconName.Setting);
    });

    it('returns Eye icon for BlindSignNotSupported', () => {
      const icon = getIconForErrorCode(
        ErrorCode.DeviceStateBlindSignNotSupported,
      );

      expect(icon).toBe(IconName.Eye);
    });

    it('returns Close icon for UserRejected', () => {
      const icon = getIconForErrorCode(ErrorCode.UserRejected);

      expect(icon).toBe(IconName.Close);
    });

    it('returns Clock icon for ConnectionTimeout', () => {
      const icon = getIconForErrorCode(ErrorCode.ConnectionTimeout);

      expect(icon).toBe(IconName.Clock);
    });

    it('returns Danger icon for Unknown error', () => {
      const icon = getIconForErrorCode(ErrorCode.Unknown);

      expect(icon).toBe(IconName.Danger);
    });

    it('returns default Danger icon for unmapped codes', () => {
      // Using a code that might not have a mapping
      const icon = getIconForErrorCode(999 as ErrorCode);

      expect(icon).toBe(IconName.Danger);
    });
  });

  describe('getIconColorForErrorCode', () => {
    it('returns Error color for DeviceDisconnected', () => {
      const color = getIconColorForErrorCode(ErrorCode.DeviceDisconnected);

      expect(color).toBe(IconColor.Error);
    });

    it('returns Info color for UserRejected', () => {
      const color = getIconColorForErrorCode(ErrorCode.UserRejected);

      expect(color).toBe(IconColor.Info);
    });

    it('returns Info color for UserCancelled', () => {
      const color = getIconColorForErrorCode(ErrorCode.UserCancelled);

      expect(color).toBe(IconColor.Info);
    });

    it('returns Warning color for UserConfirmationRequired', () => {
      const color = getIconColorForErrorCode(
        ErrorCode.UserConfirmationRequired,
      );

      expect(color).toBe(IconColor.Warning);
    });

    it('returns Error color for Unknown', () => {
      const color = getIconColorForErrorCode(ErrorCode.Unknown);

      expect(color).toBe(IconColor.Error);
    });

    it('returns default Error color for unmapped codes', () => {
      const color = getIconColorForErrorCode(999 as ErrorCode);

      expect(color).toBe(IconColor.Error);
    });
  });

  describe('getTitleForErrorCode', () => {
    it('returns localized title for DeviceDisconnected with Ledger', () => {
      const title = getTitleForErrorCode(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      // Our mock returns the i18n key
      expect(title).toContain('hardware_wallet');
    });

    it('returns localized title for AuthenticationDeviceLocked', () => {
      const title = getTitleForErrorCode(
        ErrorCode.AuthenticationDeviceLocked,
        HardwareWalletType.Ledger,
      );

      expect(title).toContain('hardware_wallet');
    });

    it('returns fallback title for unknown error code', () => {
      const title = getTitleForErrorCode(
        999 as ErrorCode,
        HardwareWalletType.Ledger,
      );

      expect(title).toBe('hardware_wallet.error.something_went_wrong');
    });

    it('works without wallet type', () => {
      const title = getTitleForErrorCode(ErrorCode.DeviceDisconnected);

      expect(title).toContain('hardware_wallet');
    });

    it('works with QR wallet type', () => {
      const title = getTitleForErrorCode(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.QR,
      );

      expect(title).toContain('hardware_wallet');
    });
  });
});
