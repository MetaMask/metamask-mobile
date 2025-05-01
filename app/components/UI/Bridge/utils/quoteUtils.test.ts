import {
  getQuoteRefreshRate,
  shouldRefreshQuote,
  isQuoteExpired,
} from './quoteUtils';
import type { BridgeToken } from '../types';
import type { FeatureFlagsPlatformConfig, ChainConfiguration } from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';

describe('quoteUtils', () => {
  const DEFAULT_REFRESH_RATE = 5 * 1000; // 5 seconds

  describe('getQuoteRefreshRate', () => {
    const mockChainConfig: ChainConfiguration = {
      refreshRate: 7000,
      isActiveSrc: true,
      isActiveDest: true,
    };

    const mockFeatureFlags: FeatureFlagsPlatformConfig = {
      refreshRate: 10000,
      maxRefreshCount: 3,
      support: true,
      chains: {
        'eip155:1': mockChainConfig,
        'eip155:137': {
          ...mockChainConfig,
          refreshRate: 3000,
        },
      },
    };

    const mockBridgeToken: BridgeToken = {
      chainId: '0x1' as Hex,
      address: '0x123',
      symbol: 'ETH',
      decimals: 18,
    };

    it('should return default refresh rate when no source token or feature flags', () => {
      expect(getQuoteRefreshRate(undefined, undefined)).toBe(DEFAULT_REFRESH_RATE);
      expect(getQuoteRefreshRate(mockFeatureFlags, undefined)).toBe(DEFAULT_REFRESH_RATE);
      expect(getQuoteRefreshRate(undefined, mockBridgeToken)).toBe(DEFAULT_REFRESH_RATE);
    });

    it('should return chain-specific refresh rate when available', () => {
      expect(getQuoteRefreshRate(mockFeatureFlags, mockBridgeToken)).toBe(7000);
    });

    it('should fall back to global refresh rate when chain config exists but no refresh rate', () => {
      const featureFlagsWithoutChainRefreshRate = {
        ...mockFeatureFlags,
        chains: {
          'eip155:1': {
            isActiveSrc: true,
            isActiveDest: true,
          },
        },
      };
      expect(getQuoteRefreshRate(featureFlagsWithoutChainRefreshRate, mockBridgeToken)).toBe(10000);
    });

    it('should fall back to global refresh rate when no matching chain config', () => {
      const tokenWithUnsupportedChain: BridgeToken = {
        ...mockBridgeToken,
        chainId: 'eip155:999' as `${string}:${string}`,
      };
      expect(getQuoteRefreshRate(mockFeatureFlags, tokenWithUnsupportedChain)).toBe(10000);
    });
  });

  describe('shouldRefreshQuote', () => {
    it('should return false when insufficient balance', () => {
      expect(shouldRefreshQuote(true, 0, 3)).toBe(false);
      expect(shouldRefreshQuote(true, 1, 3)).toBe(false);
      expect(shouldRefreshQuote(true, 2, 3)).toBe(false);
    });

    it('should return true when sufficient balance and under max refresh count', () => {
      expect(shouldRefreshQuote(false, 0, 3)).toBe(true);
      expect(shouldRefreshQuote(false, 1, 3)).toBe(true);
      expect(shouldRefreshQuote(false, 2, 3)).toBe(true);
    });

    it('should return false when sufficient balance but at max refresh count', () => {
      expect(shouldRefreshQuote(false, 3, 3)).toBe(false);
    });

    it('should return false when sufficient balance but over max refresh count', () => {
      expect(shouldRefreshQuote(false, 4, 3)).toBe(false);
    });
  });

  describe('isQuoteExpired', () => {
    const now = Date.now();
    const refreshRate = 5000;

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should return false when quote is going to refresh', () => {
      expect(isQuoteExpired(true, refreshRate, now - 1000)).toBe(false);
      expect(isQuoteExpired(true, refreshRate, now - refreshRate - 1)).toBe(false);
    });

    it('should return false when no last fetched timestamp', () => {
      expect(isQuoteExpired(false, refreshRate, null)).toBe(false);
    });

    it('should return true when quote not refreshing and time exceeds refresh rate', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate - 1)).toBe(true);
    });

    it('should return false when quote not refreshing but time within refresh rate', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate + 1)).toBe(false);
    });

    it('should handle edge cases with exact refresh rate timing', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate)).toBe(false);
    });
  });
});
