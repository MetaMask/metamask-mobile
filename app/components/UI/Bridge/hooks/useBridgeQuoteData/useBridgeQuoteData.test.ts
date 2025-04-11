import { renderHookWithProvider } from '../../../../../util/test/renderWithProvider';
import mockQuotes from '../../_mocks_/mock-quotes-sol-sol.json';
import { createBridgeTestState } from '../../testUtils';
import { isQuoteExpired, getQuoteRefreshRate } from '../../utils/quoteUtils';
import { RequestStatus, type QuoteResponse } from '@metamask/bridge-controller';
import { useBridgeQuoteData } from '.';
import { mockBridgeReducerState } from '../../_mocks_/bridgeReducerState';

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
    const testState = createBridgeTestState(
      {
        quotes: mockQuotes as unknown as QuoteResponse[],
        quotesLoadingStatus: null,
        quoteFetchError: null,
      },
      mockBridgeReducerState,
    );

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current).toEqual({
      activeQuote: mockQuotes[0],
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
    });
  });

  it('should handle no available quotes', () => {
    const testState = createBridgeTestState({
      quotes: [],
      quotesLoadingStatus: null,
      quoteFetchError: null,
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current).toEqual({
      activeQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
    });
  });

  it('should handle expired quote', () => {
    (isQuoteExpired as jest.Mock).mockReturnValue(true);

    const testState = createBridgeTestState({
      quotes: mockQuotes as unknown as QuoteResponse[],
      quotesLoadingStatus: null,
      quoteFetchError: null,
    });

    const { result } = renderHookWithProvider(() => useBridgeQuoteData(), {
      state: testState,
    });

    expect(result.current).toEqual({
      activeQuote: undefined,
      destTokenAmount: undefined,
      formattedQuoteData: undefined,
      isLoading: false,
      quoteFetchError: null,
    });
  });

  it('should handle loading state', () => {
    const testState = createBridgeTestState({
      quotes: [],
      quotesLoadingStatus: RequestStatus.LOADING,
      quoteFetchError: null,
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
    });
  });

  it('should handle fetch error', () => {
    const error = 'Failed to fetch quotes';
    const testState = createBridgeTestState({
      quotes: [],
      quotesLoadingStatus: null,
      quoteFetchError: error,
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
    });
  });
});
