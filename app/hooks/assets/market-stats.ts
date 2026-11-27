import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  marketStatsQueryKey,
  quotesFor,
  shareMarketStatsData,
  subscribeLiveQuotes,
  type LivePriceMap,
  type MarketStatsQuoteHandlers,
} from '@metamask/core-backend';
import Engine from '../../core/Engine';
import { selectCurrentCurrency } from '../../selectors/currencyRateController';
import { getHardwareTier } from '../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../util/deviceCapability/types';
import { useNetworkTier } from '../useNetworkTier';

export { liveHoldingFiat, readLiveQuotes } from '@metamask/core-backend';
export type { LiveQuote } from '@metamask/core-backend';

/**
 * No network or a backgrounded app means the polled price stays.
 * LOW hardware on a slow cellular connection also stays on the polled price (UX matrix).
 * An unknown network stays on the stream.
 */
export function shouldStreamLivePrices(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
  appActive: boolean,
): boolean {
  if (!appActive || networkTier === 'NONE') {
    return false;
  }
  return !(hardwareTier === 'LOW' && networkTier === 'SLOW_CELLULAR');
}

function useAppActive(): boolean {
  const [appActive, setAppActive] = useState(
    () => AppState.currentState === 'active',
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      setAppActive(next === 'active');
    });
    return () => subscription.remove();
  }, []);

  return appActive;
}

function useSelectedCurrency(): string {
  return useSelector(selectCurrentCurrency) || 'usd';
}

function useListenToLivePrices(): boolean {
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const appActive = useAppActive();
  return shouldStreamLivePrices(hardwareTier, networkTier, appActive);
}

/** The open screen subscribes as this caller. */
const UI_CALLER = 'ui';

async function subscribeMarketStats(
  subscriptions: { assetId: string; currency: string }[],
): Promise<void> {
  try {
    // One `try` covers both failure modes: `call` throws synchronously when no
    // handler is registered, and the returned promise can reject.
    await Engine.controllerMessenger.call(
      'MarketStatsService:subscribe',
      subscriptions,
      UI_CALLER,
    );
  } catch {
    // The service is absent until the wallet messenger has MarketStatsService.
  }
}

/** Wait before subscribing so a setup that is discarded immediately never sends one. */
const SUBSCRIBE_DEBOUNCE_MS = 500;

/**
 * Open these assets' market-stats channels while the screen is mounted.
 * The price poll may already hold the same channels. This screen subscribes
 * as `ui`, and leaving it sends an empty list for that caller.
 *
 * The subscribe waits so a setup React discards never sends one.
 *
 * Pass a memoized list. A new array each render resubscribes each render.
 *
 * @param assetIds - CAIP-19 asset ids. An empty list opens nothing.
 */
export function useMarketStatsSubscription(assetIds: readonly string[]): void {
  const currency = useSelectedCurrency();
  const listen = useListenToLivePrices();

  useEffect(() => {
    if (!listen || assetIds.length === 0) {
      return undefined;
    }

    let sent = false;
    const timer = setTimeout(() => {
      sent = true;
      void subscribeMarketStats(
        assetIds.map((assetId) => ({ assetId, currency })),
      );
    }, SUBSCRIBE_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      if (sent) {
        void subscribeMarketStats([]);
      }
    };
  }, [assetIds, currency, listen]);
}

/**
 * Mobile's messenger returns the unsubscribe immediately, and the payload is
 * the published object. The same handler is passed to unsubscribe.
 *
 * @param handlers - Quote-map callbacks from `subscribeLiveQuotes`.
 * @returns Unsubscribe.
 */
function subscribeMobile(handlers: MarketStatsQuoteHandlers): () => void {
  Engine.controllerMessenger.subscribe(
    'MarketStatsService:pricesUpdated',
    handlers.onPricesUpdated,
  );
  return () => {
    Engine.controllerMessenger.unsubscribe(
      'MarketStatsService:pricesUpdated',
      handlers.onPricesUpdated,
    );
  };
}

/**
 * Listen for market-stats ticks and write them into the query cache.
 * Mount this once, through `MarketStatsBridge`. `useMarketStats` only reads
 * the cache, so readers never add a listener of their own.
 */
export function useMarketStatsListener(): void {
  const currency = useSelectedCurrency();
  const listen = useListenToLivePrices();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!listen) {
      return undefined;
    }
    return subscribeLiveQuotes({
      queryClient,
      currency,
      subscribe: subscribeMobile,
    });
  }, [currency, listen, queryClient]);
}

/**
 * Read the live quote map from the query cache.
 * Pass `select` with `readLiveQuotes` for the assets this reader shows.
 * A tick that does not change those quotes keeps the previous list.
 * With no `select`, the whole map is returned.
 *
 * This only reads. `MarketStatsBridge` writes the ticks.
 *
 * @param select - Slice of the quote map this reader needs.
 * @returns The selected slice, or the quote map.
 */
export function useMarketStats<Selected = LivePriceMap>(
  select?: (quotes: LivePriceMap) => Selected,
): Selected {
  const currency = useSelectedCurrency();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => marketStatsQueryKey(currency), [currency]);

  const { data } = useQuery({
    queryKey,
    // Ticks are written into the cache. This query never fetches.
    queryFn: skipToken,
    initialData: () => quotesFor(queryClient, currency),
    staleTime: Infinity,
    // Ticks arrive with no reader mounted. Keep the map for the next one.
    gcTime: Infinity,
    // The snapshot is a Map. Default sharing only walks plain objects.
    structuralSharing: shareMarketStatsData,
    select,
  });

  // `initialData` always seeds the query, so `data` is set.
  return data as Selected;
}
