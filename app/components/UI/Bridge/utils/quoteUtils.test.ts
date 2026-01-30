import '../_mocks_/initialState';
import {
  getQuoteRefreshRate,
  shouldRefreshQuote,
  isQuoteExpired,
} from './quoteUtils';
import type { BridgeToken } from '../types';
import type {
  FeatureFlagsPlatformConfig,
  ChainConfiguration,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';

describe('quoteUtils', () => {
  const DEFAULT_REFRESH_RATE = 30 * 1000; // 30 seconds

  describe('getQuoteRefreshRate', () => {
    const mockChainConfig: ChainConfiguration = {
      refreshRate: 7000,
      isActiveSrc: true,
      isActiveDest: true,
    };

    const mockFeatureFlags: FeatureFlagsPlatformConfig = {
      minimumVersion: '0.0.0',
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
      chainRanking: [
        { chainId: 'eip155:1', name: 'Ethereum' },
        { chainId: 'eip155:137', name: 'Polygon' },
      ],
    };

    const mockBridgeToken: BridgeToken = {
      chainId: '0x1' as Hex,
      address: '0x123',
      symbol: 'ETH',
      decimals: 18,
    };

    it('should return default refresh rate when no source token or feature flags', () => {
      expect(getQuoteRefreshRate(undefined, undefined)).toBe(
        DEFAULT_REFRESH_RATE,
      );
      expect(getQuoteRefreshRate(mockFeatureFlags, undefined)).toBe(
        DEFAULT_REFRESH_RATE,
      );
      expect(getQuoteRefreshRate(undefined, mockBridgeToken)).toBe(
        DEFAULT_REFRESH_RATE,
      );
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
      expect(
        getQuoteRefreshRate(
          featureFlagsWithoutChainRefreshRate,
          mockBridgeToken,
        ),
      ).toBe(10000);
    });

    it('should fall back to global refresh rate when no matching chain config', () => {
      const tokenWithUnsupportedChain: BridgeToken = {
        ...mockBridgeToken,
        chainId: 'eip155:999' as `${string}:${string}`,
      };
      expect(
        getQuoteRefreshRate(mockFeatureFlags, tokenWithUnsupportedChain),
      ).toBe(10000);
    });
  });

  describe('shouldRefreshQuote', () => {
    it('returns false when isSubmittingTx is true', () => {
      const result = shouldRefreshQuote(
        false, // insufficientBal
        0, // quotesRefreshCount
        5, // maxRefreshCount
        true, // isSubmittingTx
      );
      expect(result).toBe(false);
    });

    it('returns false when insufficientBal is true', () => {
      const result = shouldRefreshQuote(
        true, // insufficientBal
        0, // quotesRefreshCount
        5, // maxRefreshCount
        false, // isSubmittingTx
      );
      expect(result).toBe(false);
    });

    it('returns true when under max refresh count and no blocking conditions', () => {
      const result = shouldRefreshQuote(
        false, // insufficientBal
        2, // quotesRefreshCount
        5, // maxRefreshCount
        false, // isSubmittingTx
      );
      expect(result).toBe(true);
    });

    it('returns false when at max refresh count', () => {
      const result = shouldRefreshQuote(
        false, // insufficientBal
        5, // quotesRefreshCount
        5, // maxRefreshCount
        false, // isSubmittingTx
      );
      expect(result).toBe(false);
    });

    it('returns false when over max refresh count', () => {
      const result = shouldRefreshQuote(
        false, // insufficientBal
        6, // quotesRefreshCount
        5, // maxRefreshCount
        false, // isSubmittingTx
      );
      expect(result).toBe(false);
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
      expect(isQuoteExpired(true, refreshRate, now - refreshRate - 1)).toBe(
        false,
      );
    });

    it('should return false when no last fetched timestamp', () => {
      expect(isQuoteExpired(false, refreshRate, null)).toBe(false);
    });

    it('should return true when quote not refreshing and time exceeds refresh rate', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate - 1)).toBe(
        true,
      );
    });

    it('should return false when quote not refreshing but time within refresh rate', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate + 1)).toBe(
        false,
      );
    });

    it('should handle edge cases with exact refresh rate timing', () => {
      expect(isQuoteExpired(false, refreshRate, now - refreshRate)).toBe(false);
    });
  });
});
