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

const mockSelectPrimaryCurrency = jest.fn();
jest.mock('../../../../../selectors/settings', () => ({
  ...jest.requireActual('../../../../../selectors/settings'),
  selectPrimaryCurrency: () => mockSelectPrimaryCurrency(),
}));

// Mock the bridge-controller module
jest.mock('@metamask/bridge-controller', () => {
  const actual = jest.requireActual('@metamask/bridge-controller');
  return {
    ...actual,
    selectBridgeQuotes: jest.fn(),
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
    mockSelectPrimaryCurrency.mockReturnValue('ETH');
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

    const testState = createBridgeTestState({
      bridgeControllerOverrides,
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
        estimatedTime: '1 min',
        rate: '1 ETH = 0.0000000000000000571 USDC',
        priceImpact: '-0.20%',
        slippage: '0.5%',
      },
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      willRefresh: false,
      blockaidError: null,
    });
  });

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
    });
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
      isExpired: true,
      willRefresh: false,
      blockaidError: null,
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
      willRefresh: false,
      blockaidError: null,
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
      isLoading: false,
      quoteFetchError: error,
      isNoQuotesAvailable: false,
      isExpired: false,
      willRefresh: false,
      blockaidError: null,
    });
  });

  it('formats network fee in ETH currency', () => {
    mockSelectPrimaryCurrency.mockReturnValue('ETH');

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

    expect(result.current.formattedQuoteData?.networkFee).toBe('0.01 ETH');
  });

  it('formats network fee in USD currency', () => {
    mockSelectPrimaryCurrency.mockReturnValue('USD');

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

  it('formats network fee with valid totalNetworkFee data', () => {
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

    // The exact format will depend on the locale and formatter, but we can check it's not '-'
    expect(result.current.formattedQuoteData?.networkFee).not.toBe('-');
  });

  it('formats network fee in ETH currency when primary currency is not specified', () => {
    mockSelectPrimaryCurrency.mockReturnValue(undefined);

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

    // Should default to ETH format when primary currency is not specified
    expect(result.current.formattedQuoteData?.networkFee).toContain('ETH');
  });

  it('formats network fee in USD currency when primary currency is not ETH', () => {
    mockSelectPrimaryCurrency.mockReturnValue('GBP');

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

    // Should use USD format when primary currency is not ETH
    expect(result.current.formattedQuoteData?.networkFee).toBe('$10');
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
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
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
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
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
        address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
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
});
