import useQuotes from './useQuotes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';
import useSortedQuotes from './useSortedQuotes';
import { useSelector } from 'react-redux';

jest.mock('./useQuotes');
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useSelector: jest.fn().mockReturnValue(['provider-id-1']),
}));

describe('useSortedQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns the original quotes', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-2', provider: { id: 'provider-id-2' } },
        { id: 'quote-4', provider: { id: 'provider-id-4' } },
        { id: 'quote-1', provider: { id: 'provider-id-1' } },
        { id: 'quote-3', provider: { id: 'provider-id-3' } },
      ],
      sorted: [
        {
          sortBy: QuoteSortBy.price,
          ids: [
            'provider-id-1',
            'provider-id-2',
            'provider-id-3',
            'provider-id-4',
          ],
        },
      ],
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
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.quotes).toEqual([
      { id: 'quote-2', provider: { id: 'provider-id-2' } },
      { id: 'quote-4', provider: { id: 'provider-id-4' } },
      { id: 'quote-1', provider: { id: 'provider-id-1' } },
      { id: 'quote-3', provider: { id: 'provider-id-3' } },
    ]);
  });

  it('returns the custom actions', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [],
      sorted: [],
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
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.customActions).toEqual([
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
    ]);
  });

  it('sorts quotes by reliability and filters out errors', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-2', provider: { id: 'provider-id-2' } },
        { id: 'quote-4', provider: { id: 'provider-id-4' } },
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: true },
        { id: 'quote-3', provider: { id: 'provider-id-3' } },
      ],
      sorted: [
        {
          sortBy: QuoteSortBy.reliability,
          ids: [
            'provider-id-1',
            'provider-id-2',
            'provider-id-3',
            'provider-id-4',
          ],
        },
      ],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.quotesByReliabilityWithoutError).toEqual([
      { id: 'quote-2', provider: { id: 'provider-id-2' } },
      { id: 'quote-3', provider: { id: 'provider-id-3' } },
      { id: 'quote-4', provider: { id: 'provider-id-4' } },
    ]);
  });

  it('filters out quotes with errors', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
        { id: 'quote-2', provider: { id: 'provider-id-2' }, error: {} },
      ],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.quotesWithoutError).toEqual([
      { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
    ]);
    expect(result.current.quotesWithError).toEqual([
      { id: 'quote-2', provider: { id: 'provider-id-2' }, error: {} },
    ]);
  });

  it('returns recommended quote based on previously used provider', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
        { id: 'quote-2', provider: { id: 'provider-id-2' }, error: null },
      ],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.recommendedQuote).toEqual({
      id: 'quote-1',
      provider: { id: 'provider-id-1' },
      error: null,
    });
  });

  it('returns recommended quote based on reliability if no previously used provider', () => {
    (useSelector as jest.Mock).mockReturnValue([]);
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
        { id: 'quote-2', provider: { id: 'provider-id-2' }, error: null },
      ],
      sorted: [
        {
          sortBy: QuoteSortBy.reliability,
          ids: ['provider-id-2', 'provider-id-1'],
        },
      ],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.recommendedQuote).toEqual({
      id: 'quote-2',
      provider: { id: 'provider-id-2' },
      error: null,
    });
  });

  it('returns recommended quote based on price if no previously used provider and no reliability sorted quotes', () => {
    (useSelector as jest.Mock).mockReturnValue([]);
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
        { id: 'quote-2', provider: { id: 'provider-id-2' }, error: null },
      ],
      sorted: [
        {
          sortBy: QuoteSortBy.price,
          ids: ['provider-id-1', 'provider-id-2'],
        },
      ],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.recommendedQuote).toEqual({
      id: 'quote-1',
      provider: { id: 'provider-id-1' },
      error: null,
    });
  });

  it('defaults the recommended quote to the first quote', () => {
    (useSelector as jest.Mock).mockReturnValue([]);
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [
        { id: 'quote-1', provider: { id: 'provider-id-1' }, error: null },
        { id: 'quote-2', provider: { id: 'provider-id-2' }, error: null },
      ],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.recommendedQuote).toEqual({
      id: 'quote-1',
      provider: { id: 'provider-id-1' },
      error: null,
    });
  });

  it('handles fetching state', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [],
      sorted: [],
      error: null,
      isFetching: true,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.isFetching).toBe(true);
  });

  it('returns recommended quote of undefined if no quotes are available', () => {
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [],
      sorted: [],
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.recommendedQuote).toBeUndefined();
  });

  it('handles error state', () => {
    const error = new Error('Test error');
    (useQuotes as jest.Mock).mockReturnValue({
      quotes: [],
      sorted: [],
      error,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.error).toBe(error);
  });
});
