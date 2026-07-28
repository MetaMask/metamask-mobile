import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { BuyWidget, QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';
import { rampsQueries } from '../queries';
import type { RampsQueryStatus } from './useRampsPaymentMethods';
import {
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

  const quotesQuery = useQuery({
    ...rampsQueries.quotes.options({
      assetId: options?.assetId,
      amount: options?.amount ?? 0,
      walletAddress: options?.walletAddress ?? '',
      redirectUrl: options?.redirectUrl,
      paymentMethods: options?.paymentMethods,
      providers: options?.providers,
      forceRefresh: options?.forceRefresh,
      ttl: options?.ttl,
    }),
    enabled: queryEnabled,
  });

  const quoteCufOpIdRef = useRef<string | null>(null);

  // Buy Quote Fetch CUF (TRAM-3780): fetch start → quotes rendered or error.
  // Fires for every Unified Buy quote fetch; nests under E2E parent when active.
  useEffect(() => {
    if (!queryEnabled) {
      if (quoteCufOpIdRef.current) {
        endRampsBuyQuoteFetchTrace({
          id: quoteCufOpIdRef.current,
          data: {
            [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
            [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.CANCELLED,
          },
        });
        quoteCufOpIdRef.current = null;
      }
      return;
    }

    if (quotesQuery.isFetching && !quoteCufOpIdRef.current) {
      quoteCufOpIdRef.current = startRampsBuyQuoteFetchTrace();
      return;
    }

    if (!quotesQuery.isFetching && quoteCufOpIdRef.current) {
      const opId = quoteCufOpIdRef.current;
      quoteCufOpIdRef.current = null;
      endRampsBuyQuoteFetchTrace({
        id: opId,
        data: quotesQuery.isError
          ? {
              [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
              [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.ERROR,
            }
          : { [RAMPS_BUY_CUF_TAG.SUCCESS]: true },
      });
    }
  }, [queryEnabled, quotesQuery.isFetching, quotesQuery.isError]);

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
