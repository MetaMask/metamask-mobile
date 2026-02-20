import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectQuotes } from '../../../../selectors/rampsController';
import { type QuotesResponse } from '@metamask/ramps-controller';
import type { Quote } from '../types';
import Engine from '../../../../core/Engine';

/**
 * Options for fetching quotes for the current selection.
 */
export interface FetchQuotesForSelectionOptions {
  /**
   * The destination wallet address.
   */
  walletAddress: string;
  /**
   * The amount (in fiat for buy, crypto for sell).
   */
  amount: number;
  /**
   * Optional redirect URL after order completion.
   */
  redirectUrl?: string;
}

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
   * The quotes data with success, sorted, error, and customActions arrays.
   */
  quotes: QuotesResponse | null;
  /**
   * The currently selected quote, or null if none selected.
   */
  selectedQuote: Quote | null;
  /**
   * Fetches quotes and updates controller state. Returns the response.
   */
  getQuotes: (options: GetQuotesOptions) => Promise<QuotesResponse>;
  /**
   * Sets the currently selected quote.
   */
  setSelectedQuote: (quote: Quote | null) => void;
  /**
   * Fetches quotes for the currently selected token, provider, and payment method.
   * @param options - Parameters for fetching quotes.
   */
  fetchQuotesForSelection: (options: FetchQuotesForSelectionOptions) => void;
  /**
   * Fetches the widget URL from a quote for redirect providers.
   * Makes a request to the buyURL endpoint to get the actual provider widget URL.
   * @param quote - The quote to fetch the widget URL from.
   * @returns Promise resolving to the widget URL string, or null if not available.
   */
  getWidgetUrl: (quote: Quote) => Promise<string | null>;
  /**
   * Whether the quotes request is currently loading.
   */
  isLoading: boolean;
  /**
   * The error message if the request failed, or null.
   */
  error: string | null;
}

/**
 * Hook to get quotes state from RampsController and control quote polling.
 * This hook assumes Engine is already initialized.
 *
 * @returns Quotes state and polling control functions.
 */
export function useRampsQuotes(): UseRampsQuotesResult {
  const {
    data: quotes,
    selected: selectedQuote,
    isLoading,
    error,
  } = useSelector(selectQuotes);

  const fetchQuotesForSelection = useCallback(
    (options: FetchQuotesForSelectionOptions) =>
      Engine.context.RampsController.fetchQuotesForSelection(options),
    [],
  );

  const getQuotes = useCallback(
    (options: GetQuotesOptions) =>
      Engine.context.RampsController.getQuotes(options),
    [],
  );

  const setSelectedQuote = useCallback(
    (quote: Quote | null) =>
      Engine.context.RampsController.setSelectedQuote(quote),
    [],
  );

  const getWidgetUrl = useCallback(
    (quote: Quote) => Engine.context.RampsController.getWidgetUrl(quote),
    [],
  );

  return {
    quotes,
    selectedQuote,
    getQuotes,
    setSelectedQuote,
    fetchQuotesForSelection,
    getWidgetUrl,
    isLoading,
    error,
  };
}

export default useRampsQuotes;
