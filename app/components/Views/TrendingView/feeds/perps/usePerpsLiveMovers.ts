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
   * Minimum time between throttled recomputes triggered by live ticks alone
   * (a full pass over every market). Ticks arriving inside the interval
   * still merge into the ref for free; only the resulting re-render is
   * batched to at most once per interval, using the most recently
   * accumulated percents when it fires. Base data changes (new `items`,
   * a `direction`/`maxCount` change, or `enabled` toggling) always render
   * immediately — this interval only throttles tick-driven updates.
   * `0` re-renders on every tick (still gated by `throttleMs` above).
   * @default 0
   */
  recomputeIntervalMs?: number;
  /**
   * When false, the live subscription is torn down and the previously
   * displayed items are frozen in place instead of updating.
   * @default true
   */
  enabled?: boolean;
}

const EMPTY_ITEMS: PerpsFeedItem[] = [];

interface RankedMovers {
  items: PerpsFeedItem[];
  fingerprint: string;
}

/**
 * Pure rank/filter/sort/slice pass, extracted so both the render-time memo
 * below and the off-render tick-throttling logic share one implementation.
 *
 * Reuses `previousItems`' object identity for a symbol only when its base
 * feed item (from `previousBaseItems`) is the exact same object the
 * previous render used *and* its displayed percent is unchanged — i.e. the
 * only thing that could have moved is a WebSocket tick already reflected in
 * `previous`. If the base item itself changed (e.g. a REST refresh updated
 * `maxLeverage` or another field while the percent stayed the same), the
 * base item identity differs, so this always rebuilds from the fresh base
 * instead of returning stale data.
 */
const rankMovers = (
  baseItems: PerpsFeedItem[],
  direction: PerpsPriceChangeDirection,
  maxCount: number,
  livePercents: Record<string, number>,
  previousItems: PerpsFeedItem[],
  previousBaseItems: PerpsFeedItem[],
): RankedMovers => {
  const merged = baseItems.map((item) => {
    const livePercent = livePercents[item.market.symbol];
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

  const baseBySymbol = new Map(
    baseItems.map((item) => [item.market.symbol, item]),
  );
  const previousBySymbol = new Map(
    previousItems.map((item) => [item.market.symbol, item]),
  );
  const previousBaseBySymbol = new Map(
    previousBaseItems.map((item) => [item.market.symbol, item]),
  );

  const rankedItems = sorted
    .map((market) => {
      const base = baseBySymbol.get(market.symbol);
      if (!base) return undefined;
      const previous = previousBySymbol.get(market.symbol);
      const previousBase = previousBaseBySymbol.get(market.symbol);
      if (
        previous &&
        previousBase === base &&
        previous.market.change24hPercent === market.change24hPercent
      ) {
        return previous;
      }
      return { ...base, market };
    })
    .filter((item): item is PerpsFeedItem => item !== undefined);

  return { items: rankedItems, fingerprint };
};

/**
 * Ranks perps markets by live 24h price-change percentage for a movers pill
 * strip, without paying a re-render for every WebSocket tick.
 *
 * Correct gainers/losers ranking requires observing every market's live
 * percent change — a market outside the currently displayed set can move
 * into it. The WebSocket already delivers all-market updates regardless of
 * what any component subscribes to, so live ticks are merged onto a ref
 * (`livePercentsRef`) that doesn't itself trigger a render.
 *
 * The ranked slice is derived with `useMemo` directly from `items`,
 * `direction`, `maxCount`, and `enabled` — so a base-data load, a
 * gainers/losers toggle, or a resume-from-pause is reflected on the very
 * same render, using whatever live percents are already available. There is
 * no one-frame gap where the caller sees stale or empty data while loading
 * has already finished.
 *
 * Live ticks alone don't change those memo inputs, so between ticks the
 * memo doesn't re-run any work. A throttled check (bounded by
 * `recomputeIntervalMs`) runs off the render path and only requests a
 * render (by bumping a counter, which *is* a memo input) when the visible
 * top-`maxCount` slice actually changed. Idle ticks where the visible
 * movers don't change cost zero renders.
 */
export const usePerpsLiveMovers = ({
  items,
  direction,
  maxCount,
  throttleMs = 3000,
  recomputeIntervalMs = 0,
  enabled = true,
}: UsePerpsLiveMoversOptions): PerpsFeedItem[] => {
  const stream = usePerpsStream();

  // Bumped only when the throttled tick check below finds the visible
  // fingerprint changed — forces the memo to re-run even though
  // items/direction/maxCount haven't.
  const [tickVersion, setTickVersion] = useState(0);

  // Latest live percent-change per symbol. A ref (not state) so ticks don't
  // trigger a render by themselves — only a fingerprint change does, via
  // tickVersion.
  const livePercentsRef = useRef<Record<string, number>>({});
  // The last actually-rendered slice/fingerprint. Synced *after* each commit
  // (in an effect below) rather than written during the memo itself, so the
  // memo stays a pure read of its inputs. Used both for identity reuse and
  // as the basis the tick throttle compares fresh ticks against.
  const previousItemsRef = useRef<PerpsFeedItem[]>(EMPTY_ITEMS);
  const renderedFingerprintRef = useRef<string>('');
  // The `items` (base feed) the last committed render was built from. Used
  // to tell a WebSocket-tick-only render (base item identity unchanged) apart
  // from a base-data render (e.g. REST refresh delivered a new feed item)
  // even when the displayed percent happens to match in both cases.
  const previousBaseItemsRef = useRef<PerpsFeedItem[]>(EMPTY_ITEMS);

  const symbols = useMemo(
    () => items.map(({ market }) => market.symbol),
    [items],
  );
  // Memoized joined symbols to avoid resubscribing when the array reference
  // changes but its contents don't (mirrors usePerpsLivePrices).
  const symbolsKey = useMemo(() => symbols.join(','), [symbols]);

  const { items: displayed, fingerprint } = useMemo(() => {
    // Disabled: keep whatever was last rendered frozen, and skip the
    // rank/sort pass entirely rather than churning on background data
    // (e.g. a REST refresh) the caller isn't showing anyway.
    if (!enabled) {
      return {
        items: previousItemsRef.current,
        fingerprint: renderedFingerprintRef.current,
      };
    }
    return rankMovers(
      items,
      direction,
      maxCount,
      livePercentsRef.current,
      previousItemsRef.current,
      previousBaseItemsRef.current,
    );
    // tickVersion is intentionally a dependency purely to force a re-run
    // when a live tick (which doesn't otherwise change any of these inputs)
    // changes the visible ranking.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, direction, maxCount, enabled, tickVersion]);

  useEffect(() => {
    previousItemsRef.current = displayed;
    renderedFingerprintRef.current = fingerprint;
    // Only advance the "base items used to build `displayed`" marker when a
    // rank pass actually ran against `items` — while disabled, `displayed`
    // is the frozen previous result, not something built from the latest
    // `items`, so recording `items` here would make an unrelated base-data
    // change during the disabled period look like a no-op WebSocket tick
    // once re-enabled.
    if (enabled) {
      previousBaseItemsRef.current = items;
    }
  }, [displayed, fingerprint, items, enabled]);

  // Latest ranking params, readable from the subscription callback below
  // without making the subscription effect resubscribe on every
  // direction/maxCount change. Declared (and thus committed) ahead of the
  // subscription effect so a synchronous cached delivery on (re)subscribe
  // always sees the freshest params.
  const paramsRef = useRef({ items, direction, maxCount });
  useEffect(() => {
    paramsRef.current = { items, direction, maxCount };
  }, [items, direction, maxCount]);

  const lastRecomputeAtRef = useRef<number>(0);
  const pendingRecomputeTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  const clearPendingRecompute = useCallback(() => {
    if (pendingRecomputeTimerRef.current !== undefined) {
      clearTimeout(pendingRecomputeTimerRef.current);
      pendingRecomputeTimerRef.current = undefined;
    }
  }, []);

  // Off-render-path check: does the freshest accumulated live data actually
  // change the *rendered* fingerprint? Only if so is a render requested.
  // This is the one place that still pays for a full rank/filter/sort pass
  // outside of a render — but bounded to at most once per
  // recomputeIntervalMs, not once per tick.
  const maybeRequestRender = useCallback(() => {
    const {
      items: baseItems,
      direction: dir,
      maxCount: max,
    } = paramsRef.current;
    const { fingerprint: nextFingerprint } = rankMovers(
      baseItems,
      dir,
      max,
      livePercentsRef.current,
      previousItemsRef.current,
      previousBaseItemsRef.current,
    );
    if (nextFingerprint === renderedFingerprintRef.current) return;
    setTickVersion((version) => version + 1);
  }, []);

  // Latest maybeRequestRender, readable from the subscription callback
  // below without making the subscription effect resubscribe.
  const maybeRequestRenderRef = useRef(maybeRequestRender);
  useEffect(() => {
    maybeRequestRenderRef.current = maybeRequestRender;
  }, [maybeRequestRender]);

  // Trailing-throttle (not debounce) the tick-driven render request: a
  // strict debounce would never fire under a continuous stream of ticks. At
  // most one check-and-request runs per recomputeIntervalMs, always using
  // the freshest accumulated ref data by the time it fires, so batched ticks
  // are never lost — just coalesced into fewer full passes.
  const scheduleRecompute = useCallback(() => {
    if (recomputeIntervalMs <= 0) {
      lastRecomputeAtRef.current = Date.now();
      maybeRequestRenderRef.current();
      return;
    }

    if (pendingRecomputeTimerRef.current !== undefined) return;

    const elapsed = Date.now() - lastRecomputeAtRef.current;
    const delay = Math.max(recomputeIntervalMs - elapsed, 0);

    pendingRecomputeTimerRef.current = setTimeout(() => {
      pendingRecomputeTimerRef.current = undefined;
      lastRecomputeAtRef.current = Date.now();
      maybeRequestRenderRef.current();
    }, delay);
  }, [recomputeIntervalMs]);

  useEffect(() => {
    if (!enabled || symbols.length === 0) return;

    // The stream delivers its cached snapshot synchronously on (re)subscribe.
    // Reset the throttle anchor so that first cached delivery — mount, tab
    // resume, or a symbol-set change — is checked promptly instead of
    // waiting up to a full recomputeIntervalMs behind a stale timestamp.
    lastRecomputeAtRef.current = 0;
    clearPendingRecompute();

    const unsubscribe = stream.prices.subscribeToSymbols({
      symbols,
      callback: (newPrices) => {
        if (!newPrices) return;
        for (const symbol of Object.keys(newPrices)) {
          const percentChange24h = newPrices[symbol]?.percentChange24h;
          if (!percentChange24h) continue;
          const parsed = Number.parseFloat(percentChange24h);
          if (Number.isNaN(parsed)) continue;
          livePercentsRef.current[symbol] = parsed;
        }
        scheduleRecompute();
      },
      throttleMs,
    });

    return () => {
      unsubscribe();
      clearPendingRecompute();
    };
    // symbolsKey captures symbols changes via memoization, so symbols is
    // intentionally omitted to prevent re-subscriptions when the array
    // reference changes but its contents don't (mirrors usePerpsLivePrices).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stream,
    symbolsKey,
    throttleMs,
    enabled,
    scheduleRecompute,
    clearPendingRecompute,
  ]);

  return displayed;
};
