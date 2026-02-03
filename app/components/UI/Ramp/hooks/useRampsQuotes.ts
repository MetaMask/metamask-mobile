import { useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { debounce } from 'lodash';
import Engine from '../../../../core/Engine';
import {
  selectQuotes,
  selectSelectedQuote,
  selectQuotesIsLoading,
  selectQuotesError,
} from '../../../../selectors/rampsController';
import type { QuotesResponse, Quote } from '@metamask/ramps-controller';

const DEBOUNCE_DELAY = 500; // 500ms debounce for amount changes

interface UseRampsQuotesOptions {
  walletAddress?: string;
  amount: number;
  redirectUrl?: string;
}

interface UseRampsQuotesReturn {
  quotes: QuotesResponse | null;
  selectedQuote: Quote | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage quote polling for ramp transactions.
 * Automatically starts/stops polling based on amount and walletAddress changes.
 * Debounces polling restarts when amount changes to avoid excessive fetches.
 * Shows loading state immediately when amount changes, even during debounce period.
 *
 * @param options - Configuration options
 * @param options.walletAddress - Destination wallet address
 * @param options.amount - Amount for the quote (in fiat for buy, crypto for sell)
 * @param options.redirectUrl - Optional redirect URL after order completion
 * @returns Quote data and loading/error states
 */
export function useRampsQuotes(
  options: UseRampsQuotesOptions,
): UseRampsQuotesReturn {
  const { walletAddress, amount, redirectUrl } = options;

  // Get quotes state from controller
  const quotes = useSelector(selectQuotes);
  const selectedQuote = useSelector(selectSelectedQuote);
  const controllerIsLoading = useSelector(selectQuotesIsLoading);
  const error = useSelector(selectQuotesError);

  // Track the amount we last started polling for
  const lastPolledAmountRef = useRef<number | null>(null);

  // Create debounced polling function
  const debouncedStartPolling = useMemo(
    () =>
      debounce(
        (pollingOptions: {
          walletAddress: string;
          amount: number;
          redirectUrl?: string;
        }) => {
          lastPolledAmountRef.current = pollingOptions.amount;
          Engine.context.RampsController.startQuotePolling(pollingOptions);
        },
        DEBOUNCE_DELAY,
      ),
    [],
  );

  // Manage polling lifecycle
  useEffect(() => {
    // Can only start polling if we have a wallet address and positive amount
    const canStartPolling = !!walletAddress && amount > 0;

    if (!canStartPolling) {
      // Stop polling if prerequisites aren't met
      Engine.context.RampsController.stopQuotePolling();
      lastPolledAmountRef.current = null;
      return undefined;
    }

    // Stop current polling immediately when dependencies change
    Engine.context.RampsController.stopQuotePolling();

    // Debounce the new polling start to avoid excessive fetches when typing
    debouncedStartPolling({ walletAddress, amount, redirectUrl });

    // Cleanup: cancel debounce and stop polling on unmount or dependency change
    return () => {
      debouncedStartPolling.cancel();
      Engine.context.RampsController.stopQuotePolling();
    };
  }, [amount, walletAddress, redirectUrl, debouncedStartPolling]);

  // Calculate if we're pending new quotes
  // This is true immediately when amount changes, before debounce fires
  // This prevents user from proceeding with stale quotes
  const isPendingNewQuotes =
    lastPolledAmountRef.current !== amount && amount > 0;

  // Combined loading state: true during debounce OR controller fetch
  const isLoading = isPendingNewQuotes || controllerIsLoading;

  return {
    quotes,
    selectedQuote,
    isLoading,
    error,
  };
}
