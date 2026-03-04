import { useCallback, useEffect, useState } from 'react';
import type { BuyWidget, QuotesResponse } from '@metamask/ramps-controller';
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
 * Result returned by the useRampsQuotes hook.
 */
export interface UseRampsQuotesResult {
  /**
   * Fetches quotes and returns the response. Uses controller cache; callers manage response in local state.
   */
  getQuotes: (options: GetQuotesOptions) => Promise<QuotesResponse>;
  /**
   * Fetches the widget data from a quote for redirect providers.
   * Makes a request to the buyURL endpoint to get the provider widget URL, browser hint, and optional order ID.
   * @param quote - The quote to fetch the widget data from.
   * @returns Promise resolving to the BuyWidget (url, browser?, orderId?), or null if not available.
   */
  getBuyWidgetData: (quote: Quote) => Promise<BuyWidget | null>;
  /**
   * @deprecated Use getBuyWidgetData instead. Returns url from getBuyWidgetData for backward compatibility.
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
 * When options is provided, runs an effect to fetch quotes and returns data, loading, and error.
 * Loading is reset when the fetch settles unless the effect was cancelled (avoids setState on unmounted component).
 *
 * @param options - GetQuotesOptions to fetch, or null/undefined to skip fetch.
 * @returns getQuotes, getWidgetUrl, and when options used: data, loading, error.
 */
export function useRampsQuotes(
  options?: GetQuotesOptions | null,
): UseRampsQuotesResult {
  const getQuotes = useCallback(
    (opts: GetQuotesOptions) => Engine.context.RampsController.getQuotes(opts),
    [],
  );

  const getBuyWidgetData = useCallback(
    (quote: Quote) => Engine.context.RampsController.getBuyWidgetData(quote),
    [],
  );

  const getWidgetUrl = useCallback(
    async (quote: Quote) => {
      const widget = await getBuyWidgetData(quote);
      return widget?.url ?? null;
    },
    [getBuyWidgetData],
  );

  const [data, setData] = useState<QuotesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (options == null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);

    getQuotes(options)
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
  }, [options, getQuotes]);

  return {
    getQuotes,
    getBuyWidgetData,
    getWidgetUrl,
    data,
    loading,
    error,
  };
}

export default useRampsQuotes;
