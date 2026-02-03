import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectQuotes } from '../../../../selectors/rampsController';
import { type Quote, type QuotesResponse } from '@metamask/ramps-controller';
import Engine from '../../../../core/Engine';

/**
 * Options for starting quote polling.
 */
export interface StartQuotePollingOptions {
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
   * Starts automatic quote polling with a 15-second refresh interval.
   * @param options - Parameters for fetching quotes.
   */
  startQuotePolling: (options: StartQuotePollingOptions) => void;
  /**
   * Stops automatic quote polling.
   */
  stopQuotePolling: () => void;
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

  const startQuotePolling = useCallback(
    (options: StartQuotePollingOptions) =>
      Engine.context.RampsController.startQuotePolling(options),
    [],
  );

  const stopQuotePolling = useCallback(
    () => Engine.context.RampsController.stopQuotePolling(),
    [],
  );

  return {
    quotes,
    selectedQuote,
    startQuotePolling,
    stopQuotePolling,
    isLoading,
    error,
  };
}

export default useRampsQuotes;
