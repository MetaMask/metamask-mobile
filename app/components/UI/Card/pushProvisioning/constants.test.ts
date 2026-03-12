import { Platform } from 'react-native';
import {
  getWalletName,
  isAccountEligibleForProvisioning,
  PROVISIONING_ELIGIBLE_AFTER,
} from './constants';

describe('Push Provisioning Constants', () => {
  const originalPlatform = Platform.OS;

  afterEach(() => {
    // Reset Platform.OS after each test
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('getWalletName', () => {
    it('returns "Apple Wallet" for iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });

      expect(getWalletName()).toBe('Apple Wallet');
    });

    it('returns "Google Wallet" for Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      expect(getWalletName()).toBe('Google Wallet');
    });

    it('returns "Google Wallet" for other platforms', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'windows',
        writable: true,
      });

      expect(getWalletName()).toBe('Google Wallet');
    });
  });

  describe('isAccountEligibleForProvisioning', () => {
    it('returns false for null or undefined', () => {
      expect(isAccountEligibleForProvisioning(null)).toBe(false);
      expect(isAccountEligibleForProvisioning(undefined)).toBe(false);
    });

    it('returns false for invalid date strings', () => {
      expect(isAccountEligibleForProvisioning('')).toBe(false);
      expect(isAccountEligibleForProvisioning('not-a-date')).toBe(false);
    });

    it('returns false for accounts created before Jan 2026', () => {
      expect(isAccountEligibleForProvisioning('2025-12-31T23:59:59.999Z')).toBe(
        false,
      );
      expect(isAccountEligibleForProvisioning('2025-06-15T12:00:00.000Z')).toBe(
        false,
      );
      expect(isAccountEligibleForProvisioning('2024-01-01T00:00:00.000Z')).toBe(
        false,
      );
    });

    it('returns true for accounts created on or after Jan 2026', () => {
      expect(isAccountEligibleForProvisioning('2026-01-01T00:00:00.000Z')).toBe(
        true,
      );
      expect(isAccountEligibleForProvisioning('2026-01-15T10:30:00.000Z')).toBe(
        true,
      );
      expect(isAccountEligibleForProvisioning('2026-06-01T00:00:00.000Z')).toBe(
        true,
      );
    });

    it('uses the PROVISIONING_ELIGIBLE_AFTER constant as cutoff', () => {
      expect(PROVISIONING_ELIGIBLE_AFTER).toBe('2026-01-01T00:00:00.000Z');
    });
  });
});
