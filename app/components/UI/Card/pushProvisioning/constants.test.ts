import { Platform } from 'react-native';
import { getWalletName } from './constants';

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
});
