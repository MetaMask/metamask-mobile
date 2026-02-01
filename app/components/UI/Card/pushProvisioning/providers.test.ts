import { Platform } from 'react-native';
import { getCardProvider, getWalletProvider } from './providers';
import { GalileoCardAdapter } from './adapters/card';
import { GoogleWalletAdapter, AppleWalletAdapter } from './adapters/wallet';
import { CardSDK } from '../sdk/CardSDK';

// Mock the adapters
jest.mock('./adapters/card', () => ({
  GalileoCardAdapter: jest.fn().mockImplementation(() => ({
    providerId: 'galileo',
  })),
}));

jest.mock('./adapters/wallet', () => ({
  GoogleWalletAdapter: jest.fn().mockImplementation(() => ({
    walletType: 'google_wallet',
  })),
  AppleWalletAdapter: jest.fn().mockImplementation(() => ({
    walletType: 'apple_wallet',
  })),
}));

describe('Push Provisioning Providers', () => {
  const mockCardSDK = {} as CardSDK;
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
    it('returns GalileoCardAdapter for US location', () => {
      const result = getCardProvider('us', mockCardSDK);

      expect(result).toBeDefined();
      expect(GalileoCardAdapter).toHaveBeenCalledWith(mockCardSDK);
    });

    it('returns null for international location', () => {
      const result = getCardProvider('international', mockCardSDK);

      expect(result).toBeNull();
    });

    it('returns null for unknown location', () => {
      // @ts-expect-error - Testing invalid input
      const result = getCardProvider('unknown', mockCardSDK);

      expect(result).toBeNull();
    });
  });

  describe('getWalletProvider', () => {
    it('returns GoogleWalletAdapter for Android', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'android',
        writable: true,
      });

      const result = getWalletProvider();

      expect(result).toBeDefined();
      expect(GoogleWalletAdapter).toHaveBeenCalled();
    });

    it('returns AppleWalletAdapter for iOS', () => {
      Object.defineProperty(Platform, 'OS', {
        value: 'ios',
        writable: true,
      });

      const result = getWalletProvider();

      expect(result).toBeDefined();
      expect(AppleWalletAdapter).toHaveBeenCalled();
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
