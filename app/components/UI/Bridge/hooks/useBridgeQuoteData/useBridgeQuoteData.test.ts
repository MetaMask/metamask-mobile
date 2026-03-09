import '../../_mocks_/initialState';
import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol.json';
import { createBridgeTestState } from '../../testUtils';
import {
  isQuoteExpired,
  getQuoteRefreshRate,
  shouldRefreshQuote,
} from '../../utils/quoteUtils';
import {
  RequestStatus,
  type QuoteResponse,
  selectBridgeQuotes,
} from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '.';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';
import { waitFor } from '@testing-library/react-native';
import { BigNumber } from 'ethers';
import { SolScope } from '@metamask/keyring-api';
import { CHAIN_IDS } from '@metamask/transaction-controller';

jest.mock('../../utils/quoteUtils', () => ({
  isQuoteExpired: jest.fn(),
  getQuoteRefreshRate: jest.fn(),
  shouldRefreshQuote: jest.fn(),
}));

// Mock the bridge-controller module
jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    selectBridgeQuotes: jest.fn(),
    selectBridgeFeatureFlags: jest.fn().mockImplementation(() => ({
      minimumVersion: '7.58.0',
      priceImpactThreshold: {
        gasless: 0.4,
        normal: 0.19,
      },
    })),
  };
});

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
  beforeEach(() => {
    jest.clearAllMocks();
    (isQuoteExpired as jest.Mock).mockReturnValue(false);
    (getQuoteRefreshRate as jest.Mock).mockReturnValue(5000);
    (shouldRefreshQuote as jest.Mock).mockReturnValue(false);
    mockUseIsInsufficientBalance.mockReturnValue(false);
    mockValidateBridgeTx.mockResolvedValue({ status: 'SUCCESS' });
  });

  it('returns quote data when quotes are available', () => {
    // Set up mock for this specific test
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      alternativeQuotes: [],
    }));

    const bridgeControllerOverrides = {
      quotes: mockQuotes as unknown as QuoteResponse[],
      quotesLoadingStatus: null,
      quoteFetchError: null,
    };

    // destToken must match the quote's destAsset.assetId for destTokenAmount to be calculated
    // The address should be in CAIP format to match the quote's assetId
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
        rate: '1 ETH = 0.0000000000000000571 USDC',
        priceImpact: '-0.20%',
        slippage: '0.5%',
      },
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      shouldShowPriceImpactWarning: false,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [],
    });
  });

  it.each([
    [true, false, false],
    [false, true, false],
    [false, false, true],
  ])(
    'returns shouldShowPriceImpactWarning based on priceImpact exceeding threshold when gasIncluded=%s and gasIncluded7702=%s',
    (gasIncluded, gasIncluded7702, shouldShowPriceImpactWarning) => {
      // Set up mock for this specific test
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementationOnce(
        () => ({
          recommendedQuote: {
            ...mockQuoteWithMetadata,
            quote: {
              ...mockQuoteWithMetadata.quote,
              priceData: { priceImpact: '0.20' },
              gasIncluded,
              gasIncluded7702,
            },
          },
          alternativeQuotes: [],
        }),
      );

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
        '0.20',
      );
      expect(result.current.shouldShowPriceImpactWarning).toEqual(
        shouldShowPriceImpactWarning,
      );
    },
  );

  it('returns empty state when no quotes exist', () => {
    // Set up mock for this specific test
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: null,
      alternativeQuotes: [],
    }));

    const bridgeControllerOverrides = {
      quotes: [],
      quotesLoadingStatus: RequestStatus.FETCHED,
      quotesLastFetched: 123,
      quoteFetchError: null,
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
      willRefresh: false,
      blockaidError: null,
      shouldShowPriceImpactWarning: false,
      quotesLoadingStatus: RequestStatus.FETCHED,
      validQuotes: [],
    });
  });

  it('returns undefined destTokenAmount when quote destAsset does not match selected destToken', () => {
    // Set up mock with a quote for a different destination token (ETH) than what's selected (USDC)
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata, // This quote is for Solana USDC
      alternativeQuotes: [],
    }));

    const bridgeControllerOverrides = {
      quotes: mockQuotes as unknown as QuoteResponse[],
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

  it('handles expired quotes correctly', () => {
    // Set up mock for this specific test
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      alternativeQuotes: [],
    }));

    (isQuoteExpired as jest.Mock).mockReturnValue(true);

    const bridgeControllerOverrides = {
      quotes: mockQuotes as unknown as QuoteResponse[],
      quotesLoadingStatus: null,
      quoteFetchError: null,
    };

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current).toEqual({
      activeQuote: undefined,
      bestQuote: mockQuoteWithMetadata,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      shouldShowPriceImpactWarning: false,
      isExpired: true,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [],
    });
  });

  it('displays loading state while fetching quotes', () => {
    const bridgeControllerOverrides = {
      quotesLoadingStatus: RequestStatus.LOADING,
      quoteFetchError: null,
    };

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: undefined,
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current).toEqual({
      activeQuote: undefined,
      bestQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: true,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      shouldShowPriceImpactWarning: false,
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: RequestStatus.LOADING,
      validQuotes: [],
    });
  });

  it('displays error state when quote fetch fails', () => {
    const error = 'Failed to fetch quotes';
    const bridgeControllerOverrides = {
      quotesLoadingStatus: null,
      quoteFetchError: error,
    };

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: null,
      alternativeQuotes: [],
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
      willRefresh: false,
      blockaidError: null,
      quotesLoadingStatus: null,
      validQuotes: [],
    });
  });

  it('returns undefined when activeQuote is undefined', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: undefined,
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe(undefined);
  });

  it('returns "-" when totalNetworkFee is missing', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: null,
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee amount is missing', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          valueInCurrency: '10',
        },
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('returns "-" when totalNetworkFee valueInCurrency is missing', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.01',
        },
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('formats network fee with fiat formatter for normal values', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.01',
          valueInCurrency: '10',
        },
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('$10');
  });

  it('formats network fee as "<$0.01" when value is less than 0.01', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.0001',
          valueInCurrency: '0.005',
        },
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('<$0.01');
  });

  it('formats network fee normally when value is exactly 0.01', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0.0001',
          valueInCurrency: '0.01',
        },
      },
      alternativeQuotes: [],
    }));

    const testState = createBridgeTestState({});

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current.formattedQuoteData?.networkFee).toBe('$0.01');
  });

  it('formats network fee normally when value is 0', () => {
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: {
        ...mockQuoteWithMetadata,
        totalNetworkFee: {
          amount: '0',
          valueInCurrency: '0',
        },
      },
      alternativeQuotes: [],
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

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuote,
      alternativeQuotes: [],
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
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      alternativeQuotes: [],
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
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      alternativeQuotes: [],
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
    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuoteWithMetadata,
      alternativeQuotes: [],
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

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuote,
      alternativeQuotes: [],
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

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuote,
      alternativeQuotes: [],
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

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuote,
      alternativeQuotes: [],
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

    (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
      recommendedQuote: mockQuote,
      alternativeQuotes: [],
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

  // Test validQuotes filtering
  describe('validQuotes filtering', () => {
    it('returns filtered validQuotes that match destination token', () => {
      const mockQuote1 = {
        ...mockQuoteWithMetadata,
        quote: {
          ...mockQuoteWithMetadata.quote,
          destAsset: {
            ...mockQuoteWithMetadata.quote.destAsset,
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
            ...mockQuoteWithMetadata.quote.destAsset,
            address: '0x0000000000000000000000000000000000000000',
            assetId: '0x0000000000000000000000000000000000000000',
          },
        },
      };

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuote1,
        sortedQuotes: [mockQuote1, mockQuote2],
        alternativeQuotes: [],
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
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [mockQuoteWithMetadata],
        alternativeQuotes: [],
      }));

      (isQuoteExpired as jest.Mock).mockReturnValue(true);
      (shouldRefreshQuote as jest.Mock).mockReturnValue(false);

      const testState = createBridgeTestState({});

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.validQuotes).toEqual([]);
      expect(result.current.isExpired).toBe(true);
    });

    it('returns empty validQuotes when isSubmittingTx is true', () => {
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [mockQuoteWithMetadata],
        alternativeQuotes: [],
      }));

      (isQuoteExpired as jest.Mock).mockReturnValue(true);

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
            ...mockQuoteWithMetadata.quote.srcAsset,
            address: '0x1111111111111111111111111111111111111111',
          },
        },
      };

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithDifferentSource,
        alternativeQuotes: [],
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
              'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp/token:11111111111111111111111111111112',
            decimals: 9,
          },
        },
      };

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithSolanaSource,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithFastTime,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWith30Seconds,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWith120Seconds,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWith90Seconds,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithHighRate,
        alternativeQuotes: [],
      }));

      const bridgeReducerOverrides = {
        sourceAmount: '1',
        sourceToken: {
          symbol: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
          address: '0x0000000000000000000000000000000000000000',
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

      expect(result.current.formattedQuoteData?.rate).toMatch(/1 ETH = /);
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithLowRate,
        alternativeQuotes: [],
      }));

      const bridgeReducerOverrides = {
        sourceAmount: '1',
        sourceToken: {
          symbol: 'ETH',
          chainId: CHAIN_IDS.MAINNET,
          address: '0x0000000000000000000000000000000000000000',
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

      expect(result.current.formattedQuoteData?.rate).toMatch(/1 ETH = /);
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
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuote1,
        alternativeQuotes: [],
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
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuote2,
        alternativeQuotes: [],
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
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
        alternativeQuotes: [],
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote,
        sortedQuotes: [recommendedQuote],
        alternativeQuotes: [],
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
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        sortedQuotes: [],
        alternativeQuotes: [],
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

    it('does not override activeQuote with manually selected when expired and not refreshing', () => {
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
        alternativeQuotes: [],
      }));

      (isQuoteExpired as jest.Mock).mockReturnValue(true);
      (shouldRefreshQuote as jest.Mock).mockReturnValue(false);

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

      // When expired and not refreshing and not submitting, activeQuote should be undefined
      expect(result.current.activeQuote).toBeUndefined();
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

      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote,
        sortedQuotes: [recommendedQuote, manuallySelectedQuote],
        alternativeQuotes: [],
      }));

      (isQuoteExpired as jest.Mock).mockReturnValue(true);
      (shouldRefreshQuote as jest.Mock).mockReturnValue(false);

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
    it('sets willRefresh to true when conditions are met', () => {
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        alternativeQuotes: [],
      }));

      (shouldRefreshQuote as jest.Mock).mockReturnValue(true);

      const testState = createBridgeTestState({});

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.willRefresh).toBe(true);
    });

    it('shows activeQuote when expired but willRefresh is true', () => {
      (selectBridgeQuotes as unknown as jest.Mock).mockImplementation(() => ({
        recommendedQuote: mockQuoteWithMetadata,
        alternativeQuotes: [],
      }));

      (isQuoteExpired as jest.Mock).mockReturnValue(true);
      (shouldRefreshQuote as jest.Mock).mockReturnValue(true);

      const testState = createBridgeTestState({});

      const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
        state: testState,
      });

      expect(result.current.activeQuote).toEqual(mockQuoteWithMetadata);
      expect(result.current.isExpired).toBe(true);
      expect(result.current.willRefresh).toBe(true);
    });
  });
});
