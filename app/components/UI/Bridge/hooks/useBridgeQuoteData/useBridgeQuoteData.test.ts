import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol';
import { createBridgeTestState } from '../../testUtils';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as quoteUtils from '../../utils/quoteUtils';
import { RequestStatus, type QuoteResponse } from '@metamask/bridge-controller';
// eslint-disable-next-line import-x/no-namespace -- jest.spyOn must patch the module namespace the hook imports
import * as bridgeController from '@metamask/bridge-controller';
import AppConstants from '../../../../../core/AppConstants';
import { useBridgeQuoteData } from '.';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { act, waitFor } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { SolScope } from '@metamask/keyring-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  selectBridgeFeatureFlags as selectAppBridgeFeatureFlags,
  selectBridgeQuotes as selectAppBridgeQuotes,
  selectControllerFields,
  setSourceAmount,
} from '../../../../../core/redux/slices/bridge';

const defaultSelectBridgeQuotesResults: ReturnType<
  typeof bridgeController.selectBridgeQuotes
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

describe('useBridgeQuoteData', () => {
  let isQuoteExpired: jest.SpyInstance;
  let getQuoteRefreshRate: jest.SpyInstance;
  let shouldRefreshQuote: jest.SpyInstance;
  let selectBridgeQuotes: jest.SpyInstance;
  let selectBridgeFeatureFlags: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetAllMocks();

    selectControllerFields.clearCache();
    selectControllerFields.memoizedResultFunc.clearCache();
    selectAppBridgeQuotes.clearCache();
    selectAppBridgeQuotes.memoizedResultFunc.clearCache();
    selectAppBridgeFeatureFlags.clearCache();
    selectAppBridgeFeatureFlags.memoizedResultFunc.clearCache();

    selectBridgeFeatureFlags = jest
      .spyOn(bridgeController, 'selectBridgeFeatureFlags')
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
      .spyOn(bridgeController, 'selectBridgeQuotes')
      .mockImplementation(jest.fn());
    isQuoteExpired = jest
      .spyOn(quoteUtils, 'isQuoteExpired')
      .mockReturnValue(false);
    getQuoteRefreshRate = jest
      .spyOn(quoteUtils, 'getQuoteRefreshRate')
      .mockReturnValue(5000);
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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
          priceData: { priceImpact: '0.04' },
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.activeQuote?.quote.priceData?.priceImpact).toEqual(
        '0.04',
      );
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
        priceData: { priceImpact: '0.05' },
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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
            priceImpact: String(
              AppConstants.BRIDGE.PRICE_IMPACT_WARNING_THRESHOLD,
            ),
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
    expect(result.current.isActiveQuoteForCurrentTokenPair).toBe(true);
  });

  it('handles expired quotes correctly', () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe(undefined);
  });

  it('returns "-" when totalNetworkFee is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: undefined,
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee amount is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          valueInCurrency: '10',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee valueInCurrency is missing', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.01',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('formats network fee with fiat formatter for normal values', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('$10');
  });

  it('formats network fee as "<$0.01" when value is less than 0.01', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.0001',
          valueInCurrency: '0.005',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('<$0.01');
  });

  it('formats network fee normally when value is exactly 0.01', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.0001',
          valueInCurrency: '0.01',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('$0.01');
  });

  it('formats network fee normally when value is 0', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0',
          valueInCurrency: '0',
        },
      },
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('$0');
  });

  // Additional coverage tests

  it('handles validation errors gracefully', async () => {
    const mockQuote = { ...mockQuoteWithMetadata };

    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuote,
    }));

    mockValidateBridgeTx.mockRejectedValue(new Error('Network error'));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(null);
    });
  });

  it('calculates quote rate correctly when sourceAmount is zero', () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.slippage).toBe('Auto');
  });

  it('works with latestSourceAtomicBalance parameter', () => {
    selectBridgeQuotes.mockImplementation(() => ({
      ...defaultSelectBridgeQuotesResults,
      recommendedQuote: mockQuoteWithMetadata,
    }));

    const latestBalance = BigNumber.from('1000000000000000000');
    mockUseIsInsufficientBalance.mockReturnValue(false);

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(
      () => useBridgeQuoteData({ latestSourceAtomicBalance: latestBalance }),
      {
        state: testState,
      },
    );

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
  it('executes validation for Solana swaps and handles success', async () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(null);
    });

    expect(mockValidateBridgeTx).toHaveBeenCalledWith({
      quoteResponse: mockQuote,
      signal: expect.any(AbortSignal),
    });
  });

  it('executes validation for Solana to EVM bridges and handles error', async () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(
        'The transaction contains suspicious activity.',
      );
    });
  });

  it('handles validation error without error_details message', async () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    await waitFor(() => {
      expect(result.current.blockaidError).toBe('Fallback validation error');
    });
  });

  it('handles validation exception in catch block', async () => {
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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    await waitFor(() => {
      expect(result.current.blockaidError).toBe(null);
    });
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

    const { store } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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
    selectAppBridgeQuotes.clearCache();
    selectAppBridgeQuotes.memoizedResultFunc.clearCache();
    act(() => {
      store.dispatch(setSourceAmount('2'));
    });

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

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

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
          destAsset: {
            ...mockQuoteWithMetadata.quote.dest.asset,
            address:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          },
        },
      };

      const mockQuote2 = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          destAsset: {
            ...mockQuoteWithMetadata.quote.dest.asset,
            address: '0x0000000000000000000000000000000000000000',
            assetId:
              bridgeController.getNativeAssetForChainId(1151111081099710)
                .assetId,
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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
          srcAsset: {
            ...mockQuoteWithMetadata.quote.src.asset,
            address: '0x1111111111111111111111111111111111111111',
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.destTokenAmount).toBeUndefined();
    });

    it('handles non-EVM source chain IDs correctly', () => {
      const mockQuoteWithSolanaSource = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          srcAsset: {
            address: '11111111111111111111111111111112',
            assetId:
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111112' as const,
            decimals: 9,
            symbol: 'SOL',
            chainId: bridgeController.ChainId.SOLANA,
            name: 'SOL',
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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
          destTokenAmount: '2500000000',
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.formattedQuoteData?.rate).toMatch(/1 SOL = /);
      expect(result.current.formattedQuoteData?.rate).toMatch(/ USDC/);
    });

    it('formats rate with 3 significant digits when rate is less than 1', () => {
      const mockQuoteWithLowRate = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          destTokenAmount: '100000',
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.formattedQuoteData?.rate).toMatch(/1 SOL = /);
      expect(result.current.formattedQuoteData?.rate).toMatch(/ USDC/);
    });
  });

  // Test race condition handling
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

      // Start with first quote
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuote1,
      }));

      let abortCallCount = 0;
      const mockAbort = jest.fn(() => {
        abortCallCount++;
      });

      const originalAbortController = global.AbortController;
      global.AbortController = jest.fn().mockImplementation(() => ({
        signal: {},
        abort: mockAbort,
      })) as typeof AbortController;

      mockValidateBridgeTx.mockResolvedValue({ status: 'SUCCESS' });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      await waitFor(() => {
        expect(result.current.blockaidError).toBe(null);
      });

      // Change to second quote
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuote2,
      }));

      // Re-render with new quote
      const { result: result2 } = renderHookWithProvider(
        () => useBridgeQuoteData(),
        {
          state: testState,
        },
      );

      await waitFor(() => {
        expect(result2.current.blockaidError).toBe(null);
      });

      // Verify abort was called when quote changed
      expect(abortCallCount).toBeGreaterThan(0);

      // Restore original AbortController
      global.AbortController = originalAbortController;
    });
  });

  // Test abort controller cleanup
  describe('abort controller cleanup', () => {
    it('cleans up abort controller on unmount', () => {
      selectBridgeQuotes.mockImplementation(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { unmount } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { store } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      // After the effect runs, selectedQuoteRequestId should be cleared in the store
      await waitFor(() => {
        expect(
          (store.getState() as { bridge: { selectedQuoteRequestId?: string } })
            .bridge.selectedQuoteRequestId,
        ).toBeUndefined();
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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      // When isSubmittingTx is true, activeQuote should remain (even if expired)
      expect(result.current.activeQuote).toEqual(manuallySelectedQuote);
    });
  });

  // Test willRefresh scenarios
  describe('willRefresh behavior', () => {
    beforeEach(() => {
      shouldRefreshQuote.mockReturnValueOnce(true);
    });

    it('sets willRefresh to true when conditions are met', () => {
      isQuoteExpired.mockReturnValueOnce(false);
      selectBridgeQuotes.mockImplementationOnce(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.willRefresh).toBe(true);
    });

    it('shows activeQuote when expired but willRefresh is true', () => {
      isQuoteExpired.mockReturnValueOnce(true);
      selectBridgeQuotes.mockImplementationOnce(() => ({
        ...defaultSelectBridgeQuotesResults,
        recommendedQuote: mockQuoteWithMetadata,
      }));

      const testState = createBridgeTestState({});

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

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

      const { result, rerender } = renderHookWithProvider(
        () => useBridgeQuoteData(),
        {
          state: testState,
        },
      );

      const firstResult = result.current;

      rerender({ state: testState });

      expect(result.current).toBe(firstResult);
    });
  });
});
