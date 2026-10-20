import { Platform } from 'react-native';
import {
  getWalletName,
  getWalletTypeForPlatform,
  isApplePayProvisioningCountry,
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

  describe('isApplePayProvisioningCountry', () => {
    it('accepts New Zealand', () => {
      expect(isApplePayProvisioningCountry('NZ')).toBe(true);
      expect(isApplePayProvisioningCountry('nz')).toBe(true);
    });

    it('rejects every other country', () => {
      expect(isApplePayProvisioningCountry('US')).toBe(false);
      expect(isApplePayProvisioningCountry(null)).toBe(false);
      expect(isApplePayProvisioningCountry(undefined)).toBe(false);
    });
  });

  describe('getWalletTypeForPlatform', () => {
    it('returns apple_wallet on iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });
      expect(getWalletTypeForPlatform()).toBe('apple_wallet');
    });

    it('returns google_wallet on Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });
      expect(getWalletTypeForPlatform()).toBe('google_wallet');
    });
  });
});
