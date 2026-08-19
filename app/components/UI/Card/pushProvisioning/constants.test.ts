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

    it('returns false for accounts created before November 10, 2025', () => {
      expect(isAccountEligibleForProvisioning('2025-11-09T23:59:59.999Z')).toBe(
        false,
      );
      expect(isAccountEligibleForProvisioning('2025-09-15T12:00:00.000Z')).toBe(
        false,
      );
      expect(isAccountEligibleForProvisioning('2025-08-01T00:00:00.000Z')).toBe(
        false,
      );
    });

    it('returns true for accounts created on or after November 10, 2025', () => {
      expect(isAccountEligibleForProvisioning('2025-12-01T00:00:00.000Z')).toBe(
        true,
      );
      expect(isAccountEligibleForProvisioning('2025-11-11T10:30:00.000Z')).toBe(
        true,
      );
      expect(isAccountEligibleForProvisioning('2026-06-01T00:00:00.000Z')).toBe(
        true,
      );
    });

    it('uses the PROVISIONING_ELIGIBLE_AFTER constant as cutoff', () => {
      expect(PROVISIONING_ELIGIBLE_AFTER).toBe('2025-11-10T00:00:00.000Z');
    });
  });
});
