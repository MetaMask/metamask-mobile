import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useSelector } from 'react-redux';
import {
  MarketStatsStore,
  readLiveQuote,
  type LivePriceMap,
  type LiveQuote,
} from '@metamask/assets-controller';
import type { CaipAssetType } from '@metamask/utils';
import Engine from '../../core/Engine';
import { selectCurrentCurrency } from '../../selectors/currencyRateController';
import { getHardwareTier } from '../../util/deviceCapability';
import type {
  HardwareTier,
  NetworkTier,
} from '../../util/deviceCapability/types';
import { useNetworkTier } from '../useNetworkTier';

export { readLiveQuote } from '@metamask/assets-controller';
export type { LiveQuote } from '@metamask/assets-controller';

const marketStats = new MarketStatsStore();

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

/**
 * Fiat value of a holding at a streamed unit price.
 * Returns undefined when either input cannot be multiplied.
 *
 * @param balanceAmount - Unformatted token amount.
 * @param price - Unit price in the selected currency.
 * @returns The holding in fiat, or undefined.
 */
export function liveHoldingFiat(
  balanceAmount: number | undefined,
  price: number | undefined,
): number | undefined {
  if (
    balanceAmount === undefined ||
    price === undefined ||
    !Number.isFinite(balanceAmount) ||
    !Number.isFinite(price)
  ) {
    return undefined;
  }
  const holding = balanceAmount * price;
  return Number.isFinite(holding) ? holding : undefined;
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
  const currency = useSelector(selectCurrentCurrency) || 'usd';
  marketStats.setCurrency(currency);
  return currency;
}

export function useLiveAssetPrices(): LivePriceMap {
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const appActive = useAppActive();
  useSelectedCurrency();
  const listen = shouldStreamLivePrices(hardwareTier, networkTier, appActive);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const unsubscribeStore = marketStats.subscribe(onStoreChange);
      if (!listen) {
        return unsubscribeStore;
      }
      const onPrices = (payload: unknown) => {
        marketStats.ingestPrices(payload);
      };
      const onChainStatus = (payload: unknown) => {
        marketStats.ingestChainStatus(payload);
      };
      // subscribe returns void. Cleanup goes through unsubscribe with the same handler.
      Engine.controllerMessenger.subscribe(
        'MarketStatsService:pricesUpdated',
        onPrices,
      );
      Engine.controllerMessenger.subscribe(
        'MarketStatsService:chainStatusChanged',
        onChainStatus,
      );
      return () => {
        unsubscribeStore();
        Engine.controllerMessenger.unsubscribe(
          'MarketStatsService:pricesUpdated',
          onPrices,
        );
        Engine.controllerMessenger.unsubscribe(
          'MarketStatsService:chainStatusChanged',
          onChainStatus,
        );
      };
    },
    [listen],
  );

  return useSyncExternalStore(
    subscribe,
    marketStats.getSnapshot,
    marketStats.getSnapshot,
  );
}

export function useLiveQuote(
  assetId: CaipAssetType | string | undefined | null,
): LiveQuote | undefined {
  return readLiveQuote(useLiveAssetPrices(), assetId ?? undefined);
}

function unsubscribeMarketStats(assetId: string, currency: string): void {
  try {
    Engine.controllerMessenger
      .call('MarketStatsService:unsubscribe', { assetId, currency })
      .catch(() => undefined);
  } catch {
    // The service is absent until core-backend ships MarketStatsService.
  }
}

/**
 * Open one market-stats channel while this screen is mounted.
 * Tracked assets are also subscribed by the controller. The service refcounts.
 */
export function useWatchAssetPrice(assetId: string | undefined | null): void {
  const currency = useSelectedCurrency();
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const appActive = useAppActive();
  const listen = shouldStreamLivePrices(hardwareTier, networkTier, appActive);

  useEffect(() => {
    if (!assetId || !listen) {
      return undefined;
    }
    let cancelled = false;
    let subscribed = false;
    try {
      Engine.controllerMessenger
        .call('MarketStatsService:subscribe', { assetId, currency })
        .then(() => {
          subscribed = true;
          if (cancelled) {
            unsubscribeMarketStats(assetId, currency);
          }
        })
        .catch(() => undefined);
    } catch {
      return undefined;
    }
    return () => {
      cancelled = true;
      if (subscribed) {
        unsubscribeMarketStats(assetId, currency);
      }
    };
  }, [assetId, currency, listen]);
}

/**
 * Open market-stats channels for the assets in the token list.
 *
 * The price poll only subscribes an asset when its stored spot price has
 * `wssSupport`. The list still needs a quote for every row, so it subscribes
 * the visible ids itself. A channel that is already open is left as it is.
 * This does not unsubscribe: a second subscribe does not take its own
 * reference, so an unsubscribe here would close a channel the poll still uses.
 */
export function useWatchAssetPrices(assetIds: readonly string[]): void {
  const currency = useSelectedCurrency().toLowerCase();
  const networkTier = useNetworkTier();
  const hardwareTier = getHardwareTier();
  const appActive = useAppActive();
  const listen = shouldStreamLivePrices(hardwareTier, networkTier, appActive);
  const subscriptionKey = [...new Set(assetIds.filter((id) => id.length > 0))]
    .sort()
    .join('\n');

  useEffect(() => {
    if (!listen || subscriptionKey.length === 0) {
      return;
    }
    const subscriptions = subscriptionKey.split('\n').map((assetId) => ({
      assetId,
      currency,
    }));
    try {
      Engine.controllerMessenger
        .call('MarketStatsService:subscribe', subscriptions)
        .catch(() => undefined);
    } catch {
      // The service is absent until the wallet messenger has MarketStatsService.
    }
  }, [subscriptionKey, currency, listen]);
}
