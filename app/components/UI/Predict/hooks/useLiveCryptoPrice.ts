import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveCryptoPrices } from './useLiveCryptoPrices';
import type { CryptoPriceUpdate, CryptoTwapWindowSeconds } from '../types';

const DEFAULT_UPDATE_INTERVAL_MS = 1000;

export interface UseLiveCryptoPriceParams {
  symbol: string | undefined;
  enabled?: boolean;
  twapWindowSeconds?: CryptoTwapWindowSeconds;
  /**
   * Minimum time between committed price updates. Defaults to once per
   * second — plenty for a summary label that isn't rendering a chart.
   */
  updateIntervalMs?: number;
}

export interface UseLiveCryptoPriceResult {
  value: number | undefined;
}

/**
 * Minimal live-price ticker: subscribes to the crypto price websocket feed
 * for `symbol` and exposes only the latest price, committed at most once
 * every `updateIntervalMs`.
 *
 * Unlike `useCryptoUpDownChartData`, this does **not** build or maintain a
 * point-history array (no per-tick merge/trim/reduce), so it's much cheaper
 * for summary UI — e.g. the homepage BTC row — that only ever displays the
 * latest scalar price and never renders a chart.
 */
export const useLiveCryptoPrice = ({
  symbol,
  enabled = true,
  twapWindowSeconds,
  updateIntervalMs = DEFAULT_UPDATE_INTERVAL_MS,
}: UseLiveCryptoPriceParams): UseLiveCryptoPriceResult => {
  const [value, setValue] = useState<number | undefined>(undefined);
  const lastCommitAtRef = useRef<number | undefined>(undefined);
  const pendingPriceRef = useRef<number | undefined>(undefined);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const commit = useCallback((price: number) => {
    lastCommitAtRef.current = Date.now();
    pendingPriceRef.current = undefined;
    setValue(price);
  }, []);

  const handleUpdate = useCallback(
    (update: CryptoPriceUpdate) => {
      pendingPriceRef.current = update.price;
      const elapsedSinceCommit = lastCommitAtRef.current
        ? Date.now() - lastCommitAtRef.current
        : updateIntervalMs;

      if (elapsedSinceCommit >= updateIntervalMs) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = undefined;
        }
        commit(update.price);
        return;
      }

      // A commit is already scheduled for the remainder of this interval;
      // the pending price above will be picked up when it fires.
      if (timerRef.current) return;

      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        if (typeof pendingPriceRef.current === 'number') {
          commit(pendingPriceRef.current);
        }
      }, updateIntervalMs - elapsedSinceCommit);
    },
    [commit, updateIntervalMs],
  );

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    // Reset pending/commit bookkeeping on symbol changes so a stale timer
    // from the previous subscription can't commit a price for the new one.
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = undefined;
    }
    pendingPriceRef.current = undefined;
    lastCommitAtRef.current = undefined;
  }, [symbol, twapWindowSeconds]);

  const wsSymbol = enabled && symbol ? `${symbol.toLowerCase()}/usd` : '';
  const liveSubscriptionArgs: [
    string,
    typeof handleUpdate,
    twapWindowSeconds?: typeof twapWindowSeconds,
  ] =
    twapWindowSeconds !== undefined
      ? [wsSymbol, handleUpdate, twapWindowSeconds]
      : [wsSymbol, handleUpdate];
  useLiveCryptoPrices(...liveSubscriptionArgs);

  return { value };
};
