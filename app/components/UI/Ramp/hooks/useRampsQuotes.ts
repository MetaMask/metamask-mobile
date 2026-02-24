import { useCallback, useEffect, useMemo, useState } from 'react';
import type { QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';

/**
 * Options for fetching quotes (matches RampsController.getQuotes).
 */
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

/**
 * Hook-level options that extend GetQuotesOptions with fetch control.
 */
export interface UseRampsQuotesOptions extends GetQuotesOptions {
  /** When false, the hook skips fetching and clears data/error. Defaults to true. */
  enableFetching?: boolean;
}

/**
 * Result returned by the useRampsQuotes hook.
 */
export interface UseRampsQuotesResult {
  /**
   * Fetches quotes and returns the response. Uses controller cache; callers manage response in local state.
   */
  getQuotes: (options: GetQuotesOptions) => Promise<QuotesResponse>;
  /**
   * Fetches the widget URL from a quote for redirect providers.
   * Makes a request to the buyURL endpoint to get the actual provider widget URL.
   * @param quote - The quote to fetch the widget URL from.
   * @returns Promise resolving to the widget URL string, or null if not available.
   */
  getWidgetUrl: (quote: Quote) => Promise<string | null>;
  /** Fetched quotes response when options is used. Null when not fetching or fetch skipped. */
  data: QuotesResponse | null;
  /** True while a fetch is in progress. Reset when fetch settles, unless the effect was cancelled (component unmounted). */
  loading: boolean;
  /** Error message when fetch rejects. */
  error: string | null;
}

/**
 * Hook to get quote-related functions from RampsController.
 * Components call getQuotes() and manage quotes/selection locally.
 *
 * When options is provided (and enableFetching is not false), runs an effect
 * to fetch quotes and returns data, loading, and error. Callers do not need
 * to memoize options — the hook stabilizes the reference internally via
 * serialization.
 *
 * @param options - UseRampsQuotesOptions to fetch, or null/undefined to skip fetch.
 * @returns getQuotes, getWidgetUrl, and when options used: data, loading, error.
 */
export function useRampsQuotes(
  options?: UseRampsQuotesOptions | null,
): UseRampsQuotesResult {
  const getQuotes = useCallback(
    (opts: GetQuotesOptions) => Engine.context.RampsController.getQuotes(opts),
    [],
  );

  const getWidgetUrl = useCallback(
    (quote: Quote) => Engine.context.RampsController.getWidgetUrl(quote),
    [],
  );

  const enableFetching = options?.enableFetching !== false;

  const optionsKey = JSON.stringify(options ?? null);
  const stableOptions = useMemo<GetQuotesOptions | null>(() => {
    if (!enableFetching || options == null) {
      return null;
    }
    const { enableFetching: _, ...fetchOptions } = options;
    return fetchOptions;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [optionsKey]);

  const [data, setData] = useState<QuotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (stableOptions == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);

    getQuotes(stableOptions)
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setData(null);
          setError(
            err instanceof Error ? err.message : 'Failed to fetch quotes',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stableOptions, getQuotes]);

  return {
    getQuotes,
    getWidgetUrl,
    data,
    loading,
    error,
  };
}

export default useRampsQuotes;
