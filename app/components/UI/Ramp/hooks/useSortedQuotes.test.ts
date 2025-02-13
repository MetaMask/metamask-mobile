import useQuotes from './useQuotes';
import { renderHookWithProvider } from '../../../../util/test/renderWithProvider';
import { QuoteSortBy } from '@consensys/on-ramp-sdk/dist/IOnRampSdk';
import useSortedQuotes from './useSortedQuotes';

jest.mock('./useQuotes');

describe('useSortedQuotes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sorts quotes by price', () => {
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
      error: null,
      isFetching: false,
    });
    const { result } = renderHookWithProvider(() => useSortedQuotes(100));
    expect(result.current.quotes).toEqual([
      { id: 'quote-1', provider: { id: 'provider-id-1' } },
      { id: 'quote-2', provider: { id: 'provider-id-2' } },
      { id: 'quote-3', provider: { id: 'provider-id-3' } },
      { id: 'quote-4', provider: { id: 'provider-id-4' } },
    ]);
  });
});
