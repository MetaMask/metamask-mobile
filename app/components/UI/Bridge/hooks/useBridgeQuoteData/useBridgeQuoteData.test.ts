import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol.json';
import { createBridgeTestState } from '../../testUtils';
import { isQuoteExpired, getQuoteRefreshRate } from '../../utils/quoteUtils';
import {
  RequestStatus,
  type QuoteResponse,
  selectBridgeQuotes,
} from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '.';
import { mockQuoteWithMetadata } from '../../_mocks_/bridgeQuoteWithMetadata';

jest.mock('../../utils/quoteUtils', () => ({
  isQuoteExpired: jest.fn(),
  getQuoteRefreshRate: jest.fn(),
  shouldRefreshQuote: jest.fn(),
}));

const mockSelectPrimaryCurrency = jest.fn();
jest.mock('../../../../../selectors/settings', () => ({
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

describe('useBridgeQuoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isQuoteExpired as jest.Mock).mockReturnValue(false);
    (getQuoteRefreshRate as jest.Mock).mockReturnValue(5000);
    mockSelectPrimaryCurrency.mockReturnValue('ETH');
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
      destTokenAmount: '57.06',
      formattedQuoteData: {
        networkFee: '-',
        estimatedTime: '1 min',
        rate: '1 ETH = 0.0 USDC',
        priceImpact: '-0.20%',
        slippage: '0.5%',
      },
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
      isExpired: false,
      willRefresh: undefined,
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
      willRefresh: undefined,
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
      willRefresh: undefined,
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
      willRefresh: undefined,
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
      willRefresh: undefined,
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
});
