import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BuyWidget, QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';
import { rampsQueries } from '../queries';
import type { RampsQueryStatus } from './useRampsPaymentMethods';
import {
  buildRampsQuoteFetchCompletion,
  buildRampsQuoteFetchStartTags,
  endRampsQuoteFetchTrace,
  startRampsQuoteFetchTrace,
} from '../utils/rampsQuoteFetchTrace';
import {
  RAMPS_QUOTE_FETCH_END_REASON,
  RAMPS_QUOTE_FETCH_TAG,
} from '../constants/rampsQuoteFetchTags';

export interface GetQuotesOptions {
  region?: string;
  fiat?: string;
  assetId?: string;
  amount: number;
  walletAddress: string;
  paymentMethods?: string[];
  providers?: string[];
  redirectUrl?: string;
  forceRefresh?: boolean;
  ttl?: number;
}

export interface UseRampsQuotesResult {
  getQuotes: (options: GetQuotesOptions) => Promise<QuotesResponse>;
  getBuyWidgetData: (quote: Quote) => Promise<BuyWidget | null>;
  data: QuotesResponse | null;
  loading: boolean;
  status: RampsQueryStatus;
  isSuccess: boolean;
  error: unknown | null;
}

export function useRampsQuotes(
  options?: GetQuotesOptions | null,
): UseRampsQuotesResult {
  const getQuotes = useCallback(
    (opts: GetQuotesOptions) => Engine.context.RampsController.getQuotes(opts),
    [],
  );

  const getBuyWidgetData = useCallback((quote: Quote) => {
    const ramps = Engine.context
      .RampsController as typeof Engine.context.RampsController & {
      getBuyWidgetData: (q: Quote) => Promise<BuyWidget | null>;
    };
    return ramps.getBuyWidgetData(quote);
  }, []);

  const queryEnabled = Boolean(
    options?.assetId && options.walletAddress && options.amount > 0,
  );

  // Stabilize by provider-id value so inline `providers: [id]` arrays do not
  // retrigger the quote-fetch effect every render.
  const requestedProvidersKey = (options?.providers ?? []).join(',');
  const requestedProviders = useMemo(
    () => options?.providers,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by value
    [requestedProvidersKey],
  );

  const quotesQuery = useQuery({
    ...rampsQueries.quotes.options({
      assetId: options?.assetId,
      amount: options?.amount ?? 0,
      walletAddress: options?.walletAddress ?? '',
      redirectUrl: options?.redirectUrl,
      paymentMethods: options?.paymentMethods,
      providers: requestedProviders,
      forceRefresh: options?.forceRefresh,
      ttl: options?.ttl,
    }),
    enabled: queryEnabled,
  });

  const quoteFetchOpIdRef = useRef<string | null>(null);

  // Unified Buy quote-fetch tracing (TRAM-3805): fetch start → quotes rendered
  // or provider-level failure (incl. PayPal custom-action quotes).
  useEffect(() => {
    if (!queryEnabled) {
      if (quoteFetchOpIdRef.current) {
        endRampsQuoteFetchTrace({
          id: quoteFetchOpIdRef.current,
          data: {
            [RAMPS_QUOTE_FETCH_TAG.SUCCESS]: false,
            [RAMPS_QUOTE_FETCH_TAG.REASON]:
              RAMPS_QUOTE_FETCH_END_REASON.CANCELLED,
          },
        });
        quoteFetchOpIdRef.current = null;
      }
      return;
    }

    if (quotesQuery.isFetching && !quoteFetchOpIdRef.current) {
      quoteFetchOpIdRef.current = startRampsQuoteFetchTrace({
        tags: buildRampsQuoteFetchStartTags(requestedProviders),
      });
      return;
    }

    if (!quotesQuery.isFetching && quoteFetchOpIdRef.current) {
      const opId = quoteFetchOpIdRef.current;
      quoteFetchOpIdRef.current = null;
      endRampsQuoteFetchTrace({
        id: opId,
        data: buildRampsQuoteFetchCompletion({
          isQueryError: quotesQuery.isError,
          response: quotesQuery.data,
          requestedProviders,
        }),
      });
    }
  }, [
    queryEnabled,
    quotesQuery.isFetching,
    quotesQuery.isError,
    quotesQuery.data,
    requestedProviders,
  ]);

  const status = useMemo<RampsQueryStatus>(() => {
    if (!queryEnabled) {
      return 'idle';
    }
    if (quotesQuery.isLoading) {
      return 'loading';
    }
    if (quotesQuery.isError) {
      return 'error';
    }
    return 'success';
  }, [queryEnabled, quotesQuery.isError, quotesQuery.isLoading]);

  return {
    getQuotes,
    getBuyWidgetData,
    data: quotesQuery.data ?? null,
    loading: status === 'loading',
    status,
    isSuccess: status === 'success',
    error: quotesQuery.error ?? null,
  };
}

export default useRampsQuotes;
