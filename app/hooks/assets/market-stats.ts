import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
 * A 30-second price batch is the same on every hardware tier.
 * No network means the polled price stays. An unknown network stays on the stream.
 */
export function shouldStreamLivePrices(
  hardwareTier: HardwareTier | null,
  networkTier: NetworkTier | null,
  appActive: boolean,
): boolean {
  if (!appActive || networkTier === 'NONE') {
    return false;
  }
  switch (hardwareTier) {
    case 'LOW':
    case 'MID':
    case 'HIGH':
    case null:
      return true;
    default:
      return true;
  }
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

function subscribeMarketStats(
  subscriptions: { assetId: string; currency: string }[],
): void {
  try {
    Engine.controllerMessenger
      .call('MarketStatsService:subscribe', subscriptions, UI_CALLER)
      .catch(() => undefined);
  } catch {
    // The service is absent until the wallet messenger has MarketStatsService.
  }
}

/**
 * Open these assets' market-stats channels while the screen is mounted.
 * The price poll may already hold the same channels. This screen subscribes
 * as `ui`, and leaving it sends an empty list for that caller.
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
    subscribeMarketStats(assetIds.map((assetId) => ({ assetId, currency })));
    return () => {
      subscribeMarketStats([]);
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
 * Read the live quote map from the query cache.
 * Pass `select` with `readLiveQuotes` for the assets this reader shows.
 * A tick that does not change those quotes keeps the previous list.
 * With no `select`, the whole map is returned.
 *
 * @param select - Slice of the quote map this reader needs.
 * @returns The selected slice, or the quote map.
 */
export function useMarketStats<Selected = LivePriceMap>(
  select?: (quotes: LivePriceMap) => Selected,
): Selected {
  const currency = useSelectedCurrency();
  const listen = useListenToLivePrices();
  const queryClient = useQueryClient();
  const queryKey = useMemo(() => marketStatsQueryKey(currency), [currency]);

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

  const { data } = useQuery({
    queryKey,
    queryFn: () => quotesFor(queryClient, currency),
    initialData: () => quotesFor(queryClient, currency),
    staleTime: Infinity,
    gcTime: Infinity,
    // The snapshot is a Map. Default sharing only walks plain objects.
    structuralSharing: shareMarketStatsData,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    select,
  });

  return data;
}
