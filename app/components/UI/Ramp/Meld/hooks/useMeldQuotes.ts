/**
 * Hook to fetch real-time quotes from Meld.
 *
 * Replaces: useQuotes + useSortedQuotes from the aggregator pattern.
 * Maps to: POST /payments/crypto/quote
 *
 * Key difference from the old aggregator:
 * - Old: SDK calls on-ramp API → API fans out to individual providers → SDK aggregates
 * - New: One call to Meld → Meld fans out to all providers → returns sorted quotes
 *
 * Meld returns a `customerScore` per quote that we use for sorting (higher = better).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import meldApi from '../api';
import { useMeldContext } from '../MeldProvider';
import { MeldQuote, MeldQuoteRequest } from '../types';
import Logger from '../../../../../util/Logger';

interface UseMeldQuotesOptions {
  /** Auto-refresh interval in ms. 0 to disable. Default: 30000 (30s). */
  refreshInterval?: number;
}

interface UseMeldQuotesResult {
  quotes: MeldQuote[];
  isFetching: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export default function useMeldQuotes(
  amount: string | number,
  options: UseMeldQuotesOptions = {},
): UseMeldQuotesResult {
  const { refreshInterval = 30000 } = options;

  const {
    selectedCountry,
    selectedFiatCurrency,
    selectedCrypto,
    selectedPaymentMethod,
    walletAddress,
    isBuy,
  } = useMeldContext();

  const [quotes, setQuotes] = useState<MeldQuote[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const mountedRef = useRef(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(
    () => () => {
      mountedRef.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    },
    [],
  );

  const canFetch =
    !!selectedCountry &&
    !!selectedFiatCurrency &&
    !!selectedCrypto &&
    !!amount &&
    Number(amount) > 0;

  const fetchQuotes = useCallback(async () => {
    if (
      !canFetch ||
      !selectedCountry ||
      !selectedFiatCurrency ||
      !selectedCrypto
    ) {
      return;
    }

    setIsFetching(true);
    setError(null);

    try {
      const request: MeldQuoteRequest = isBuy
        ? {
            sourceAmount: String(amount),
            sourceCurrencyCode: selectedFiatCurrency.currencyCode,
            destinationCurrencyCode: selectedCrypto.currencyCode,
            countryCode: selectedCountry.countryCode,
            ...(selectedPaymentMethod && {
              paymentMethodType: selectedPaymentMethod,
            }),
            ...(walletAddress && { walletAddress }),
          }
        : {
            sourceAmount: String(amount),
            sourceCurrencyCode: selectedCrypto.currencyCode,
            destinationCurrencyCode: selectedFiatCurrency.currencyCode,
            countryCode: selectedCountry.countryCode,
            ...(selectedPaymentMethod && {
              paymentMethodType: selectedPaymentMethod,
            }),
            ...(walletAddress && { walletAddress }),
          };

      Logger.log('[useMeldQuotes] Fetching quotes:', JSON.stringify(request));
      const result = await meldApi.getQuotes(request);

      if (mountedRef.current) {
        setQuotes(result);
        setIsFetching(false);
      }
    } catch (err) {
      const fetchError = err instanceof Error ? err : new Error(String(err));
      Logger.error(fetchError, '[useMeldQuotes] failed');
      if (mountedRef.current) {
        setError(fetchError);
        setIsFetching(false);
      }
    }
  }, [
    canFetch,
    amount,
    selectedCountry,
    selectedFiatCurrency,
    selectedCrypto,
    selectedPaymentMethod,
    walletAddress,
    isBuy,
  ]);

  // Initial fetch
  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  // Auto-refresh
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (refreshInterval > 0 && canFetch) {
      intervalRef.current = setInterval(fetchQuotes, refreshInterval);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchQuotes, refreshInterval, canFetch]);

  return {
    quotes,
    isFetching,
    error,
    refetch: fetchQuotes,
  };
}
