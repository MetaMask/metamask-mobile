import { renderHook } from '@testing-library/react-native';
import { CaipAssetType, Hex } from '@metamask/utils';

import Engine from '../../../../../core/Engine';
import { BridgeToken } from '../../types';
import { useBatchSellQuoteData } from '.';

jest.mock('../useBatchSellQuoteRequest', () => ({
  getBatchSellAtomicSourceAmount: jest.fn(
    (_token: BridgeToken, sourceAmount?: string) =>
      sourceAmount && Number(sourceAmount) > 0 ? '1' : undefined,
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
  valueInCurrency: string | null,
  destinationToken: BridgeToken = usdcToken,
  priceData?: { priceImpact?: string },
  quoteId = `${sourceToken.symbol}-${destinationToken.symbol}-${amount}`,
) {
  return {
    quoteId,
    quote: {
      requestId: quoteId,
      srcAsset: { address: sourceToken.address },
      srcChainId: Number(sourceToken.chainId),
      destAsset: {
        address: destinationToken.address,
        symbol: destinationToken.symbol,
      },
      destChainId: Number(destinationToken.chainId),
      ...(priceData ? { priceData } : {}),
    },
    toTokenAmount: { amount, valueInCurrency },
  };
}

type MockRecommendedQuote = ReturnType<typeof buildMockRecommendedQuote>;

const ethNetworkFeeAsset = {
  symbol: 'ETH',
};

let mockSelectedTokens: BridgeToken[] = [ethToken, uniToken];
let mockSelectedDestinationToken: BridgeToken | undefined = usdcToken;
let mockBatchSellSourceTokenAmounts: Partial<
  Record<CaipAssetType, string | undefined>
> = {
  [ethAssetId]: '1',
  [uniAssetId]: '2',
};
let mockBatchSellQuotes: {
  recommendedQuotes: (MockRecommendedQuote | null)[];
  totalReceived: { amount: string; valueInCurrency: string | null };
  minimumReceived: { amount: string; valueInCurrency: string | null };
  isLoading: boolean;
  quotesLastFetchedMs?: number;
} = {
  recommendedQuotes: [
    buildMockRecommendedQuote(ethToken, '123', '123.45'),
    buildMockRecommendedQuote(uniToken, '77', '77.89'),
  ],
  totalReceived: { amount: '200', valueInCurrency: '201.34' },
  minimumReceived: { amount: '190', valueInCurrency: '191.23' },
  isLoading: false,
};
let mockBatchSellTrades: {
  totalNetworkFee:
    | {
        amount: string;
        valueInCurrency: string | null;
        asset: typeof ethNetworkFeeAsset;
      }
    | undefined;
  isBatchSellTradeAvailable: boolean;
} = {
  totalNetworkFee: {
    amount: '1.2',
    valueInCurrency: '1.25',
    asset: ethNetworkFeeAsset,
  },
  isBatchSellTradeAvailable: true,
};
let mockBridgeFeatureFlags: {
  priceImpactThreshold?: { warning?: number };
} = {
  priceImpactThreshold: { warning: 0.05 },
};

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
}));

jest.mock('../../../../../core/redux/slices/bridge', () => ({
  selectBatchSellDestToken: jest.fn(() => mockSelectedDestinationToken),
  selectBatchSellQuotes: jest.fn(() => mockBatchSellQuotes),
  selectBatchSellSlippages: jest.fn(() => ({})),
  selectBatchSellSourceTokenAmounts: jest.fn(
    () => mockBatchSellSourceTokenAmounts,
  ),
  selectBatchSellSourceTokens: jest.fn(() => mockSelectedTokens),
  selectBatchSellTrades: jest.fn(() => mockBatchSellTrades),
  selectBridgeFeatureFlags: jest.fn(() => mockBridgeFeatureFlags),
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

describe('useBatchSellQuoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSelectedTokens = [ethToken, uniToken];
    mockSelectedDestinationToken = usdcToken;
    mockBatchSellSourceTokenAmounts = {
      [ethAssetId]: '1',
      [uniAssetId]: '2',
    };
    mockBatchSellQuotes = {
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
      totalReceived: { amount: '200', valueInCurrency: '201.34' },
      minimumReceived: { amount: '190', valueInCurrency: '191.23' },
      isLoading: false,
    };
    mockBatchSellTrades = {
      totalNetworkFee: {
        amount: '1.2',
        valueInCurrency: '1.25',
        asset: ethNetworkFeeAsset,
      },
      isBatchSellTradeAvailable: true,
    };
    mockBridgeFeatureFlags = {
      priceImpactThreshold: { warning: 0.05 },
    };
  });

  it('formats complete Batch Sell quote data', () => {
    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalReceived).toBe('200 USDC');
    expect(result.current.totalReceivedFiat).toBe('$201.34');
    expect(result.current.minimumReceived).toBe('190 USDC');
    expect(result.current.networkFeeIsLoading).toBe(false);
    expect(result.current.networkFee).toBe('1.2 ETH');
    expect(result.current.networkFeeFiat).toBe('$1.25');
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledWith(mockBatchSellQuotes.recommendedQuotes);
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        key: ethAssetId,
        tokenSymbol: 'ETH',
        receivedAmount: '123 USDC',
        receivedAmountFiat: '$123.45',
        isHighPriceImpact: false,
        isQuoteUnavailable: false,
      }),
      [uniAssetId]: expect.objectContaining({
        key: uniAssetId,
        tokenSymbol: 'UNI',
        receivedAmount: '77 USDC',
        receivedAmountFiat: '$77.89',
        isHighPriceImpact: false,
        isQuoteUnavailable: false,
      }),
    });
  });

  it('does not fetch Batch Sell trades again for the same quote ids', () => {
    const { rerender } = renderHook(() => useBatchSellQuoteData());

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(1);

    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [...mockBatchSellQuotes.recommendedQuotes],
    };

    rerender({});

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(1);
  });

  it('fetches Batch Sell trades again when the recommended quote id changes', () => {
    const { rerender } = renderHook(() => useBatchSellQuoteData());

    const [firstQuote, secondQuote] = mockBatchSellQuotes.recommendedQuotes;
    mockBatchSellQuotes = {
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
    };

    rerender({});

    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).toHaveBeenCalledTimes(2);
  });

  it('falls back to destination token amounts when display currency values are unavailable', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', null),
        buildMockRecommendedQuote(uniToken, '77', null),
      ],
      totalReceived: { amount: '200', valueInCurrency: '0' },
    };
    mockBatchSellTrades = {
      ...mockBatchSellTrades,
      totalNetworkFee: {
        amount: '1.2',
        valueInCurrency: '',
        asset: ethNetworkFeeAsset,
      },
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.totalReceivedFiat).toBe('200 USDC');
    expect(result.current.networkFee).toBe('1.2 ETH');
    expect(result.current.networkFeeFiat).toBe('-');
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
    mockBatchSellTrades = {
      totalNetworkFee: undefined,
      isBatchSellTradeAvailable: false,
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.networkFee).toBe('--');
    expect(result.current.networkFeeIsLoading).toBe(true);
    expect(result.current.networkFeeFiat).toBe('-');
  });

  it('marks quote rows below the warning threshold as safe', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.049',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        priceImpact: '0.049',
        isHighPriceImpact: false,
      }),
    );
  });

  it('marks quote rows at the warning threshold as high price impact', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.05',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        priceImpact: '0.05',
        isHighPriceImpact: true,
      }),
    );
  });

  it('falls back to the default warning threshold when the flag is absent', () => {
    mockBridgeFeatureFlags = { priceImpactThreshold: {} };
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45', usdcToken, {
          priceImpact: '0.05',
        }),
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.tokenData[ethAssetId].isHighPriceImpact).toBe(true);
  });

  it('matches recommended quotes by source asset id instead of array index', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(uniToken, '77', '77.89'),
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
      ],
    };

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
    mockSelectedDestinationToken = usdcToken;
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', null, usdtToken),
        buildMockRecommendedQuote(uniToken, '77', '77.89', usdtToken),
      ],
      totalReceived: { amount: '200', valueInCurrency: '201.34' },
      minimumReceived: { amount: '190', valueInCurrency: '191.23' },
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.totalReceived).toBe('-- USDC');
    expect(result.current.totalReceivedFiat).toBe('-');
    expect(result.current.minimumReceived).toBe('-- USDC');
    expect(result.current.networkFee).toBe('-- ETH');
    expect(result.current.networkFeeFiat).toBe('-');
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
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        null,
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        receivedAmount: '-- USDC',
        receivedAmountFiat: '-',
        isQuoteUnavailable: true,
      }),
    );
  });

  it('keeps missing quote rows available for batch-level loading while quotes are loading', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      isLoading: true,
      recommendedQuotes: [
        buildMockRecommendedQuote(ethToken, '123', '123.45'),
        null,
      ],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(
      Engine.context.BridgeController.updateBatchSellTrades,
    ).not.toHaveBeenCalled();
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isQuoteUnavailable: false,
      }),
    );
  });

  it('keeps the batch loading before initial quote results arrive', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [],
      totalReceived: { amount: '0', valueInCurrency: null },
      minimumReceived: { amount: '0', valueInCurrency: null },
      isLoading: false,
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.totalReceivedFiat).toBe('-');
    expect(result.current.tokenData[ethAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'ETH',
        isQuoteUnavailable: false,
      }),
    );
  });

  it('keeps the batch loading when quote results do not match selected tokens', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [buildMockRecommendedQuote(ethToken, '123', '123.45')],
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(true);
    expect(result.current.isLoading).toBe(true);
    expect(result.current.tokenData[uniAssetId]).toEqual(
      expect.objectContaining({
        tokenSymbol: 'UNI',
        isQuoteUnavailable: false,
      }),
    );
  });

  it('marks the quote set unavailable when no rows have quotes', () => {
    mockBatchSellQuotes = {
      ...mockBatchSellQuotes,
      recommendedQuotes: [null, null],
      totalReceived: { amount: '0', valueInCurrency: null },
      minimumReceived: { amount: '0', valueInCurrency: null },
    };

    const { result } = renderHook(() => useBatchSellQuoteData());

    expect(result.current.hasAnyQuote).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.totalReceivedFiat).toBe('-');
    expect(result.current.tokenData).toEqual({
      [ethAssetId]: expect.objectContaining({
        tokenSymbol: 'ETH',
        isQuoteUnavailable: true,
      }),
      [uniAssetId]: expect.objectContaining({
        tokenSymbol: 'UNI',
        isQuoteUnavailable: true,
      }),
    });
  });
});
