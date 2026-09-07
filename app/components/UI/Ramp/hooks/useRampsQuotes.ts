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

  const quoteFetchParams = useMemo(
    () => ({
      assetId: options?.assetId,
      amount: options?.amount ?? 0,
      walletAddress: options?.walletAddress ?? '',
      redirectUrl: options?.redirectUrl,
      paymentMethods: options?.paymentMethods,
      providers: options?.providers,
      forceRefresh: options?.forceRefresh,
      ttl: options?.ttl,
    }),
    [
      options?.assetId,
      options?.amount,
      options?.walletAddress,
      options?.redirectUrl,
      options?.paymentMethods,
      options?.providers,
      options?.forceRefresh,
      options?.ttl,
    ],
  );

  // Quote identity for CUF supersede (amount / payment / provider).
  const quoteFetchKey = useMemo(() => {
    if (!queryEnabled) {
      return null;
    }
    return [
      quoteFetchParams.assetId ?? '',
      quoteFetchParams.amount,
      quoteFetchParams.walletAddress,
      (quoteFetchParams.paymentMethods ?? []).join(','),
      (quoteFetchParams.providers ?? []).join(','),
    ].join('|');
  }, [queryEnabled, quoteFetchParams]);

  const quotesQuery = useQuery({
    ...rampsQueries.quotes.options(quoteFetchParams),
    enabled: queryEnabled,
  });

  const quoteCufOpIdRef = useRef<string | null>(null);
  const quoteCufKeyRef = useRef<string | null>(null);

  const endOpenQuoteCuf = useCallback(
    (
      reason: (typeof RAMPS_BUY_CUF_END_REASON)[keyof typeof RAMPS_BUY_CUF_END_REASON],
    ) => {
      if (!quoteCufOpIdRef.current) {
        return;
      }
      endRampsBuyQuoteFetchTrace({
        id: quoteCufOpIdRef.current,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: reason,
        },
      });
      quoteCufOpIdRef.current = null;
      quoteCufKeyRef.current = null;
    },
    [],
  );

  // Buy Quote Fetch CUF: start on fetch, end on settle; key change supersedes.
  useEffect(() => {
    if (!queryEnabled || !quoteFetchKey) {
      endOpenQuoteCuf(RAMPS_BUY_CUF_END_REASON.CANCELLED);
      return;
    }

    if (quotesQuery.isFetching) {
      if (quoteCufKeyRef.current !== quoteFetchKey) {
        quoteCufOpIdRef.current = startRampsBuyQuoteFetchTrace();
        quoteCufKeyRef.current = quoteFetchKey;
      }
      return;
    }

    if (quoteCufOpIdRef.current && quoteCufKeyRef.current !== quoteFetchKey) {
      const opId = quoteCufOpIdRef.current;
      quoteCufOpIdRef.current = null;
      endRampsBuyQuoteFetchTrace({
        id: opId,
        data: {
          [RAMPS_BUY_CUF_TAG.SUCCESS]: false,
          [RAMPS_BUY_CUF_TAG.REASON]: RAMPS_BUY_CUF_END_REASON.SUPERSEDED,
        },
      });
      // Settled cache: keep key. Pending/paused: clear so resume can start.
      quoteCufKeyRef.current =
        quotesQuery.isSuccess || quotesQuery.isError ? quoteFetchKey : null;
      return;
    }

    if (!quoteCufOpIdRef.current) {
      if (
        quoteCufKeyRef.current !== quoteFetchKey &&
        (quotesQuery.isSuccess || quotesQuery.isError)
      ) {
        quoteCufKeyRef.current = quoteFetchKey;
      }
      return;
    }

    // Ignore offline pause (!isFetching while still pending).
    if (!quotesQuery.isSuccess && !quotesQuery.isError) {
      return;
    }

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
  }, [
    queryEnabled,
    quoteFetchKey,
    quotesQuery.isFetching,
    quotesQuery.isSuccess,
    quotesQuery.isError,
    endOpenQuoteCuf,
  ]);

  useEffect(
    () => () => {
      endOpenQuoteCuf(RAMPS_BUY_CUF_END_REASON.CANCELLED);
    },
    [endOpenQuoteCuf],
  );

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
