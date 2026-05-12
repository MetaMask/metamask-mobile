import { Platform } from 'react-native';
import { getCardProvider, getWalletProvider } from './providers';
import { ControllerCardAdapter } from './adapters/card';
import { GoogleWalletAdapter, AppleWalletAdapter } from './adapters/wallet';

jest.mock('./adapters/card', () => ({
  ControllerCardAdapter: jest.fn().mockImplementation(() => ({
    providerId: 'controller',
  })),
}));

jest.mock('./adapters/wallet', () => ({
  AppleWalletAdapter: jest.fn().mockImplementation(() => ({
    walletType: 'apple_wallet',
  })),
  IWalletProviderAdapter: {},
  GoogleWalletAdapter: jest.fn().mockImplementation(() => ({
    walletType: 'google_wallet',
    platform: 'android',
  })),
}));

describe('Push Provisioning Providers', () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', {
      value: originalPlatform,
      writable: true,
    });
  });

  describe('getCardProvider', () => {
    it('returns ControllerCardAdapter for US location', () => {
      const result = getCardProvider('us');

      expect(result).toBeDefined();
      expect(ControllerCardAdapter).toHaveBeenCalled();
    });

    it('returns null for international location', () => {
      const result = getCardProvider('international');

      expect(result).toBeNull();
    });

    it('returns null for unknown location', () => {
      // @ts-expect-error - Testing invalid input
      const result = getCardProvider('unknown');

      expect(result).toBeNull();
    });
  });

  describe('getWalletProvider', () => {
    it('returns AppleWalletAdapter for iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });

      const result = getWalletProvider();

      expect(result).toBeDefined();
      expect(AppleWalletAdapter).toHaveBeenCalled();
    });

    it('returns GoogleWalletAdapter for Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const result = getWalletProvider();

      expect(result).toBeDefined();
      expect(GoogleWalletAdapter).toHaveBeenCalled();
    });

    it('returns null for unsupported platforms', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'windows',
        writable: true,
      });

      const result = getWalletProvider();

      expect(result).toBeNull();
    });
  });
});
