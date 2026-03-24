import '../_mocks_/initialState';
import {
  getQuoteRefreshRate,
  shouldRefreshQuote,
  isQuoteExpired,
  getSourceAmountBaseUnitFromBridgeSwapQuote,
} from './quoteUtils';
import type { BridgeToken } from '../types';
import type {
  FeatureFlagsPlatformConfig,
  ChainConfiguration,
} from '@metamask/bridge-controller';
import { Hex } from '@metamask/utils';

const MOCK_SWAP_BRIDGE_HISTORY_ITEM = {
  txMetaId: '84947480-2773-11f1-9245-439edd68921e',
  originalTransactionId: '84947480-2773-11f1-9245-439edd68921e',
  batchId: '0xccf5b2d866ee4ed8bd85259a86addf21' as Hex,
  quote: {
    requestId:
      '0x9d5a7c182e32590cd76031ca0ff41ce0acdee7300fab7ac930268f13ac8452de' as Hex,
    bridgeId: 'kyberswap',
    srcChainId: 143,
    destChainId: 143,
    aggregator: 'kyberswap',
    aggregatorType: 'AGG',
    srcAsset: {
      address: '0x0000000000000000000000000000000000000000' as Hex,
      chainId: 143,
      assetId:
        'eip155:143/slip44:268435779' as `${string}:${string}/${string}:${string}`,
      symbol: 'MON',
      decimals: 18,
      name: 'Mon',
      aggregators: [],
      occurrences: 1,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/143/slip44/268435779.png',
      metadata: {},
    },
    srcTokenAmount: '9912500000000000000',
    destAsset: {
      address: '0x754704bc059f8c67012fed69bc8a327a5aafb603' as Hex,
      chainId: 143,
      assetId:
        'eip155:143/erc20:0x754704bc059f8c67012fed69bc8a327a5aafb603' as `${string}:${string}/${string}:${string}`,
      symbol: 'USDC',
      decimals: 6,
      name: 'USDC',
      aggregators: ['metamask', 'liFi', 'squid'],
      occurrences: 3,
      iconUrl:
        'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/143/erc20/0x754704bc059f8c67012fed69bc8a327a5aafb603.png',
      metadata: {},
    },
    destTokenAmount: '221617',
    minDestTokenAmount: '217184',
    walletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
    destWalletAddress: '0x13b7e6EBcd40777099E4c45d407745aB2de1D1F8',
    feeData: {
      metabridge: {
        amount: '87500000000000000',
        asset: {
          address: '0x0000000000000000000000000000000000000000' as Hex,
          chainId: 143,
          assetId:
            'eip155:143/slip44:268435779' as `${string}:${string}/${string}:${string}`,
          symbol: 'MON',
          decimals: 18,
          name: 'Mon',
          aggregators: [],
          occurrences: 1,
          iconUrl:
            'https://static.cx.metamask.io/api/v2/tokenIcons/assets/eip155/143/slip44/268435779.png',
          metadata: {},
        },
        quoteBpsFee: 87.5,
        baseBpsFee: 87.5,
      },
    },
    bridges: ['kyberswap'],
    protocols: ['kyberswap'],
    steps: [],
    slippage: 2,
    gasSponsored: true,
    gasIncluded: false,
    gasIncluded7702: true,
    priceData: {
      totalFromAmountUsd: '0.2230895',
      totalToAmountUsd: '0.22158641685400002',
      priceImpact: '-0.002030185048894483',
      totalFeeAmountUsd: '0.0019520331249999999',
    },
  },
  startTime: 1774351249033,
  estimatedProcessingTimeInSeconds: 0,
  slippagePercentage: 0,
  pricingData: {
    amountSent: '10',
    amountSentInUsd: '0.22325618',
    quotedGasInUsd: '0',
    quotedReturnInUsd: '0.2216453462949967961213432092',
    quotedGasAmount: '0',
  },
  account: '0x13b7e6ebcd40777099e4c45d407745ab2de1d1f8' as Hex,
  status: {
    status: 'PENDING',
    srcChain: {
      chainId: 143,
      txHash:
        '0xe0b3d0d994e5658602754e450e436b7382de84057362dfb5597b27a85f39405a' as Hex,
    },
  },
  hasApprovalTx: false,
  isStxEnabled: true,
  location: 'Main View',
  activeAbTests: [
    { key: 'swapsSWAPS4135AbtestNumpadQuickAmounts', value: 'treatment' },
    { key: 'swapsSWAPS4242AbtestTokenSelectorBalanceLayout', value: 'control' },
  ],
};

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

  describe('getSourceAmountBaseUnitFromBridgeSwapQuote', () => {
    it('should return source amount + fee when both are the native token on same chain', () => {
      // Default mock is "all native token"
      const { quote } = { ...MOCK_SWAP_BRIDGE_HISTORY_ITEM };
      expect(getSourceAmountBaseUnitFromBridgeSwapQuote(quote)).toEqual(
        '10000000000000000000',
      );
    });

    it('should return only source amount when both are the native token but on different chain', () => {
      const { quote } = { ...MOCK_SWAP_BRIDGE_HISTORY_ITEM };
      quote.feeData.metabridge.asset.chainId = 123;
      expect(getSourceAmountBaseUnitFromBridgeSwapQuote(quote)).toEqual(
        '9912500000000000000',
      );
    });

    it('should return only source amount when source is native token and fee token is not', () => {
      const { quote } = { ...MOCK_SWAP_BRIDGE_HISTORY_ITEM };
      quote.feeData.metabridge.asset.address =
        '0xa0b86991c6218b36c1d19d4a2e9Eb0ce3606eb48';
      expect(getSourceAmountBaseUnitFromBridgeSwapQuote(quote)).toEqual(
        '9912500000000000000',
      );
    });

    it('should return only source amount when fee is native token and source token is not', () => {
      const { quote } = { ...MOCK_SWAP_BRIDGE_HISTORY_ITEM };
      quote.srcAsset.address = '0xa0b86991c6218b36c1d19d4a2e9Eb0ce3606eb48';
      expect(getSourceAmountBaseUnitFromBridgeSwapQuote(quote)).toEqual(
        '9912500000000000000',
      );
    });

    it('should return only source amount when neither fee or source tokens are native ', () => {
      const { quote } = { ...MOCK_SWAP_BRIDGE_HISTORY_ITEM };
      // Same address but non-native
      quote.feeData.metabridge.asset.address =
        '0xa0b86991c6218b36c1d19d4a2e9Eb0ce3606eb48';
      quote.srcAsset.address = '0xa0b86991c6218b36c1d19d4a2e9Eb0ce3606eb48';
      expect(getSourceAmountBaseUnitFromBridgeSwapQuote(quote)).toEqual(
        '9912500000000000000',
      );
    });
  });
});
