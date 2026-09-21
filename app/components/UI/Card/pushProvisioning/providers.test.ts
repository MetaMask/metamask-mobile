import { Platform } from 'react-native';
import { getCardProvider, getWalletProvider } from './providers';
import { ControllerCardAdapter } from './adapters/card';
import { GoogleWalletAdapter, AppleWalletAdapter } from './adapters/wallet';
import type { CardProviderCapabilities } from '../../../../core/Engine/controllers/card-controller/provider-types';

jest.mock('./adapters/card', () => ({
  ControllerCardAdapter: jest.fn().mockImplementation(() => ({
    providerId: 'baanx',
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

const capabilities = {
  pushProvisioning: { applePay: true, googlePay: false },
} as CardProviderCapabilities;

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
    it('returns the controller adapter when the platform wallet is supported', () => {
      const result = getCardProvider(capabilities, 'apple_wallet');

      expect(result).toBeDefined();
      expect(ControllerCardAdapter).toHaveBeenCalled();
    });

    it('returns null when the platform wallet is not supported', () => {
      const result = getCardProvider(capabilities, 'google_wallet');

      expect(result).toBeNull();
    });

    it('returns null when capabilities are missing', () => {
      expect(getCardProvider(null, 'apple_wallet')).toBeNull();
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
