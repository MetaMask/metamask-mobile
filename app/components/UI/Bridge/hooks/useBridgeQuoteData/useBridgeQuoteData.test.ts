import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol.json';
import { createBridgeTestState } from '../../testUtils';
import { isQuoteExpired, getQuoteRefreshRate } from '../../utils/quoteUtils';
import { RequestStatus, type QuoteResponse } from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '.';

jest.mock('../../utils/quoteUtils', () => ({
  isQuoteExpired: jest.fn(),
  getQuoteRefreshRate: jest.fn(),
  shouldRefreshQuote: jest.fn(),
}));

const mockSelectPrimaryCurrency = jest.fn();
jest.mock('../../../../../selectors/settings', () => ({
  selectPrimaryCurrency: () => mockSelectPrimaryCurrency(),
}));

describe('useBridgeQuoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isQuoteExpired as jest.Mock).mockReturnValue(false);
    (getQuoteRefreshRate as jest.Mock).mockReturnValue(5000);
    mockSelectPrimaryCurrency.mockReturnValue('ETH');
  });

  it('returns quote data when quotes are available', () => {
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
      activeQuote: {
        ...mockQuotes[0],
        adjustedReturn: { usd: null, valueInCurrency: null },
        cost: { usd: null, valueInCurrency: null },
        gasFee: { amount: '0', usd: null, valueInCurrency: null },
        sentAmount: { amount: '0.5', usd: null, valueInCurrency: null },
        swapRate: '114.112442',
        toTokenAmount: {
          amount: '57.056221',
          usd: null,
          valueInCurrency: null,
        },
        totalMaxNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
        totalNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
      },
      bestQuote: {
        ...mockQuotes[0],
        adjustedReturn: { usd: null, valueInCurrency: null },
        cost: { usd: null, valueInCurrency: null },
        gasFee: { amount: '0', usd: null, valueInCurrency: null },
        sentAmount: { amount: '0.5', usd: null, valueInCurrency: null },
        swapRate: '114.112442',
        toTokenAmount: {
          amount: '57.056221',
          usd: null,
          valueInCurrency: null,
        },
        totalMaxNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
        totalNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
      },
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
    });
  });

  it('returns empty state when no quotes exist', () => {
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
    });
  });

  it('handles expired quotes correctly', () => {
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
      bestQuote: {
        ...mockQuotes[0],
        adjustedReturn: { usd: null, valueInCurrency: null },
        cost: { usd: null, valueInCurrency: null },
        gasFee: { amount: '0', usd: null, valueInCurrency: null },
        sentAmount: { amount: '0.5', usd: null, valueInCurrency: null },
        swapRate: '114.112442',
        toTokenAmount: {
          amount: '57.056221',
          usd: null,
          valueInCurrency: null,
        },
        totalMaxNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
        totalNetworkFee: { amount: '0', usd: null, valueInCurrency: null },
      },
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });
  });

  it('displays loading state while fetching quotes', () => {
    const bridgeControllerOverrides = {
      quotes: [],
      quotesLoadingStatus: RequestStatus.LOADING,
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
      isLoading: true,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });
  });

  it('displays error state when quote fetch fails', () => {
    const error = 'Failed to fetch quotes';
    const bridgeControllerOverrides = {
      quotes: [],
      quotesLoadingStatus: null,
      quoteFetchError: error,
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
      quoteFetchError: error,
      isNoQuotesAvailable: false,
    });
  });

  it('formats network fee in ETH currency', () => {
    mockSelectPrimaryCurrency.mockReturnValue('ETH');

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

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });

  it('formats network fee in USD currency', () => {
    mockSelectPrimaryCurrency.mockReturnValue('USD');

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

    expect(result.current.formattedQuoteData?.networkFee).toBe('-');
  });
});
