import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BuyWidget, QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';
import { rampsQueries } from '../queries';
import type { RampsQueryStatus } from './useRampsPaymentMethods';
import {
  buildRampsBuyQuoteFetchCufCompletion,
  buildRampsBuyQuoteFetchStartTags,
  endRampsBuyQuoteFetchTrace,
  startRampsBuyQuoteFetchTrace,
} from '../utils/rampsBuyCufTrace';
import {
  RAMPS_BUY_CUF_END_REASON,
  RAMPS_BUY_CUF_TAG,
} from '../constants/rampsBuyCufTags';

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

interface ActiveQuoteCufOperation {
  id: string;
  requestedProviders?: string[];
  requestedProvidersKey: string;
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

  const requestedProvidersKey = (options?.providers ?? []).join(',');
  const hasRequestedProviders = options?.providers !== undefined;
  const requestedProviders = useMemo(() => {
    if (!hasRequestedProviders) {
      return undefined;
    }

    return requestedProvidersKey ? requestedProvidersKey.split(',') : [];
  }, [hasRequestedProviders, requestedProvidersKey]);

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

  const quoteCufOpRef = useRef<ActiveQuoteCufOperation | null>(null);

  // Buy Quote Fetch CUF (TRAM-3780 / TRAM-3805): fetch start → usable quotes
  // or a query/provider-level failure.
  // Fires for every Unified Buy quote fetch; nests under E2E parent when active.
  useEffect(() => {
    if (!queryEnabled) {
      if (quoteCufOpRef.current) {
        endRampsBuyQuoteFetchTrace({
          id: quoteCufOpRef.current.id,
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
            [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.CANCELLED,
          },
        });
        quoteCufOpRef.current = null;
      }
      return;
    }

    if (
      quoteCufOpRef.current &&
      quoteCufOpRef.current.requestedProvidersKey !== requestedProvidersKey
    ) {
      endRampsBuyQuoteFetchTrace({
        id: quoteCufOpRef.current.id,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
        },
      });
      quoteCufOpRef.current = null;
    }

    if (quotesQuery.isFetching && !quoteCufOpRef.current) {
      const providersAtStart = requestedProviders
        ? [...requestedProviders]
        : undefined;
      quoteCufOpRef.current = {
        id: startRampsBuyQuoteFetchTrace({
          tags: buildRampsBuyQuoteFetchStartTags(providersAtStart),
        }),
        requestedProviders: providersAtStart,
        requestedProvidersKey,
      };
      return;
    }

    if (!quotesQuery.isFetching && quoteCufOpRef.current) {
      const operation = quoteCufOpRef.current;
      quoteCufOpRef.current = null;
      endRampsBuyQuoteFetchTrace({
        id: operation.id,
        data: buildRampsBuyQuoteFetchCufCompletion({
          isQueryError: quotesQuery.isError,
          response: quotesQuery.data,
          requestedProviders: operation.requestedProviders,
        }),
      });
    }
  }, [
    queryEnabled,
    quotesQuery.isFetching,
    quotesQuery.isError,
    quotesQuery.data,
    requestedProviders,
    requestedProvidersKey,
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
