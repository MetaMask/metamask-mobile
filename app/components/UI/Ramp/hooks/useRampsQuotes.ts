import { useCallback } from 'react';
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
}

/**
 * Hook to get quote-related functions from RampsController.
 * Components call getQuotes() and manage quotes/selection locally.
 *
 * @returns getQuotes and getWidgetUrl functions.
 */
export function useRampsQuotes(): UseRampsQuotesResult {
  const getQuotes = useCallback(
    (options: GetQuotesOptions) =>
      Engine.context.RampsController.getQuotes(options),
    [],
  );

  const getWidgetUrl = useCallback(
    (quote: Quote) => Engine.context.RampsController.getWidgetUrl(quote),
    [],
  );

  return {
    getQuotes,
    getWidgetUrl,
  };
}

export default useRampsQuotes;
