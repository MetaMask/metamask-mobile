import { renderHook } from '@testing-library/react-native';
import { useQuery } from '@metamask/react-data-query';
import { useQuoteTokensQuery } from './useQuoteTokensQuery';
import { QUOTE_TOKENS_QUERY_KEY } from './quoteTokens';

jest.mock('@metamask/react-data-query');
jest.mock('../../../../core/ReactQueryService', () => ({
  __esModule: true,
  default: { queryClient: {} },
}));

const mockUseQuery = jest.mocked(useQuery);

describe('useQuoteTokensQuery', () => {
  beforeEach(() => {
    mockUseQuery.mockReset();
  });

  it.each([true, false])(
    'queries the quote-token list once per session when enabled is %s',
    (enabled) => {
      renderHook(() => useQuoteTokensQuery(enabled));

      expect(mockUseQuery).toHaveBeenCalledWith({
        queryKey: QUOTE_TOKENS_QUERY_KEY,
        enabled,
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
      });
    },
  );
});
