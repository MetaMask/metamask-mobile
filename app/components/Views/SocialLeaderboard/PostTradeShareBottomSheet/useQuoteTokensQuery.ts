import { useQuery } from '@metamask/react-data-query';
import type { QuoteTokensResponse } from '@metamask/social-controllers';
import { QUOTE_TOKENS_QUERY_KEY } from './quoteTokens';

/**
 * Loads the quote-token list once per app session. The list changes rarely,
 * so remounts, app focus and reconnects reuse the cached copy.
 */
export const useQuoteTokensQuery = (enabled: boolean) =>
  useQuery<QuoteTokensResponse>({
    queryKey: QUOTE_TOKENS_QUERY_KEY,
    enabled,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
