import { renderHook } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { BridgeToken } from '../../types';
import { useBatchSellQuoteData } from '.';
import {
  formatAddressToAssetId,
  type QuoteMetadata,
  type QuoteResponseV1,
  type QuoteResponse,
  type selectBatchSellQuotes,
  type selectBatchSellTrades,
  type selectBridgeFeatureFlags,
} from '@metamask/bridge-controller';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as smartTransactionsController from '../../../../../selectors/smartTransactionsController';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeUtils from '../../../../../util/bridge';

jest.mock('../useBatchSellQuoteRequest', () => ({
  getBatchSellAtomicSourceAmount: jest.fn(
    (_token: BridgeToken, sourceAmount?: string) =>
      sourceAmount && Number(sourceAmount) > 0 ? '1' : undefined,
  ),
  hasValidBatchSellSourceAmounts: jest.fn(
    (
      _sourceTokens: BridgeToken[],
      batchSellSourceTokenAmounts: Record<string, string | undefined>,
    ) =>
      Object.values(batchSellSourceTokenAmounts).some(
        (amount) => amount !== undefined && Number(amount) > 0,
      ),
  ),
}));

jest.mock('../../../../../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      BridgeController: {
        state: {
          batchSellTrades: undefined,
          batchSellTradesLoadingStatus: undefined,
          quotesLoadingStatus: undefined,
        },
        updateBatchSellTrades: jest.fn().mockResolvedValue(undefined),
      },
    },
  },
}));

const ethAssetId =
  'eip155:1/erc20:0x1111111111111111111111111111111111111111' as CaipAssetType;
const uniAssetId =
  'eip155:1/erc20:0x2222222222222222222222222222222222222222' as CaipAssetType;

const ethToken: BridgeToken = {
  address: '0x1111111111111111111111111111111111111111',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'ETH',
  balance: '1',
};

const uniToken: BridgeToken = {
  address: '0x2222222222222222222222222222222222222222',
  chainId: '0x1' as Hex,
  decimals: 18,
  symbol: 'UNI',
  balance: '2',
};

const usdcToken: BridgeToken = {
  address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDC',
};

const usdtToken: BridgeToken = {
  address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
  chainId: '0x1' as Hex,
  decimals: 6,
  symbol: 'USDT',
};

function buildMockRecommendedQuote(
  sourceToken: BridgeToken,
  amount: string,
  valueInCurrency: string | undefined,
  destinationToken: BridgeToken = usdcToken,
  priceData?: { priceImpact?: string },
  quoteId = `${sourceToken.symbol}-${destinationToken.symbol}-${amount}`,
  quoteOverrides: Partial<{
    gasIncluded: boolean;
    gasIncluded7702: boolean;
    gasSponsored: boolean;
    quoteBpsFee: number | undefined;
  }> = {},
): QuoteResponseV1 & QuoteMetadata {
  const { quoteBpsFee = 87.5, ...remainingQuoteOverrides } = quoteOverrides;

  return {
    quoteId,
    quote: {
      requestId: quoteId,
      srcAsset: {
        ...sourceToken,
        assetId: formatAddressToAssetId(
          sourceToken.address,
          sourceToken.chainId,
        ) as CaipAssetType,
      } as never,
      srcChainId: Number(sourceToken.chainId),
      destAsset: {
        ...destinationToken,
        assetId: formatAddressToAssetId(
          destinationToken.address,
          destinationToken.chainId,
        ) as CaipAssetType,
      } as never,
      destChainId: Number(destinationToken.chainId),
      feeData: {
        metabridge: { quoteBpsFee, amount: '0', asset: usdcToken as never },
      },
      ...(priceData ? { priceData } : {}),
      ...remainingQuoteOverrides,
    } as unknown as QuoteResponseV1['quote'],
    toTokenAmount: { amount, valueInCurrency },
    minToTokenAmount: { amount, valueInCurrency },
  } as QuoteResponseV1 & QuoteMetadata;
}

const ethNetworkFeeAsset = {
  symbol: 'ETH',
  chainId: 1,
  address: '0x0000000000000000000000000000000000000000',
  assetId: 'eip155:1/slip44:60' as CaipAssetType,
  name: 'Ether',
  decimals: 18,
};

const usdcNetworkFeeAsset = {
  symbol: 'USDC',
  chainId: 1,
  address: usdcToken.address,
  assetId:
    'eip155:1/erc20:0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48' as CaipAssetType,
  name: 'USD Coin',
  decimals: 6,
};

const mockBatchSellQuotes: ReturnType<typeof selectBatchSellQuotes> = {
  recommendedQuotes: [
    buildMockRecommendedQuote(ethToken, '123', '123.45'),
    buildMockRecommendedQuote(uniToken, '77', '77.89'),
  ],
  totalReceived: { amount: '200', valueInCurrency: '201.34', usd: '0' },
  minimumReceived: { amount: '190', valueInCurrency: '191.23', usd: '0' },
  isLoading: false,
  isQuoteGoingToRefresh: true,
  quotesLastFetchedMs: Date.now(),
  quoteFetchError: null,
  quotesRefreshCount: 0,
  quotesInitialLoadTimeMs: 0,
};

const mockBatchSellTrades: ReturnType<typeof selectBatchSellTrades> = {
  totalNetworkFee: {
    amount: '1.2',
    valueInCurrency: '1.25',
    usd: undefined,
    asset: ethNetworkFeeAsset,
  },
  isBatchSellTradeAvailable: true,
  isLoading: false,
};

const mockBridgeFeatureFlags: ReturnType<typeof selectBridgeFeatureFlags> = {
  chains: {},
  refreshRate: 30000,
  priceImpactThreshold: { warning: 0.05 } as never,
  maxRefreshCount: 3,
  support: true,
  minimumVersion: '1.0.0',
};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: jest.fn(() => 'USD'),
}));

jest.mock('../../../../../util/Logger', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    log: jest.fn(),
  },
}));

const mockSelectShouldUseSmartTransaction = jest.fn(() => false);

const mockGetMaybeHexChainId = jest.fn(
  (chainId?: string) => chainId as `0x${string}` | undefined,
);

describe('useBatchSellQuoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest
      .spyOn(bridgeUtils, 'getMaybeHexChainId')
      .mockImplementation(mockGetMaybeHexChainId);
    jest
      .spyOn(smartTransactionsController, 'selectShouldUseSmartTransaction')
      .mockImplementation(mockSelectShouldUseSmartTransaction);

    jest
      .spyOn(bridgeSlice, 'selectBatchSellDestToken')
      .mockReturnValue(usdcToken);
    jest
      .spyOn(bridgeSlice, 'selectBatchSellSourceTokens')
      .mockReturnValue([ethToken, uniToken]);
    jest
      .spyOn(bridgeSlice, 'selectBatchSellSourceTokenAmounts')
      .mockReturnValue({
        [ethAssetId]: '1',
        [uniAssetId]: '2',
      });
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
      totalReceived: { amount: '200', valueInCurrency: '201.34', usd: '0' },
      minimumReceived: { amount: '190', valueInCurrency: '191.23', usd: '0' },
      isLoading: false,
      isQuoteGoingToRefresh: true,
      quotesLastFetchedMs: Date.now(),
      quoteFetchError: null,
      quotesRefreshCount: 0,
      quotesInitialLoadTimeMs: 0,
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellTrades').mockReturnValue({
      totalNetworkFee: {
        amount: '1.2',
        valueInCurrency: '1.25',
        usd: undefined,
        asset: ethNetworkFeeAsset,
      },
      isBatchSellTradeAvailable: true,
      isLoading: false,
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellSlippages').mockReturnValue({});
    jest
      .spyOn(bridgeSlice, 'selectBridgeFeatureFlags')
      .mockReturnValue(mockBridgeFeatureFlags);
  });

  it('reports no quotes when all source amounts are zero even if stale quotes exist', () => {
    jest
      .spyOn(bridgeSlice, 'selectBatchSellSourceTokenAmounts')
      .mockReturnValue({
        [ethAssetId]: '0',
        [uniAssetId]: '0',
      });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(false);
    expect(result.current.totalReceived.formattedFiat).toBe('-');
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).not.toHaveBeenCalled();
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        isQuoteUnavailable: true,
      }),
    );
  });

  it('formats complete Batch Sell quote data', () => {
    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isGasless).toBe(false);
    expect(result.current.isBatchSellTradeAvailable).toBe(true);
    expect(result.current.isBatchSellTradesLoading).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(false);
    expect(result.current.needsNewQuote).toBe(false);
    expect(result.current.totalReceived.amount).toBe('200');
    expect(result.current.totalReceived.valueInCurrency).toBe('201.34');
    expect(result.current.minimumReceived.amount).toBe('200');
    expect(result.current.networkFee.amount).toBe('1.2');
    expect(result.current.networkFee.valueInCurrency).toBe('1.25');
    expect(result.current.quotePercentFee).toBe('0.875');
    expect(result.current.totalReceived.formatted).toBe('200 USDC');
    expect(result.current.totalReceived.formattedFiat).toBe('$201.34');
    expect(result.current.minimumReceived.formatted).toBe('200 USDC');
    expect(result.current.networkFee.formatted).toBe('1.2 ETH');
    expect(result.current.networkFee.formattedFiat).toBe('$1.25');
    expect(result.current.recommendedQuotes).toEqual(
      mockBatchSellQuotes.recommendedQuotes,
    );
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith(mockBatchSellQuotes.recommendedQuotes, false);
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        key: ethAssetId,
        tokenSymbol: 'ETH',
        quote: mockBatchSellQuotes.recommendedQuotes[0],
        receivedAmount: '123 USDC',
        receivedAmountFiat: '$123.45',
        isLoading: false,
        isHighPriceImpact: false,
        isQuoteUnavailable: false,
      }),
      [uniAssetId]: expect.objectContaining({
        key: uniAssetId,
        tokenSymbol: 'UNI',
        quote: mockBatchSellQuotes.recommendedQuotes[1],
        receivedAmount: '77 USDC',
        receivedAmountFiat: '$77.89',
        isLoading: false,
        isHighPriceImpact: false,
        isQuoteUnavailable: false,
      }),
    });
  });

  it('does not mark Batch Sell quote data as gasless when the network fee is the native gas token', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(
          ethToken,
          '123',
          '123.45',
          usdcToken,
          undefined,
          'gasless-eth',
          { gasIncluded: true, gasIncluded7702: false },
        ),
        buildMockRecommendedQuote(
          uniToken,
          '77',
          '77.89',
          usdcToken,
          undefined,
          'gasless-uni',
          { gasIncluded: false, gasIncluded7702: true },
        ),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.isGasless).toBe(false);
  });

  it('marks Batch Sell quote data as gasless when the network fee is not the native gas token', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellTrades').mockReturnValue({
      ...mockBatchSellTrades,
      totalNetworkFee: {
        amount: '1.2',
        valueInCurrency: '1.25',
        usd: '0',
        asset: usdcNetworkFeeAsset,
      },
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.isGasless).toBe(true);
  });

  it('returns the Batch Sell trades loading state', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellTrades').mockReturnValue({
      ...mockBatchSellTrades,
      isBatchSellTradeAvailable: false,
      isLoading: true,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.isBatchSellTradesLoading).toBe(true);
  });

  it('does not need a new quote when the quote is expired but going to refresh', () => {
    const now = 60000;
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(bridgeSlice, 'selectBridgeFeatureFlags').mockReturnValue({
      ...mockBridgeFeatureFlags,
      refreshRate: 30000,
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      quotesLastFetchedMs: 1,
      isQuoteGoingToRefresh: true,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.needsNewQuote).toBe(false);

    dateNowSpy.mockRestore();
  });

  it('needs a new quote when the quote is expired and no longer refreshing', () => {
    const now = 60000;
    const dateNowSpy = jest.spyOn(Date, 'now').mockReturnValue(now);
    jest.spyOn(bridgeSlice, 'selectBridgeFeatureFlags').mockReturnValue({
      ...mockBridgeFeatureFlags,
      refreshRate: 30000,
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      quotesLastFetchedMs: 1,
      isQuoteGoingToRefresh: false,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.needsNewQuote).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('200 USDC');
    expect(result.current.totalReceived.formattedFiat).toBe('$201.34');

    dateNowSpy.mockRestore();
  });

  it('derives the MetaMask fee from the quoteBpsFee on quote data', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(
          ethToken,
          '123',
          '123.45',
          usdcToken,
          undefined,
          'dynamic-fee-eth',
          { quoteBpsFee: 125 },
        ),
        buildMockRecommendedQuote(
          uniToken,
          '77',
          '77.89',
          usdcToken,
          undefined,
          'dynamic-fee-uni',
          { quoteBpsFee: 125 },
        ),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.quotePercentFee).toBe('1.25');
  });

  it('does not expose a MetaMask fee when quoteBpsFee is zero', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(
          ethToken,
          '123',
          '123.45',
          usdcToken,
          undefined,
          'zero-fee-eth',
          { quoteBpsFee: 0 },
        ),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.quotePercentFee).toBeUndefined();
  });

  it('does not fetch Batch Sell trades again for the same quote ids', () => {
    const { rerender } = renderHook(() => useBatchSellQuoteData());

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(1);

    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [...mockBatchSellQuotes.recommendedQuotes],
    });

    rerender({});

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(1);
  });

  it('fetches Batch Sell trades again when the recommended quote id changes', () => {
    const { rerender } = renderHook(() => useBatchSellQuoteData());

    const [firstQuote, secondQuote] = mockBatchSellQuotes.recommendedQuotes;
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        firstQuote
          ? {
              ...firstQuote,
              quoteId: 'updated-quote-id',
            }
          : firstQuote,
        secondQuote,
      ],
    });

    rerender({});

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(2);
  });

  it('passes isSmartTransaction=false to updateBatchSellTrades when STX is disabled', () => {
    jest
      .spyOn(smartTransactionsController, 'selectShouldUseSmartTransaction')
      .mockReturnValue(false);

    renderHook(() => useBatchSellQuoteData());

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith(expect.any(Array), false);
  });

  it('passes isSmartTransaction=true to updateBatchSellTrades when STX is enabled', () => {
    jest
      .spyOn(smartTransactionsController, 'selectShouldUseSmartTransaction')
      .mockReturnValue(true);

    renderHook(() => useBatchSellQuoteData());

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith(expect.any(Array), true);
  });

  it('falls back to destination token amounts when display currency values are unavailable', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', undefined),
        buildMockRecommendedQuote(uniToken, '77', undefined),
      ],
      totalReceived: { amount: '200', valueInCurrency: '0', usd: '0' },
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellTrades').mockReturnValue({
      ...mockBatchSellTrades,
      totalNetworkFee: {
        amount: '1.2',
        valueInCurrency: '',
        usd: undefined,
        asset: ethNetworkFeeAsset,
      },
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.totalReceived.formattedFiat).toBe('200 USDC');
    expect(result.current.networkFee.formatted).toBe('1.2 ETH');
    expect(result.current.networkFee.formattedFiat).toBe('-');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        receivedAmountFiat: '123 USDC',
      }),
      [uniAssetId]: expect.objectContaining({
        receivedAmountFiat: '77 USDC',
      }),
    });
  });

  it('does not fall back to the destination token symbol when trade fee is unavailable', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellTrades').mockReturnValue({
      totalNetworkFee: undefined,
      isBatchSellTradeAvailable: false,
      isLoading: false,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.networkFee.formatted).toBe('--');
    expect(result.current.isBatchSellTradeAvailable).toBe(false);
    expect(result.current.isBatchSellTradesLoading).toBe(false);
    expect(result.current.isNetworkFeeUnavailable).toBe(true);
    expect(result.current.networkFee.formattedFiat).toBe('-');
  });

  it('marks quote rows below the warning threshold as safe', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.049',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        priceImpact: '0.049',
        isHighPriceImpact: false,
      }),
    );
  });

  it('marks quote rows at the warning threshold as high price impact', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.05',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        priceImpact: '0.05',
        isHighPriceImpact: true,
      }),
    );
  });

  it('falls back to the default warning threshold when the flag is absent', () => {
    jest.spyOn(bridgeSlice, 'selectBridgeFeatureFlags').mockReturnValue({
      ...mockBridgeFeatureFlags,
      // @ts-expect-error - mocking an invalid payload
      priceImpactThreshold: {},
    });
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.05',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId].isHighPriceImpact).toBe(true);
  });

  it('matches recommended quotes by source asset id instead of array index', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        receivedAmountFiat: '$123.45',
      }),
    );
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '77 USDC',
        receivedAmountFiat: '$77.89',
      }),
    );
  });

  it('hides stale quotes when their destination does not match the selected stablecoin', () => {
    jest
      .spyOn(bridgeSlice, 'selectBatchSellDestToken')
      .mockReturnValue(usdcToken);
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', undefined, usdtToken),
        buildMockRecommendedQuote(uniToken, '77', '77.89', usdtToken),
      ],
      totalReceived: { amount: '200', valueInCurrency: '201.34', usd: '0' },
      minimumReceived: { amount: '190', valueInCurrency: '191.23', usd: '0' },
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSummaryLoading).toBe(true);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('-- USDC');
    expect(result.current.totalReceived.formattedFiat).toBe('-');
    expect(result.current.minimumReceived.formatted).toBe('-- USDC');
    expect(result.current.networkFee.formatted).toBe('-- ETH');
    expect(result.current.networkFee.formattedFiat).toBe('-');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        receivedAmount: '-- USDC',
        receivedAmountFiat: '-',
        isQuoteUnavailable: false,
      }),
      [uniAssetId]: expect.objectContaining({
        receivedAmount: '-- USDC',
        receivedAmountFiat: '-',
        isQuoteUnavailable: false,
      }),
    });
  });

  it('marks rows without recommended quotes as unavailable after loading', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        null,
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(false);
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith([mockBatchSellQuotes.recommendedQuotes[0]], false);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '-- USDC',
        receivedAmountFiat: '-',
        isLoading: false,
        isQuoteUnavailable: true,
      }),
    );
  });

  it('shows streamed row data and progressive totals while other rows are loading', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      isLoading: true,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        null,
      ],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('123 USDC');
    expect(result.current.totalReceived.formattedFiat).toBe('$123.45');
    expect(result.current.minimumReceived.formatted).toBe('123 USDC');
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).not.toHaveBeenCalled();
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        isLoading: false,
        isQuoteUnavailable: false,
      }),
    );
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isLoading: true,
        isQuoteUnavailable: false,
      }),
    );
  });

  it('clears pending rows when every selected token has a quote while still loading', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      isLoading: true,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(false);
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith(mockBatchSellQuotes.recommendedQuotes, false);
  });

  it('hides stale quotes when a refresh starts and reveals new streamed quotes progressively', () => {
    const { result, rerender } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('200 USDC');

    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      isLoading: true,
    });

    rerender({});

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isSummaryLoading).toBe(true);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('-- USDC');
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        isLoading: true,
      }),
    );

    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      isLoading: true,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '125', '125.45'),
        null,
      ],
    });

    rerender({});

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.totalReceived.formatted).toBe('125 USDC');
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        receivedAmount: '125 USDC',
        isLoading: false,
      }),
    );
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        isLoading: true,
      }),
    );
  });

  it('keeps the batch loading before initial quote results arrive', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [],
      totalReceived: { amount: '0', valueInCurrency: '0', usd: '0' },
      minimumReceived: { amount: '0', valueInCurrency: '0', usd: '0' },
      isLoading: true,
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSummaryLoading).toBe(true);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.totalReceived.formattedFiat).toBe('-');
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'ETH',
        isLoading: true,
        isQuoteUnavailable: false,
      }),
    );
  });

  it('keeps the batch loading when quote results do not match selected tokens', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      isLoading: true,
      recommendedQuotes: [buildMockRecommendedQuote(ethToken, '123', '123.45')],
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(true);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isLoading: true,
        isQuoteUnavailable: false,
      }),
    );
  });

  it('passes the normalized source chain ID to selectShouldUseSmartTransaction', () => {
    jest
      .spyOn(bridgeSlice, 'selectBatchSellSourceTokens')
      .mockReturnValue([{ ...ethToken, chainId: '0x1' as Hex }]);

    renderHook(() => useBatchSellQuoteData());

    expect(mockGetMaybeHexChainId).toHaveBeenCalledWith('0x1');
    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      expect.anything(),
      '0x1',
    );
  });

  it('passes undefined chain ID to selectShouldUseSmartTransaction when there are no source tokens', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellSourceTokens').mockReturnValue([]);

    renderHook(() => useBatchSellQuoteData());

    expect(mockGetMaybeHexChainId).toHaveBeenCalledWith(undefined);
    expect(mockSelectShouldUseSmartTransaction).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });

  it('marks the quote set unavailable when no rows have quotes', () => {
    jest.spyOn(bridgeSlice, 'selectBatchSellQuotes').mockReturnValue({
      ...mockBatchSellQuotes,
      recommendedQuotes: [null, null],
      totalReceived: { amount: '0', valueInCurrency: '0', usd: '0' },
      minimumReceived: { amount: '0', valueInCurrency: '0', usd: '0' },
    });

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isSummaryLoading).toBe(false);
    expect(result.current.hasPendingQuoteRows).toBe(false);
    expect(result.current.totalReceived.formattedFiat).toBe('-');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        tokenSymbol: 'ETH',
        quote: null,
        isLoading: false,
        isQuoteUnavailable: true,
      }),
      [uniAssetId]: expect.objectContaining({
        tokenSymbol: 'UNI',
        quote: null,
        isLoading: false,
        isQuoteUnavailable: true,
      }),
    });
  });
});
