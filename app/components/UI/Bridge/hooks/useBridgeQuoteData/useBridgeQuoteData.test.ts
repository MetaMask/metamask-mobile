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

describe('useBridgeQuoteData', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (isQuoteExpired as jest.Mock).mockReturnValue(false);
    (getQuoteRefreshRate as jest.Mock).mockReturnValue(5000);
  });

  it('should return correct quote data when available', () => {
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
      activeQuote: mockQuotes[0],
      bestQuote: mockQuotes[0],
      destTokenAmount: '57.06',
      formattedQuoteData: {
        networkFee: '44',
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

  it('should handle no available quotes', () => {
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
      activeQuote: undefined,
      bestQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: true,
    });
  });

  it('should handle expired quote', () => {
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
      bestQuote: mockQuotes[0],
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });
  });

  it('should handle loading state', () => {
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
      activeQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: true,
      quoteFetchError: null,
      isNoQuotesAvailable: false,
    });
  });

  it('should handle fetch error', () => {
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
      activeQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: error,
      isNoQuotesAvailable: false,
    });
  });
});
