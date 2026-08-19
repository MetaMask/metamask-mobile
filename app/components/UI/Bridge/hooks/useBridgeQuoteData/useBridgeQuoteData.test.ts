import { act, renderHook, waitFor } from '@testing-library/react-native';
import {
  RequestStatus,
  getNativeAssetForChainId,
  isSolanaChainId,
} from '@metamask/bridge-controller';
import { SolScope } from '@metamask/keyring-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { BigNumber } from 'ethers';
import { merge } from 'lodash';

import AppConstants from '../../../../../core/AppConstants';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeSlice from '../../../../../core/redux/slices/bridge';
import type { BridgeState } from '../../../../../core/redux/slices/bridge';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as quoteUtils from '../../utils/quoteUtils';
import { useBridgeQuoteData } from '.';

const mockDispatch = jest.fn();

jest.mock('react-redux', () => ({
  useSelector: (selector: (state: unknown) => unknown) => selector({}),
  useDispatch: () => mockDispatch,
}));

jest.mock('../../../../../selectors/currencyRateController', () => ({
  selectCurrentCurrency: () => 'USD',
}));

const defaultSelectBridgeQuotesResults: ReturnType<
  typeof bridgeSlice.selectBridgeQuotes
> = {
  recommendedQuote: mockQuoteWithMetadata,
  sortedQuotes: [mockQuoteWithMetadata],
  activeQuote: mockQuoteWithMetadata,
  quotesLastFetchedMs: Date.now(),
  isLoading: false,
  quoteFetchError: null,
  quotesRefreshCount: 0,
  isQuoteGoingToRefresh: false,
  quotesInitialLoadTimeMs: 0,
};

// Mock useValidateBridgeTx hook
const mockValidateBridgeTx = jest.fn();
jest.mock('../../../../../util/bridge/hooks/useValidateBridgeTx', () => ({
  __esModule: true,
  default: () => ({
    validateBridgeTx: mockValidateBridgeTx,
  }),
}));

// Mock useIsInsufficientBalance hook
const mockUseIsInsufficientBalance = jest.fn();
jest.mock('../useInsufficientBalance', () => ({
  __esModule: true,
  default: (params: unknown) => mockUseIsInsufficientBalance(params),
}));

// Mock Engine context
jest.mock('../../../../../core/Engine', () => ({
  context: {
    NetworkController: {
      findNetworkClientIdByChainId: jest.fn(() => 'mainnet'),
      getNetworkClientById: jest.fn(() => ({
        configuration: {
          chainId: '0x1',
        },
      })),
    },
  },
}));

// Mock getProviderByChainId
jest.mock('../../../../../util/notifications/methods/common', () => ({
  getProviderByChainId: jest.fn(() => ({
    getBalance: jest.fn().mockResolvedValue('1000000000000000000'),
  })),
}));

type QuoteDataState = {
  bridgeReducerOverrides?: Partial<BridgeState>;
  bridgeControllerOverrides?: {
    quotesLoadingStatus?: RequestStatus | null;
    quoteFetchError?: string | null;
    quotesLastFetched?: number | null;
    quotesRefreshCount?: number;
    quoteStreamComplete?: ReturnType<
      typeof bridgeSlice.selectQuoteStreamComplete
    >;
    quotes?: unknown;
  };
};

const createBridgeTestState = (
  overrides: QuoteDataState = {},
): QuoteDataState => overrides;

const applyQuoteDataState = ({
  bridgeReducerOverrides = {},
  bridgeControllerOverrides = {},
}: QuoteDataState = {}) => {
  const bridge = { ...mockBridgeReducerState, ...bridgeReducerOverrides };
  const sourceIsSolana = Boolean(
    bridge.sourceToken?.chainId && isSolanaChainId(bridge.sourceToken.chainId),
  );
  const destIsSolana = Boolean(
    bridge.destToken?.chainId && isSolanaChainId(bridge.destToken.chainId),
  );

  jest
    .spyOn(bridgeSlice, 'selectSourceToken')
    .mockReturnValue(bridge.sourceToken);
  jest.spyOn(bridgeSlice, 'selectDestToken').mockReturnValue(bridge.destToken);
  const selectSourceAmountSpy = jest
    .spyOn(bridgeSlice, 'selectSourceAmount')
    .mockReturnValue(bridge.sourceAmount);
  jest.spyOn(bridgeSlice, 'selectSlippage').mockReturnValue(bridge.slippage);
  jest
    .spyOn(bridgeSlice, 'selectIsSubmittingTx')
    .mockReturnValue(bridge.isSubmittingTx);
  jest
    .spyOn(bridgeSlice, 'selectSelectedQuoteRequestId')
    .mockReturnValue(bridge.selectedQuoteRequestId);
  jest.spyOn(bridgeSlice, 'selectBridgeControllerState').mockReturnValue({
    quoteFetchError: bridgeControllerOverrides.quoteFetchError ?? null,
    quotesLoadingStatus: bridgeControllerOverrides.quotesLoadingStatus ?? null,
    quotesLastFetched: bridgeControllerOverrides.quotesLastFetched,
    quotesRefreshCount: bridgeControllerOverrides.quotesRefreshCount ?? 0,
  } as ReturnType<typeof bridgeSlice.selectBridgeControllerState>);
  jest
    .spyOn(bridgeSlice, 'selectQuoteStreamComplete')
    .mockReturnValue(
      (bridgeControllerOverrides.quoteStreamComplete as ReturnType<
        typeof bridgeSlice.selectQuoteStreamComplete
      >) ?? null,
    );
  jest
    .spyOn(bridgeSlice, 'selectIsSolanaSwap')
    .mockReturnValue(sourceIsSolana && destIsSolana);
  jest
    .spyOn(bridgeSlice, 'selectIsSolanaToNonSolana')
    .mockReturnValue(sourceIsSolana && !destIsSolana);

  return { selectSourceAmountSpy };
};

const renderUseBridgeQuoteData = (
  overrides: QuoteDataState = {},
  hookOptions?: Parameters<typeof useBridgeQuoteData>[0],
) => {
  const { selectSourceAmountSpy } = applyQuoteDataState(overrides);
  return {
    ...renderHook(() => useBridgeQuoteData(hookOptions)),
    selectSourceAmountSpy,
  };
};

describe('useBridgeQuoteData', () => {
  let isQuoteExpired: jest.SpyInstance;
  let shouldRefreshQuote: jest.SpyInstance;
  let selectBridgeQuotes: jest.SpyInstance;
  let selectBridgeFeatureFlags: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    selectBridgeFeatureFlags = jest
      .spyOn(bridgeSlice, 'selectBridgeFeatureFlags')
      .mockImplementation(() => ({
        minimumVersion: '7.58.0',
        priceImpactThreshold: {
          gasless: 0.4,
          normal: 0.19,
          warning: 0.05,
          error: 0.25,
        },
        refreshRate: 5000,
        maxRefreshCount: 10,
        support: true,
        chains: {},
      }));
    selectBridgeQuotes = jest
      .spyOn(bridgeSlice, 'selectBridgeQuotes')
      .mockImplementation(jest.fn());
    isQuoteExpired = jest
      .spyOn(quoteUtils, 'isQuoteExpired')
      .mockReturnValue(false);
    jest.spyOn(quoteUtils, 'getQuoteRefreshRate').mockReturnValue(5000);
    shouldRefreshQuote = jest
      .spyOn(quoteUtils, 'shouldRefreshQuote')
      .mockReturnValue(false);
    mockUseIsInsufficientBalance.mockReturnValue(false);
    mockValidateBridgeTx.mockResolvedValue({ status: 'SUCCESS' });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns quote data when quotes are available', () => {
    // Set up mock for this specific test
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const bridgeControllerOverrides = {
      quotes: mockQuotes,
      quotesLoadingStatus: null,
      quoteFetchError: null,
    };

    // Source/dest must match the Solana quote (chain + address) for pair match / amounts
    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current).toEqual({
      activeQuote: mockQuoteWithMetadata,
      bestQuote: mockQuoteWithMetadata,
      destTokenAmount: '57.056221',
      formattedQuoteData: {
        networkFee: '-',
        estimatedTime: '5 seconds',
        rate: '1 SOL = 0.0000000000000000571 USDC',
        priceImpact: '-0.20%',
        priceImpactFiat: undefined,
        slippage: 'Auto',
      },
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      needsNewQuote: false,
      shouldShowPriceImpactWarning: false,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [mockQuoteWithMetadata],
      isActiveQuoteForCurrentTokenPair: true,
    });
  });

  it.each([
    [true, false, false],
    [false, true, false],
    [false, false, false],
  ])(
    'returns shouldShowPriceImpactWarning=false when priceImpact does not meet warning threshold regardless of gasIncluded=%s and gasIncluded7702=%s',
    (gasIncluded, gasIncluded7702, shouldShowPriceImpactWarning) => {
      // Set up mock for this specific test
      const quote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          priceData: { priceImpact: { amount: '0.04' } },
          gasIncluded,
          gasIncluded7702,
        },
      };
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        activeQuote: quote,
        sortedQuotes: [quote],
        recommendedQuote: quote,
      }));

      const bridgeControllerOverrides = {
        quotesLoadingStatus: null,
        quoteFetchError: null,
      };

      const testState = createBridgeTestState({
        bridgeControllerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(
        result.current.activeQuote?.quote.priceData?.priceImpact?.amount,
      ).toEqual('0.04');
      // priceImpact 0.04 (4%) < warning threshold 0.05 (5%) → shouldShowPriceImpactWarning is false
      expect(result.current.shouldShowPriceImpactWarning).toEqual(
        shouldShowPriceImpactWarning,
      );
    },
  );

  it('returns shouldShowPriceImpactWarning=true when priceImpact meets the warning threshold', () => {
    const quote = {
      ...mockQuoteWithMetadata,
      quote: {
        ...mockQuoteWithMetadata.quote,
        priceData: { priceImpact: { amount: '0.05' } },
      },
    };
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: quote,
      activeQuote: quote,
      sortedQuotes: [quote],
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: null,
        quoteFetchError: null,
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    // priceImpact '5' >= warning threshold 5 → shouldShowPriceImpactWarning is true
    expect(result.current.shouldShowPriceImpactWarning).toBe(true);
  });

  it('falls back to AppConstants warning threshold when feature flags warning is absent', () => {
    selectBridgeFeatureFlags.mockImplementation(() => ({
      minimumVersion: '7.58.0',
      priceImpactThreshold: {
        gasless: 0.4,
        normal: 0.19,
        // warning absent — should fall back to AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD
        error: 0.25,
      },
    }));

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          priceData: {
            priceImpact: {
              amount: String(
                AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD,
              ),
            },
          },
        },
      },
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotesLoadingStatus: null,
        quoteFetchError: null,
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    // priceImpact meets AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD → true
    expect(result.current.shouldShowPriceImpactWarning).toBe(true);
  });

  it('returns empty state when no quotes exist', () => {
    // Set up mock for this specific test
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const bridgeControllerOverrides = {
      quotes: [],
      quotesLoadingStatus: RequestStatus.FETCHED,
      quotesLastFetched: 123,
      quoteFetchError: null,
      quoteStreamComplete: { hasQuotes: false, quoteCount: 0 },
    };

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current).toEqual({
      activeQuote: null,
      bestQuote: null,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: true,
      isExpired: false,
      needsNewQuote: false,
      willRefresh: false,
      blockaidError: null,
      shouldShowPriceImpactWarning: false,
      quotesLoadingStatus: RequestStatus.FETCHED,
      validQuotes: [],
      isActiveQuoteForCurrentTokenPair: false,
    });
  });

  it('isNoQuotesAvailable is false when quoteStreamComplete is null', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotes: [],
        quotesLoadingStatus: RequestStatus.LOADING,
        quotesLastFetched: null,
        quoteFetchError: null,
        quoteStreamComplete: null,
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.isNoQuotesAvailable).toBe(false);
  });

  it('isNoQuotesAvailable is false when quoteStreamComplete.hasQuotes is true', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotes: [],
        quotesLoadingStatus: RequestStatus.FETCHED,
        quotesLastFetched: 123,
        quoteFetchError: null,
        quoteStreamComplete: { hasQuotes: true, quoteCount: 3 },
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.isNoQuotesAvailable).toBe(false);
  });

  it('returns undefined destTokenAmount when quote destAsset does not match selected destToken', () => {
    // Set up mock with a quote for a different destination token (ETH) than what's selected (USDC)
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata, // This quote is for Solana USDC
    }));

    const bridgeControllerOverrides = {
      quotes: mockQuotes,
      quotesLoadingStatus: null,
      quoteFetchError: null,
    };

    // Selected destToken is ETH on mainnet, which doesn't match the quote's destAsset (Solana USDC)
    // This simulates the race condition when user changes destination token
    const bridgeReducerOverrides = {
      destToken: {
        symbol: 'ETH',
        chainId: CHAIN_IDS.MAINNET,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
    };

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    // destTokenAmount should be undefined because quote's destAsset doesn't match selected destToken
    // This prevents showing incorrect amounts when switching destination tokens
    expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
    expect(result.current.destTokenAmount).toBeUndefined();
  });

  it('isActiveQuoteForCurrentTokenPair is false when stale quote dest does not match selected destToken', () => {
    // Regression guard: after changing the destination token, the bridge controller
    // keeps the old quote in state until the first new quote arrives. The confirm
    // button must stay disabled during this window.
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata, // quote is for Solana USDC
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotes: mockQuotes,
        quotesLoadingStatus: RequestStatus.LOADING,
        quoteFetchError: null,
      },
      bridgeReducerOverrides: {
        destToken: {
          symbol: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
          address: '0x0000000000000000000000000000000000000000',
          decimals: 18,
        },
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(false);
  });

  it('isActiveQuoteForCurrentTokenPair is true when active quote matches both selected tokens', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides: {
        quotes: mockQuotes,
        quotesLoadingStatus: null,
        quoteFetchError: null,
      },
      bridgeReducerOverrides: {
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
  });

  it('serves cached quotes when expired and not refreshing', () => {
    // Set up mock for this specific test
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
      quotesRefreshCount: 1,
      isQuoteGoingToRefresh: false,
      quotesInitialLoadTimeMs: 0,
      quotesLastFetchedMs: Date.now() - 10000000000,
    }));

    isQuoteExpired.mockReturnValueOnce(true);

    const bridgeControllerOverrides = {
      quotes: mockQuotes,
      quotesLoadingStatus: null,
      quoteFetchError: null,
    };

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    // When expired but not loading, the hook serves the last known Redux quotes
    // as a cache so the UI can keep displaying them until the user requests a
    // fresh fetch via "Get new quote".
    expect(result.current).toEqual({
      activeQuote: mockQuoteWithMetadata,
      bestQuote: mockQuoteWithMetadata,
      destTokenAmount: undefined,
      formattedQuoteData: {
        estimatedTime: '5 seconds',
        networkFee: '-',
        priceImpact: '-0.20%',
        priceImpactFiat: undefined,
        rate: '--',
        slippage: 'Auto',
      },
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      shouldShowPriceImpactWarning: false,
      isExpired: true,
      needsNewQuote: true,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [],
      isActiveQuoteForCurrentTokenPair: false,
    });
  });

  it('displays loading state while fetching quotes', () => {
    const bridgeControllerOverrides = {
      quotesLoadingStatus: RequestStatus.LOADING,
      quoteFetchError: null,
    };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current).toEqual({
      activeQuote: null,
      bestQuote: null,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: true,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      needsNewQuote: false,
      shouldShowPriceImpactWarning: false,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: RequestStatus.LOADING,
      validQuotes: [],
      isActiveQuoteForCurrentTokenPair: false,
    });
  });

  it('displays error state when quote fetch fails', () => {
    const error = 'Failed to fetch quotes';
    const bridgeControllerOverrides = {
      quotesLoadingStatus: null,
      quoteFetchError: error,
    };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current).toEqual({
      activeQuote: null,
      bestQuote: null,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      shouldShowPriceImpactWarning: false,
      isLoading: false,
      quoteFetchError: error,
      isNoQuotesAvailable: false,
      isExpired: false,
      needsNewQuote: false,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [],
      isActiveQuoteForCurrentTokenPair: false,
    });
  });

  it('returns undefined when activeQuote is undefined', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: null,
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe(undefined);
  });

  it('returns "-" when totalNetworkFee is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee amount is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          feeData: {
            ...mockQuoteWithMetadata.quote.feeData,
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: undefined,
                valueInCurrency: '10',
              },
            ],
          },
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee valueInCurrency is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: '0.01',
              },
            ],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('formats network fee with fiat formatter for normal values', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: '0.01',
                valueInCurrency: '10',
              },
            ],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('$10');
  });

  it('formats network fee as "<$0.01" when value is less than 0.01', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: '0.0001',
                valueInCurrency: '0.005',
              },
            ],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('<$0.01');
  });

  it('formats network fee as "$0.01" when value is 0.01', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: '0.0001',
                valueInCurrency: '0.01',
              },
            ],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('$0.01');
  });

  it('formats network fee as "$0" when value is 0', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: merge({}, mockQuoteWithMetadata, {
        quote: {
          feeData: {
            network: [
              {
                amount: '0',
                asset: mockQuoteWithMetadata.quote.dest.asset,
                normalizedAmount: '0',
                valueInCurrency: '0',
              },
            ],
          },
        },
      }),
    }));

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.networkFee).toBe('$0');
  });

  // Additional coverage tests

  it('keeps blockaidError null when validateBridgeTx throws a network error', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockRejectedValue(new Error('Network error'));

    const testState = createBridgeTestState({
      bridgeReducerOverrides: {
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address: '11111111111111111111111111111112',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      },
    });

    const { result } = renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(mockValidateBridgeTx).toHaveBeenCalled();
    });
    expect(result.current.blockaidError).toBe(null);
  });

  it('returns "--" rate when sourceAmount is zero', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const bridgeReducerOverrides = {
      sourceAmount: '0',
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.rate).toBe('--');
  });

  it('formats slippage as "Auto" when slippage is undefined', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const bridgeReducerOverrides = {
      slippage: undefined,
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    expect(result.current.formattedQuoteData?.slippage).toBe('Auto');
  });

  it('passes latestSourceAtomicBalance to useIsInsufficientBalance', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const latestBalance = BigNumber.from('1000000000000000000');
    mockUseIsInsufficientBalance.mockReturnValue(false);

    const testState = createBridgeTestState({});

    const { result } = renderUseBridgeQuoteData(testState, {
      latestSourceAtomicBalance: latestBalance,
    });

    expect(mockUseIsInsufficientBalance).toHaveBeenCalledWith({
      amount: '1000000000000000000',
      token: expect.objectContaining({
        address: expect.any(String),
        decimals: expect.any(Number),
        symbol: expect.any(String),
      }),
      latestAtomicBalance: latestBalance,
    });

    expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
  });

  // Validation logic coverage
  it('keeps blockaidError null when Solana validateBridgeTx succeeds', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockResolvedValue({
      status: 'SUCCESS',
    });

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(null);
    });

    expect(mockValidateBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuote,
      signal: expect.any(AbortSignal),
    });
  });

  it('sets blockaidError from error_details when Solana-to-EVM validateBridgeTx returns ERROR', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockResolvedValue({
      status: 'ERROR',
      result: {
        validation: {
          reason: 'Transaction validation failed',
        },
      },
      error_details: {
        message: 'transaction contains suspicious activity',
      },
    });

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'ETH',
        chainId: CHAIN_IDS.MAINNET,
        address: '0x0000000000000000000000000000000000000000',
        decimals: 18,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(
        'The transaction contains suspicious activity.',
      );
    });
  });

  it('sets blockaidError from validation.reason when error_details is absent', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockResolvedValue({
      status: 'ERROR',
      result: {
        validation: {
          reason: 'Fallback validation error',
        },
      },
    });

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(result.current.blockaidError).toBe('Fallback validation error');
    });
  });

  it('keeps blockaidError null when validateBridgeTx throws a network timeout', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockRejectedValue(new Error('Network timeout'));

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(mockValidateBridgeTx).toHaveBeenCalled();
    });
    expect(result.current.blockaidError).toBe(null);
  });

  it('retries validation for the same requestId after validation throws', async () => {
    const consoleErrorSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(jest.fn());
    const requestId = 'same-request-id';
    const firstMockQuote = {
      ...mockQuoteWithMetadata,
      quote: {
        ...mockQuoteWithMetadata.quote,
        requestId,
      },
    };
    const secondMockQuote = {
      ...mockQuoteWithMetadata,
      quote: {
        ...mockQuoteWithMetadata.quote,
        requestId,
      },
    };
    let recommendedQuote = firstMockQuote;

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote,
    }));

    mockValidateBridgeTx
      .mockRejectedValueOnce(new Error('Network timeout'))
      .mockResolvedValueOnce({ status: 'SUCCESS' });

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { rerender, selectSourceAmountSpy } =
      renderUseBridgeQuoteData(testState);

    await waitFor(() => {
      expect(mockValidateBridgeTx).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Swaps Quote Data Validation error:',
        expect.any(Error),
      );
    });

    recommendedQuote = secondMockQuote;
    selectSourceAmountSpy.mockReturnValue('2');
    rerender({});

    await waitFor(() => {
      expect(mockValidateBridgeTx).toHaveBeenCalledTimes(2);
    });

    consoleErrorSpy.mockRestore();
  });

  it('skips validation for gas-included quotes on Solana', async () => {
    const mockQuoteWithGasIncluded = {
      ...mockQuoteWithMetadata,
      quote: {
        ...mockQuoteWithMetadata.quote,
        gasIncluded: true,
      },
    };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithGasIncluded,
    }));

    const bridgeReducerOverrides = {
      sourceToken: {
        symbol: 'SOL',
        chainId: SolScope.Mainnet,
        address: '11111111111111111111111111111112',
        decimals: 9,
      },
      destToken: {
        symbol: 'USDC',
        chainId: SolScope.Mainnet,
        address:
          'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        decimals: 6,
      },
    };

    const testState = createBridgeTestState({
      bridgeReducerOverrides,
    });

    const { result } = renderUseBridgeQuoteData(testState);

    // Wait for the hook to stabilize
    await waitFor(() => {
      expect(result.current.activeQuote).toEqual(mockQuoteWithGasIncluded);
    });

    // Verify that validateBridgeTx was never called for gas-included quotes
    expect(mockValidateBridgeTx).not.toHaveBeenCalled();

    // Verify that no blockaid error is set
    expect(result.current.blockaidError).toBe(null);
  });

  // Test validQuotes filtering
  describe('validQuotes filtering', () => {
    it('returns filtered validQuotes that match destination token', () => {
      const mockQuote1 = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          dest: {
            ...mockQuoteWithMetadata.quote.dest,
            asset: {
              ...mockQuoteWithMetadata.quote.dest.asset,
              assetId:
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            },
          },
        },
      };

      const mockQuote2 = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          dest: {
            ...mockQuoteWithMetadata.quote.dest,
            asset: {
              ...mockQuoteWithMetadata.quote.dest.asset,
              assetId: getNativeAssetForChainId(1151111081099710).assetId,
            },
          },
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuote1,
        sortedQuotes: [mockQuote1, mockQuote2],
      }));

      const bridgeReducerOverrides = {
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.validQuotes).toHaveLength(1);
      expect(result.current.validQuotes[0]).toEqual(mockQuote1);
    });

    it('returns empty validQuotes array when quotes are expired and not refreshing', () => {
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [mockQuoteWithMetadata],
      }));

      isQuoteExpired.mockReturnValueOnce(true);
      shouldRefreshQuote.mockReturnValueOnce(false);

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.validQuotes).toEqual([]);
      expect(result.current.isExpired).toBe(true);
    });

    it('returns empty validQuotes when isSubmittingTx is true', () => {
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [mockQuoteWithMetadata],
      }));

      isQuoteExpired.mockReturnValueOnce(true);

      const bridgeReducerOverrides = {
        isSubmittingTx: true,
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.validQuotes).toEqual([]);
    });
  });

  // Test isQuoteSourceTokenMatch
  describe('source token matching', () => {
    it('returns undefined destTokenAmount when quote source token does not match selected source token', () => {
      const mockQuoteWithDifferentSource = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          src: {
            ...mockQuoteWithMetadata.quote.src,
            asset: {
              ...mockQuoteWithMetadata.quote.src.asset,
              assetId:
                'eip155:1/erc20:0x1111111111111111111111111111111111111111',
            },
          },
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithDifferentSource,
      }));

      const bridgeReducerOverrides = {
        sourceToken: {
          symbol: 'DAI',
          chainId: CHAIN_IDS.MAINNET,
          address: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
          decimals: 18,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.destTokenAmount).toBeUndefined();
    });

    it('keeps activeQuote when Solana source assetId matches selected source token', () => {
      const mockQuoteWithSolanaSource = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          src: {
            ...mockQuoteWithMetadata.quote.src,
            asset: {
              ...mockQuoteWithMetadata.quote.src.asset,
              assetId:
                'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111112',
            },
          },
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithSolanaSource,
      }));

      const bridgeReducerOverrides = {
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111112',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.activeQuote).toEqual(mockQuoteWithSolanaSource);
    });
  });

  // Test estimated time formatting
  describe('estimated time formatting', () => {
    it('formats time as "< 1 second" when less than 1 second', () => {
      const mockQuoteWithFastTime = {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 0.5,
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithFastTime,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.estimatedTime).toBe(
        '< 1 second',
      );
    });

    it('formats time as seconds when between 1 and 59 seconds', () => {
      const mockQuoteWith30Seconds = {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 30,
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWith30Seconds,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.estimatedTime).toBe(
        '30 seconds',
      );
    });

    it('formats time as minutes when 60 seconds or more', () => {
      const mockQuoteWith120Seconds = {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 120,
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWith120Seconds,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.estimatedTime).toBe('2 min');
    });

    it('rounds up minutes when formatting', () => {
      const mockQuoteWith90Seconds = {
        ...mockQuoteWithMetadata,
        estimatedProcessingTimeInSeconds: 90,
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWith90Seconds,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.estimatedTime).toBe('2 min');
    });
  });

  // Test quote rate formatting
  describe('quote rate formatting', () => {
    it('formats rate with 2 decimals when rate is greater than 1', () => {
      const mockQuoteWithHighRate = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          dest: {
            ...mockQuoteWithMetadata.quote.dest,
            amount: '2500000000',
          },
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithHighRate,
      }));

      const bridgeReducerOverrides = {
        sourceAmount: '1',
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.rate).toBe(
        '1 SOL = 2,500.0 USDC',
      );
    });

    it('formats rate with 3 significant digits when rate is less than 1', () => {
      const mockQuoteWithLowRate = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          dest: {
            ...mockQuoteWithMetadata.quote.dest,
            amount: '100000',
          },
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithLowRate,
      }));

      const bridgeReducerOverrides = {
        sourceAmount: '1',
        sourceToken: {
          symbol: 'SOL',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111111',
          decimals: 9,
        },
        destToken: {
          symbol: 'USDC',
          chainId: SolScope.Mainnet,
          address:
            'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          decimals: 6,
        },
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.formattedQuoteData?.rate).toBe('1 SOL = 0.10 USDC');
    });
  });

  describe('validation race condition handling', () => {
    it('aborts previous validation when quote changes', async () => {
      const mockQuote1 = {
        ...mockQuoteWithMetadata,
        quote: { ...mockQuoteWithMetadata.quote, requestId: 'quote1' },
      };
      const mockQuote2 = {
        ...mockQuoteWithMetadata,
        quote: { ...mockQuoteWithMetadata.quote, requestId: 'quote2' },
      };
      let recommendedQuote = mockQuote1;
      const mockAbort = jest.fn();
      const originalAbortController = global.AbortController;
      let resolveFirstValidation: ((value: unknown) => void) | undefined;

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote,
      }));
      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: {},
        abort: mockAbort,
      })) as typeof AbortController;
      mockValidateBridgeTx
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              resolveFirstValidation = resolve;
            }),
        )
        .mockResolvedValue({ status: 'SUCCESS' });

      const testState = createBridgeTestState({
        bridgeReducerOverrides: {
          sourceToken: {
            symbol: 'SOL',
            chainId: SolScope.Mainnet,
            address: '11111111111111111111111111111112',
            decimals: 9,
          },
          destToken: {
            symbol: 'USDC',
            chainId: SolScope.Mainnet,
            address:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            decimals: 6,
          },
        },
      });

      try {
        const { result, rerender, selectSourceAmountSpy } =
          renderUseBridgeQuoteData(testState);

        await waitFor(() => {
          expect(mockValidateBridgeTx).toHaveBeenCalledTimes(1);
        });
        const abortCountAfterFirstValidation = mockAbort.mock.calls.length;

        recommendedQuote = mockQuote2;
        selectSourceAmountSpy.mockReturnValue('2');
        rerender({});

        await waitFor(() => {
          expect(mockValidateBridgeTx).toHaveBeenCalledTimes(2);
        });
        await act(async () => {
          resolveFirstValidation?.({
            status: 'ERROR',
            result: {
              validation: {
                reason: 'stale quote validation failed',
              },
            },
            error_details: {
              message: 'stale quote was accepted',
            },
          });
        });

        expect(mockAbort.mock.calls.length).toBe(
          abortCountAfterFirstValidation + 1,
        );
        expect(
          mockValidateBridgeTx.mock.calls[1][0].quoteResponse.quote.requestId,
        ).toBe('quote2');
        await waitFor(() => {
          expect(result.current.blockaidError).toBe(null);
        });
      } finally {
        global.AbortController = originalAbortController;
      }
    });
  });

  // Test abort controller cleanup
  describe('abort controller cleanup', () => {
    it('does not throw on unmount', () => {
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { unmount } = renderUseBridgeQuoteData(testState);

      // Should not throw when unmounting
      expect(() => unmount()).not.toThrow();
    });
  });

  // Test manually selected quote via selectedQuoteRequestId
  describe('manually selected quote', () => {
    it('uses manually selected quote when selectedQuoteRequestId matches a quote in sortedQuotes', () => {
      const manuallySelectedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'selected-quote-id',
        },
      };

      const recommendedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'best-quote-id',
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
      }));

      const bridgeReducerOverrides = {
        selectedQuoteRequestId: 'selected-quote-id',
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.activeQuote).toEqual(manuallySelectedQuote);
      expect(result.current.bestQuote).toEqual(recommendedQuote);
    });

    it('falls back to bestQuote when selectedQuoteRequestId does not match any sortedQuote', () => {
      const recommendedQuote = { ...mockQuoteWithMetadata };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote,
        sortedQuotes: [recommendedQuote],
      }));

      const bridgeReducerOverrides = {
        selectedQuoteRequestId: 'non-existent-quote-id',
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.activeQuote).toEqual(recommendedQuote);
      expect(result.current.bestQuote).toEqual(recommendedQuote);
    });

    it('dispatches setSelectedQuoteRequestId(undefined) when manuallySelectedQuote is undefined', async () => {
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [],
      }));

      // selectedQuoteRequestId is set but sortedQuotes is empty so manuallySelectedQuote will be undefined
      const bridgeReducerOverrides = {
        selectedQuoteRequestId: 'some-quote-id',
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      renderUseBridgeQuoteData(testState);

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          bridgeSlice.setSelectedQuoteRequestId(undefined),
        );
      });
    });

    it('keeps showing manually selected quote as activeQuote when expired and not refreshing', () => {
      const manuallySelectedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'selected-quote-id',
        },
      };

      const recommendedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'best-quote-id',
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
      }));

      isQuoteExpired.mockReturnValueOnce(true);
      shouldRefreshQuote.mockReturnValueOnce(false);

      const bridgeReducerOverrides = {
        selectedQuoteRequestId: 'selected-quote-id',
        isSubmittingTx: false,
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      // When expired but not loading, the last known Redux quotes are served as
      // a cache. The manually-selected quote is still shown (not cleared).
      expect(result.current.activeQuote).toEqual(manuallySelectedQuote);
      expect(result.current.isExpired).toBe(true);
    });

    it('keeps activeQuote as manually selected when expired but still submitting', () => {
      const manuallySelectedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'selected-quote-id',
        },
      };

      const recommendedQuote = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          requestId: 'best-quote-id',
        },
      };

      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
      }));

      isQuoteExpired.mockReturnValueOnce(true);
      shouldRefreshQuote.mockReturnValue(false);

      const bridgeReducerOverrides = {
        selectedQuoteRequestId: 'selected-quote-id',
        isSubmittingTx: true,
      };

      const testState = createBridgeTestState({
        bridgeReducerOverrides,
      });

      const { result } = renderUseBridgeQuoteData(testState);

      // When isSubmittingTx is true, activeQuote should remain (even if expired)
      expect(result.current.activeQuote).toEqual(manuallySelectedQuote);
    });
  });

  // Test willRefresh scenarios
  describe('willRefresh behavior', () => {
    beforeEach(() => {
      shouldRefreshQuote.mockReturnValueOnce(true);
    });

    it('sets willRefresh to true when shouldRefreshQuote returns true', () => {
      isQuoteExpired.mockReturnValueOnce(false);
      selectBridgeQuotes.mockImplementationOnce(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.willRefresh).toBe(true);
    });

    it('shows activeQuote when expired but willRefresh is true', () => {
      isQuoteExpired.mockReturnValueOnce(true);
      selectBridgeQuotes.mockImplementationOnce(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderUseBridgeQuoteData(testState);

      expect(result.current.isExpired).toBe(true);
      expect(result.current.willRefresh).toBe(true);
      expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
    });
  });

  describe('memoization', () => {
    it('keeps the same return object reference when inputs do not change', () => {
      const bridgeQuotes = {
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      };
      selectBridgeQuotes.mockReturnValue(bridgeQuotes);

      const testState = createBridgeTestState({});

      const { result, rerender } = renderUseBridgeQuoteData(testState);

      const firstResult = result.current;

      rerender({ state: testState });

      expect(result.current).toStrictEqual(firstResult);
      expect(result.current).toBe(firstResult);
    });
  });
});
