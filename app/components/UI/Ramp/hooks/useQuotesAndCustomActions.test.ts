import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import useQuotesAndCustomActions from './useQuotesAndCustomActions';
import useSortedQuotes from './useSortedQuotes';

jest.mock('./useSortedQuotes');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue(['provider-id-1']),
}));

describe('useQuotesAndCustomActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('composes useSortedQuotes', () => {
    const sortedQuotesMock = {
      recommendedQuote: { id: 'quote-1', provider: { id: 'provider-id-1' } },
      customActions: [],
      quotes: [],
      sorted: [],
      error: null,
      isFetching: false,
    };
    (useSortedQuotes as jest.Mock).mockReturnValue(sortedQuotesMock);
    const { result } = renderHookWithProvider(() =>
      useQuotesAndCustomActions(100),
    );
    expect(result.current).toMatchObject(sortedQuotesMock);
  });

  describe('customActionOrRecommendedQuote', () => {
    it('returns the recommended quote if there are no custom actions', () => {
      (useSortedQuotes as jest.Mock).mockReturnValue({
        recommendedQuote: { id: 'quote-1', provider: { id: 'provider-id-1' } },
        customActions: [],
        quotes: [],
        sorted: [],
        error: null,
        isFetching: false,
      });
      const { result } = renderHookWithProvider(() =>
        useQuotesAndCustomActions(100),
      );
      expect(result.current.customActionOrRecommendedQuote).toEqual({
        id: 'quote-1',
        provider: { id: 'provider-id-1' },
      });
    });

    it('returns the recommended quote if it is a previously used provider', () => {
      (useSortedQuotes as jest.Mock).mockReturnValue({
        recommendedQuote: { id: 'quote-1', provider: { id: 'provider-id-1' } },
        customActions: [
          {
            button: { light: {}, dark: {} },
            buy: { providerId: '/providers/paypal' },
            buyButton: { light: {}, dark: {} },
            paymentMethodId: '/payments/paypal',
            sellButton: { light: {}, dark: {} },
            supportedPaymentMethodIds: [
              '/payments/paypal',
              '/payments/paypal-staging',
            ],
          },
        ],
        quotes: [],
        sorted: [],
        error: null,
        isFetching: false,
      });
      const { result } = renderHookWithProvider(() =>
        useQuotesAndCustomActions(100),
      );
      expect(result.current.customActionOrRecommendedQuote).toEqual({
        id: 'quote-1',
        provider: { id: 'provider-id-1' },
      });
    });

    it('returns the first custom action', () => {
      (useSortedQuotes as jest.Mock).mockReturnValue({
        recommendedQuote: { id: 'quote-2', provider: { id: 'provider-id-2' } },
        customActions: [
          {
            button: { light: {}, dark: {} },
            buy: { providerId: '/providers/paypal' },
            buyButton: { light: {}, dark: {} },
            paymentMethodId: '/payments/paypal',
            sellButton: { light: {}, dark: {} },
            supportedPaymentMethodIds: [
              '/payments/paypal',
              '/payments/paypal-staging',
            ],
          },
        ],
        quotes: [],
        sorted: [],
        error: null,
        isFetching: false,
      });
      const { result } = renderHookWithProvider(() =>
        useQuotesAndCustomActions(100),
      );
      expect(result.current.customActionOrRecommendedQuote).toEqual({
        button: { light: {}, dark: {} },
        buy: { providerId: '/providers/paypal' },
        buyButton: { light: {}, dark: {} },
        paymentMethodId: '/payments/paypal',
        sellButton: { light: {}, dark: {} },
        supportedPaymentMethodIds: [
          '/payments/paypal',
          '/payments/paypal-staging',
        ],
      });
    });
  });

  it('asserts isRecommendedQuoteACustomAction correctly', () => {
    (useSortedQuotes as jest.Mock).mockReturnValue({
      recommendedQuote: { id: 'quote-1', provider: { id: 'provider-id-2' } },
      customActions: [
        {
          button: { light: {}, dark: {} },
          buy: { providerId: '/providers/paypal' },
          buyButton: { light: {}, dark: {} },
          paymentMethodId: '/payments/paypal',
          sellButton: { light: {}, dark: {} },
          supportedPaymentMethodIds: [
            '/payments/paypal',
            '/payments/paypal-staging',
          ],
        },
      ],
      quotes: [],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() =>
      useQuotesAndCustomActions(100),
    );
    expect(result.current.isRecommendedQuoteACustomAction).toBe(true);

    (useSortedQuotes as jest.Mock).mockReturnValue({
      recommendedQuote: { id: 'quote-1', provider: { id: 'provider-id-1' } },
      customActions: [],
      quotes: [],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result: result2 } = renderHookWithProvider(() =>
      useQuotesAndCustomActions(100),
    );
    expect(result2.current.isRecommendedQuoteACustomAction).toBe(false);
  });
});
