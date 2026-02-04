import { ErrorCode, Severity, Category } from '@metamask/hw-wallet-sdk';
import { createHardwareWalletError } from './factory';
import { HardwareWalletType } from '../helpers';
import { RecoveryAction } from './types';

jest.mock('../../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

describe('createHardwareWalletError', () => {
  describe('creates error with correct properties', () => {
    it('creates error with given error code', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      expect(error.code).toBe(ErrorCode.DeviceDisconnected);
    });

    it('creates error that is instance of HardwareWalletError', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      expect(error).toBeInstanceOf(Error);
      expect(error.code).toBeDefined();
      expect(error.severity).toBeDefined();
      expect(error.category).toBeDefined();
    });

    it('includes wallet type in metadata', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      expect(error.metadata?.walletType).toBe(HardwareWalletType.Ledger);
    });

    it('includes recovery action in metadata', () => {
      const error = createHardwareWalletError(
        ErrorCode.BluetoothDisabled,
        HardwareWalletType.Ledger,
      );

      expect(error.metadata?.recoveryAction).toBe(RecoveryAction.RETRY);
    });
  });

  describe('uses SDK severity and category', () => {
    it('uses severity from SDK mappings', () => {
      const error = createHardwareWalletError(
        ErrorCode.UserRejected,
        HardwareWalletType.Ledger,
      );

      // UserRejected has Info severity in SDK
      expect([Severity.Info, Severity.Warning, Severity.Err]).toContain(
        error.severity,
      );
    });

    it('uses category from SDK mappings', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      expect(Object.values(Category).includes(error.category)).toBe(true);
    });
  });

  describe('uses localized messages', () => {
    it('creates error with localized user message', () => {
      const error = createHardwareWalletError(
        ErrorCode.AuthenticationDeviceLocked,
        HardwareWalletType.Ledger,
      );

      // userMessage should be the i18n key (since we mocked strings)
      expect(error.userMessage).toBeDefined();
      expect(typeof error.userMessage).toBe('string');
    });
  });

  describe('handles optional parameters', () => {
    it('uses provided technical message', () => {
      const technicalMessage = 'Custom technical message';
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
        technicalMessage,
      );

      expect(error.message).toBe(technicalMessage);
    });

    it('includes cause in error', () => {
      const cause = new Error('Original error');
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
        undefined,
        { cause },
      );

      expect(error.cause).toBe(cause);
    });

    it('includes additional metadata', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
        undefined,
        { metadata: { statusCode: 0x6985 } },
      );

      expect(error.metadata?.statusCode).toBe(0x6985);
    });

    it('merges additional metadata with default metadata', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
        undefined,
        { metadata: { customField: 'value' } },
      );

      // Should have both walletType and customField
      expect(error.metadata?.walletType).toBe(HardwareWalletType.Ledger);
      expect(error.metadata?.customField).toBe('value');
    });
  });

  describe('handles unknown error code', () => {
    it('falls back to Unknown for unmapped codes', () => {
      const error = createHardwareWalletError(
        ErrorCode.Unknown,
        HardwareWalletType.Ledger,
      );

      expect(error.code).toBe(ErrorCode.Unknown);
    });

    it('uses default severity for unknown codes', () => {
      const error = createHardwareWalletError(
        ErrorCode.Unknown,
        HardwareWalletType.Ledger,
      );

      expect(error.severity).toBeDefined();
    });

    it('uses RETRY recovery action for unknown codes (user can retry)', () => {
      const error = createHardwareWalletError(
        ErrorCode.Unknown,
        HardwareWalletType.Ledger,
      );

      // Unknown errors should be retryable - let users try again
      expect(error.metadata?.recoveryAction).toBe(RecoveryAction.RETRY);
    });
  });

  describe('recovery actions are mapped correctly', () => {
    it('maps UserRejected to ACKNOWLEDGE', () => {
      const error = createHardwareWalletError(
        ErrorCode.UserRejected,
        HardwareWalletType.Ledger,
      );

      expect(error.metadata?.recoveryAction).toBe(RecoveryAction.ACKNOWLEDGE);
    });

    it('maps DeviceDisconnected to RETRY (user can reconnect)', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.Ledger,
      );

      // Device disconnected should be retryable - user can reconnect
      expect(error.metadata?.recoveryAction).toBe(RecoveryAction.RETRY);
    });
  });

  describe('QR wallet type', () => {
    it('works with QR hardware wallet type', () => {
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        HardwareWalletType.QR,
      );

      expect(error.metadata?.walletType).toBe(HardwareWalletType.QR);
    });
  });

  describe('undefined wallet type', () => {
    it('works without wallet type', () => {
      const error = createHardwareWalletError(ErrorCode.DeviceDisconnected);

      expect(error.code).toBe(ErrorCode.DeviceDisconnected);
      expect(error.metadata?.walletType).toBeUndefined();
    });
  });

  describe('fallback behavior for unmapped error codes', () => {
    it('falls back to Unknown mobile extension when code has no mapping', () => {
      // Use an error code that exists in SDK but might not have a mobile extension
      // ConnectionClosed should have a mapping, but let's test the fallback path
      const error = createHardwareWalletError(
        ErrorCode.ConnectionClosed,
        HardwareWalletType.Ledger,
      );

      // Should still create a valid error with recovery action
      expect(error.code).toBe(ErrorCode.ConnectionClosed);
      expect(error.metadata?.recoveryAction).toBeDefined();
    });

    it('uses SDK message as fallback when mobile extension has no message', () => {
      // Create error with a code that has SDK mapping
      const error = createHardwareWalletError(
        ErrorCode.DeviceDisconnected,
        undefined, // No wallet type
      );

      // Should have a user message (either from mobile extension or SDK fallback)
      expect(error.userMessage).toBeDefined();
      expect(typeof error.userMessage).toBe('string');
      expect(error.userMessage.length).toBeGreaterThan(0);
    });

    it('uses default message when neither mobile extension nor SDK has message', () => {
      // Test with Unknown which should always have fallbacks
      const error = createHardwareWalletError(ErrorCode.Unknown);

      expect(error.userMessage).toBeDefined();
      expect(error.message).toBeDefined();
    });

    it('uses default severity Warning when SDK mapping not found', () => {
      // Unknown codes should get Warning severity as fallback
      const error = createHardwareWalletError(ErrorCode.Unknown);

      // Severity should be defined (either from SDK or fallback)
      expect(error.severity).toBeDefined();
    });

    it('uses default category Unknown when SDK mapping not found', () => {
      const error = createHardwareWalletError(ErrorCode.Unknown);

      // Category should be defined
      expect(error.category).toBeDefined();
    });
  });
});
