import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePerpsStream } from '../../../../UI/Perps/providers/PerpsStreamManager';
import { formatPercentage } from '../../../../UI/Perps/utils/formatUtils';
import {
  filterAndSortByPriceChangeDirection,
  type PerpsFeedItem,
  type PerpsPriceChangeDirection,
} from './usePerpsFeed';

export interface UsePerpsLiveMoversOptions {
  /** Base feed items to rank, typically the full market set from `usePerpsFeed`. */
  items: PerpsFeedItem[];
  /** Which side of the 24h price-change spectrum to display. */
  direction: PerpsPriceChangeDirection;
  /** Number of ranked items to keep — matches the pill strip's display cap. */
  maxCount: number;
  /** Throttle delay for the underlying price subscription. @default 3000 */
  throttleMs?: number;
  /**
   * When false, the live subscription is torn down and the previously
   * displayed items are frozen in place instead of updating.
   * @default true
   */
  enabled?: boolean;
}

const EMPTY_ITEMS: PerpsFeedItem[] = [];

/**
 * Ranks perps markets by live 24h price-change percentage for a movers pill
 * strip, without paying a re-render for every WebSocket tick.
 *
 * Correct gainers/losers ranking requires observing every market's live
 * percent change — a market outside the currently displayed set can move
 * into it. The WebSocket already delivers all-market updates regardless of
 * what any component subscribes to, so this hook keeps the merge/filter/sort
 * work on a ref between ticks and only commits React state when the
 * *displayed* top `maxCount` slice actually changes (by symbol, order, or
 * rounded percent). Idle ticks where the visible movers don't change cost
 * zero renders.
 *
 * Items whose displayed value didn't change keep their previous object
 * reference, so memoized pill components skip re-rendering too.
 */
export const usePerpsLiveMovers = ({
  items,
  direction,
  maxCount,
  throttleMs = 3000,
  enabled = true,
}: UsePerpsLiveMoversOptions): PerpsFeedItem[] => {
  const stream = usePerpsStream();
  const [displayed, setDisplayed] = useState<PerpsFeedItem[]>(EMPTY_ITEMS);

  const itemsRef = useRef<PerpsFeedItem[]>(items);
  const displayedRef = useRef<PerpsFeedItem[]>(EMPTY_ITEMS);
  const fingerprintRef = useRef<string>('');
  // Latest live percent-change per symbol. A ref (not state) so ticks don't
  // trigger a render by themselves — only the fingerprint check below does.
  const livePercentsRef = useRef<Record<string, number>>({});

  const symbols = useMemo(
    () => items.map(({ market }) => market.symbol),
    [items],
  );
  // Memoized joined symbols to avoid resubscribing when the array reference
  // changes but its contents don't (mirrors usePerpsLivePrices).
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const recompute = useCallback(() => {
    const baseItems = itemsRef.current;
    const merged = baseItems.map((item) => {
      const livePercent = livePercentsRef.current[item.market.symbol];
      if (livePercent === undefined) return item.market;
      return {
        ...item.market,
        change24hPercent: formatPercentage(livePercent),
      };
    });
    const sorted = filterAndSortByPriceChangeDirection(merged, direction).slice(
      0,
      maxCount,
    );

    const fingerprint = sorted
      .map((market) => `${market.symbol}:${market.change24hPercent}`)
      .join('|');
    if (fingerprint === fingerprintRef.current) {
      return;
    }
    fingerprintRef.current = fingerprint;

    const baseBySymbol = new Map(
      baseItems.map((item) => [item.market.symbol, item]),
    );
    const previousBySymbol = new Map(
      displayedRef.current.map((item) => [item.market.symbol, item]),
    );

    const next = sorted
      .map((market) => {
        const base = baseBySymbol.get(market.symbol);
        if (!base) return undefined;
        const previous = previousBySymbol.get(market.symbol);
        // Reuse the previous item's identity when its displayed value is
        // unchanged so React.memo'd pills relying on shallow prop
        // comparison skip re-rendering too.
        if (
          previous &&
          previous.market.change24hPercent === market.change24hPercent
        ) {
          return previous;
        }
        return { ...base, market };
      })
      .filter((item): item is PerpsFeedItem => item !== undefined);

    displayedRef.current = next;
    setDisplayed(next);
  }, [direction, maxCount]);

  // Latest recompute, readable from the subscription callback below without
  // making the subscription effect resubscribe on every direction/maxCount
  // change.
  const recomputeRef = useRef(recompute);
  useEffect(() => {
    recomputeRef.current = recompute;
  }, [recompute]);

  // Recompute from the base feed whenever it (or the ranking params) change
  // — e.g. initial load, pull-to-refresh, or the gainers/losers toggle.
  // Gated on `enabled` so a hidden/unfocused strip stays frozen rather than
  // picking up REST refreshes in the background.
  useEffect(() => {
    if (!enabled) return;
    itemsRef.current = items;
    recompute();
  }, [enabled, recompute, items]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols,
      callback: (newPrices) => {
        if (!newPrices) return;
        for (const symbol of Object.keys(newPrices)) {
          const percentChange24h = newPrices[symbol]?.percentChange24h;
          if (!percentChange24h) continue;
          const parsed = parseFloat(percentChange24h);
          if (Number.isNaN(parsed)) continue;
          livePercentsRef.current[symbol] = parsed;
        }
        recomputeRef.current();
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
    };
    // symbolsKey captures symbols changes via memoization, so symbols is
    // intentionally omitted to prevent re-subscriptions when the array
    // reference changes but its contents don't (mirrors usePerpsLivePrices).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream, symbolsKey, throttleMs, enabled]);

  return displayed;
};
