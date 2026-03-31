import { useEffect, useRef } from 'react';
import { sleep } from '@walletconnect/utils';
import type { CandleData } from '@metamask/perps-controller';

const TOO_MANY_REQUESTS_REGEX = /too many requests/i;
const MAX_RETRIES = 12;
const RETRY_DELAY_MS = 5000;

/**
 * Retries `fetchMoreHistory` with exponential back-off when the candle
 * subscription fails with a "too many requests" rate-limit error.
 *
 * Stops retrying once candles arrive or the retry budget is exhausted.
 */
export const useRefetchCandleDataOnError = ({
  candleData,
  candleError,
  fetchMoreHistory,
}: {
  candleData: CandleData | null;
  candleError: Error | null;
  fetchMoreHistory: () => Promise<void>;
}) => {
  const candlesRefetchRef = useRef<{
    candles: CandleData['candles'];
    error: Error | null;
  }>({ candles: [], error: null });
  const fetchMoreHistoryRef = useRef<() => Promise<void>>(fetchMoreHistory);

  useEffect(() => {
    candlesRefetchRef.current.candles = candleData?.candles ?? [];
    candlesRefetchRef.current.error = candleError;
    fetchMoreHistoryRef.current = fetchMoreHistory;
  }, [candleData, candleError, fetchMoreHistory]);

  const candleErrorMessage = candleError?.message;
  const shouldRetry =
    !!candleErrorMessage && TOO_MANY_REQUESTS_REGEX.test(candleErrorMessage);

  useEffect(() => {
    if (!shouldRetry) return;
    let isMounted = true;

    const retry = async (retryCount: number = 0) => {
      if (retryCount >= MAX_RETRIES) return;
      if (!isMounted) return;
      if (candlesRefetchRef.current.candles.length > 0) return;
      await sleep(RETRY_DELAY_MS);
      if (!isMounted) return;
      if (candlesRefetchRef.current.candles.length > 0) return;
      await fetchMoreHistoryRef.current();
      await retry(retryCount + 1);
    };

    retry();
    return () => {
      isMounted = false;
    };
  }, [shouldRetry]);
};
