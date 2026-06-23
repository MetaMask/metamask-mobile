import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import { chainNameToId } from '../utils/chainMapping';
import { isPerpPosition, isClosedPosition } from '../utils/perp';
import {
  fetchHyperliquidHistoricalPrices,
  resolveHyperliquidCandleLimit,
  type HyperliquidCandleInterval,
} from '../utils/hyperliquidPrices';
import {
  getAssetImageUrl,
  toAssetId,
} from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { caipChainIdToHex } from '../../../UI/Rewards/utils/formatUtils';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { selectCurrentCurrency } from '../../../../selectors/currencyRateController';
import Logger from '../../../../util/Logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TIME_PERIODS = ['1H', '1D', '1W', '1M', 'All'] as const;
type TimePeriod = (typeof TIME_PERIODS)[number];

const PERIOD_TO_API: Record<TimePeriod, string> = {
  '1H': '1d',
  '1D': '1d',
  '1W': '7d',
  '1M': '1m',
  All: '3y',
};

const PERIOD_DURATION_MS: Record<TimePeriod, number> = {
  '1H': 60 * 60 * 1000,
  '1D': 24 * 60 * 60 * 1000,
  '1W': 7 * 24 * 60 * 60 * 1000,
  '1M': 30 * 24 * 60 * 60 * 1000,
  All: 3 * 365 * 24 * 60 * 60 * 1000,
};

const TRADE_FOCUS_PREFETCH_PERIODS: readonly TimePeriod[] = ['1M', 'All'];

/**
 * Hyperliquid candle interval + baseline candle count per chart period. The base
 * count fills the period's default window when a position has no (or only recent)
 * trades; for older / closed positions {@link resolveHyperliquidCandleLimit} grows
 * it to reach the earliest trade, capped at the API's per-request maximum
 * (~5000 candles). Counts stay well above CHART_DATA_THRESHOLD so the line stays
 * smooth. Unlike the spot API, each period maps to a distinct interval
 * (granularity), so there's no 1D→1H reuse.
 */
const PERP_PERIOD_TO_CANDLES: Record<
  TimePeriod,
  { interval: HyperliquidCandleInterval; baseLimit: number }
> = {
  '1H': { interval: '1m', baseLimit: 60 }, // 60 × 1m  = 1 hour
  '1D': { interval: '15m', baseLimit: 96 }, // 96 × 15m = 24 hours
  '1W': { interval: '1h', baseLimit: 168 }, // 168 × 1h = 7 days
  '1M': { interval: '4h', baseLimit: 180 }, // 180 × 4h = 30 days
  All: { interval: '1d', baseLimit: 1095 }, // 1095 × 1d ≈ 3 years (matches spot 'All')
};

/**
 * Derives percentage change from historical price data points.
 * For "1H" we find the point closest to one hour ago within the data set.
 * @param nowMs - Same clock as used to slice 1H prices (avoids mismatched "now").
 */
function derivePercentChange(
  prices: TokenPrice[],
  period: TimePeriod,
  nowMs: number,
): number | undefined {
  if (!prices.length) return undefined;

  const endPrice = prices[prices.length - 1][1];
  let startPrice: number;

  if (period === '1H') {
    const oneHourAgo = nowMs - 60 * 60 * 1000;
    const closest = prices.reduce((best, pt) =>
      Math.abs(Number(pt[0]) - oneHourAgo) <
      Math.abs(Number(best[0]) - oneHourAgo)
        ? pt
        : best,
    );
    startPrice = closest[1];
  } else {
    startPrice = prices[0][1];
  }

  if (startPrice === 0) return undefined;
  return ((endPrice - startPrice) / startPrice) * 100;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface TraderPositionData {
  // Token
  symbol: string;
  tokenImageUrl: string | undefined;
  marketCap: number | undefined;
  /** Latest price from the chart feed. Surfaced for perps (no market cap). */
  currentPrice: number | undefined;
  isPerp: boolean;

  // Chart
  historicalPrices: TokenPrice[];
  priceDiff: number;
  isPricesLoading: boolean;
  pricePercentChange: number | undefined;

  // Position card
  isClosed: boolean;
  positionValue: number | null | undefined;
  pnlValue: number | null | undefined;
  pnlPercent: number | null;
  isPnlPositive: boolean;

  allTrades: Position['trades'];
  chartTrades: Position['trades'];

  // Time period
  activeTimePeriod: TimePeriod;
  setActiveTimePeriod: (period: TimePeriod) => void;
  timePeriods: readonly TimePeriod[];
}

export type { TimePeriod };
export { TIME_PERIODS };

export function useTraderPositionData(
  positionParam: Position | undefined,
  tokenSymbol?: string,
  /**
   * Authoritative closed/open flag from the caller's list context (e.g. the
   * profile tab). Falls back to {@link isClosedPosition} when omitted.
   */
  isClosedOverride?: boolean,
): TraderPositionData {
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>('1M');

  const caipChainId = useMemo(
    () => (positionParam ? chainNameToId(positionParam.chain) : undefined),
    [positionParam],
  );

  const hexChainId = useMemo(
    () => (caipChainId ? caipChainIdToHex(caipChainId) : undefined),
    [caipChainId],
  );

  const tokenImageUrl = useMemo(() => {
    if (!positionParam || !caipChainId) return undefined;
    return getAssetImageUrl(positionParam.tokenAddress, caipChainId);
  }, [positionParam, caipChainId]);

  const isPerp = useMemo(
    () => positionParam != null && isPerpPosition(positionParam),
    [positionParam],
  );

  // Stable cache key per perp position; prices cached under a different key (a
  // previously-viewed position) are treated as a miss (see `resolvedPrices`).
  const perpKey = useMemo(
    () =>
      isPerp && positionParam
        ? `${positionParam.chain}:${positionParam.tokenSymbol}`
        : '',
    [isPerp, positionParam],
  );

  // Earliest trade time (ms) — anchors the perp candle window back to the
  // position's first trade so closed positions still frame their trades.
  const earliestTradeMs = useMemo(() => {
    const trades = positionParam?.trades;
    if (!trades?.length) return undefined;
    let min = Infinity;
    for (const trade of trades) {
      const ms =
        trade.timestamp > 0 && trade.timestamp < 1e12
          ? trade.timestamp * 1000
          : trade.timestamp;
      if (Number.isFinite(ms) && ms < min) min = ms;
    }
    return Number.isFinite(min) ? min : undefined;
  }, [positionParam?.trades]);

  // ── Market cap ──────────────────────────────────────────────────────────

  const allMarketData = useSelector(selectTokenMarketData);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const cachedMarket = hexChainId
    ? allMarketData?.[hexChainId]?.[
        positionParam?.tokenAddress?.toLowerCase() as Hex
      ]
    : undefined;

  const [fetchedMarketCap, setFetchedMarketCap] = useState<number>();

  useEffect(() => {
    setFetchedMarketCap(undefined);

    if (cachedMarket?.marketCap != null || !positionParam || !caipChainId)
      return;
    const assetId = toAssetId(positionParam.tokenAddress, caipChainId);
    if (!assetId) return;

    let cancelled = false;
    (async () => {
      try {
        const url = `https://price.api.cx.metamask.io/v3/spot-prices?${new URLSearchParams(
          {
            assetIds: assetId,
            includeMarketData: 'true',
            vsCurrency: currentCurrency.toLowerCase(),
          },
        )}`;
        const response = (await handleFetch(url)) as Record<
          string,
          Record<string, unknown>
        >;
        const cap = response?.[assetId]?.marketCap;
        if (!cancelled && typeof cap === 'number') {
          setFetchedMarketCap(cap);
        }
      } catch (err) {
        Logger.error(
          err as Error,
          'useTraderPositionData: failed to fetch market data',
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cachedMarket?.marketCap, positionParam, caipChainId, currentCurrency]);

  const marketCap = cachedMarket?.marketCap ?? fetchedMarketCap;

  // ── Historical prices ───────────────────────────────────────────────────

  const [allPrices, setAllPrices] = useState<
    Partial<Record<TimePeriod, TokenPrice[]>>
  >({});
  // Perp prices are cached lazily, per selected period, scoped to one position
  // via `key`. A stale-position cache is ignored rather than cleared, so there's
  // no flash of empty data when switching positions.
  const [perpCache, setPerpCache] = useState<{
    key: string;
    prices: Partial<Record<TimePeriod, TokenPrice[]>>;
  }>({ key: '', prices: {} });
  const [isPricesLoading, setIsPricesLoading] = useState(true);

  useEffect(() => {
    if (!positionParam) {
      setAllPrices({});
      setIsPricesLoading(false);
      return;
    }

    // Hyperliquid perps have no CAIP id and use the exchange's candle feed
    // directly; they're fetched lazily, per selected period, by the effect below.
    if (isPerpPosition(positionParam)) return;

    // Spot tokens resolve prices via the MetaMask price API, which needs a CAIP
    // chain id.
    if (!caipChainId) {
      setAllPrices({});
      setIsPricesLoading(false);
      return;
    }

    setIsPricesLoading(true);
    let cancelled = false;

    // ── Spot tokens: MetaMask price API ──────────────────────────────────────
    const assetIdentifier = `erc20:${positionParam.tokenAddress}`;
    const vsCurrency = currentCurrency.toLowerCase();

    const fetchPeriod = async (period: TimePeriod) => {
      const apiPeriod = PERIOD_TO_API[period];
      const uri = `https://price.api.cx.metamask.io/v3/historical-prices/${caipChainId}/${assetIdentifier}?timePeriod=${apiPeriod}&vsCurrency=${vsCurrency}`;
      try {
        const response = await fetch(uri);
        if (response.status === 204 || !response.ok)
          return { period, prices: [] as TokenPrice[] };
        const data: { prices: [number, number][] } = await response.json();
        const prices: TokenPrice[] = (data.prices ?? []).map(
          ([timestamp, price]) =>
            [timestamp.toString(), Number(price)] as TokenPrice,
        );
        return { period, prices };
      } catch (err) {
        Logger.error(
          err as Error,
          `useTraderPositionData: failed to fetch ${period} prices`,
        );
        return { period, prices: [] as TokenPrice[] };
      }
    };

    // 1H and 1D share the same API call ('1d') — fetch once, reuse.
    const uniquePeriods: TimePeriod[] = ['1D', '1W', '1M', 'All'];

    Promise.all(uniquePeriods.map(fetchPeriod)).then((results) => {
      if (cancelled) return;
      const cache: Partial<Record<TimePeriod, TokenPrice[]>> = {};
      for (const { period, prices } of results) {
        cache[period] = prices;
        if (period === '1D') cache['1H'] = prices;
      }
      setAllPrices(cache);
      setIsPricesLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [positionParam, caipChainId, currentCurrency]);

  // ── Hyperliquid perps: cached candleSnapshot data ─────────────────────────
  // Fetch the selected period plus 1M/All ahead of trade taps. Trade focus only
  // jumps between 1M and All, so warming both avoids a fresh network request on
  // most taps. The candle count is anchored back to the earliest trade (capped at
  // the API max) so closed positions still frame their trades.
  useEffect(() => {
    if (!positionParam || !isPerp) return;

    const periodsToFetch = Array.from(
      new Set([activeTimePeriod, ...TRADE_FOCUS_PREFETCH_PERIODS]),
    ).filter(
      (period) => !(perpCache.key === perpKey && perpCache.prices[period]),
    );

    if (!periodsToFetch.length) {
      setIsPricesLoading(false);
      return;
    }

    const isFetchingActivePeriod = periodsToFetch.includes(activeTimePeriod);
    setIsPricesLoading(isFetchingActivePeriod);
    let cancelled = false;
    const nowMs = Date.now();

    // fetchHyperliquidHistoricalPrices never rejects (it logs + returns [] on
    // failure), so the empty result is cached and we don't refetch in a loop.
    periodsToFetch.forEach((period) => {
      const { interval, baseLimit } = PERP_PERIOD_TO_CANDLES[period];
      const limit = resolveHyperliquidCandleLimit({
        interval,
        baseLimit,
        earliestTradeMs,
        nowMs,
      });

      fetchHyperliquidHistoricalPrices({
        symbol: positionParam.tokenSymbol,
        interval,
        limit,
        nowMs,
      }).then((prices) => {
        if (cancelled) return;
        setPerpCache((prev) => ({
          key: perpKey,
          prices:
            prev.key === perpKey
              ? { ...prev.prices, [period]: prices }
              : { [period]: prices },
        }));
        if (period === activeTimePeriod) {
          setIsPricesLoading(false);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [
    positionParam,
    isPerp,
    perpKey,
    activeTimePeriod,
    earliestTradeMs,
    perpCache,
  ]);

  // Active price cache: perps read their position-scoped lazy cache (ignoring a
  // stale-position one); spot reads the eagerly-fetched `allPrices`.
  const resolvedPrices = useMemo<Partial<Record<TimePeriod, TokenPrice[]>>>(
    () =>
      isPerp ? (perpCache.key === perpKey ? perpCache.prices : {}) : allPrices,
    [isPerp, perpCache, perpKey, allPrices],
  );

  // Resolve with fallbacks (single useMemo + one Date.now() per recompute so 1H
  // slice and derivePercentChange share the same clock; deps omit "now" so
  // window updates when price data or period changes, not on every parent render).
  const { historicalPrices, priceDiff, pricePercentChange } = useMemo(() => {
    const now = Date.now();
    let prices = resolvedPrices[activeTimePeriod] ?? [];

    if (activeTimePeriod === 'All' && !prices.length) {
      prices =
        [resolvedPrices['1M'], resolvedPrices['1W'], resolvedPrices['1D']].find(
          (fallbackPrices) => fallbackPrices?.length,
        ) ?? [];
    }

    if (activeTimePeriod === '1H' && prices.length) {
      const oneHourAgo = now - 60 * 60 * 1000;
      const lastHour = prices.filter((pt) => Number(pt[0]) >= oneHourAgo);
      prices = lastHour.length >= 5 ? lastHour : prices;
    }

    const diff =
      prices.length < 2 ? 0 : prices[prices.length - 1][1] - prices[0][1];

    return {
      historicalPrices: prices,
      priceDiff: diff,
      pricePercentChange: derivePercentChange(prices, activeTimePeriod, now),
    };
  }, [resolvedPrices, activeTimePeriod]);

  // Latest price for the header (perps show this in place of market cap).
  // Prefers the freshest dataset so it's stable regardless of selected period.
  const currentPrice = useMemo(() => {
    const source =
      resolvedPrices['1H'] ??
      resolvedPrices['1D'] ??
      resolvedPrices['1W'] ??
      resolvedPrices['1M'] ??
      resolvedPrices.All;
    if (!source?.length) return undefined;
    return source[source.length - 1][1];
  }, [resolvedPrices]);

  // ── Position card ──────────────────────────────────────────────────────

  // Display symbol strips the HIP-3 provider prefix (`xyz:SPCX` → `SPCX`);
  // non-HIP-3 symbols pass through unchanged.
  const symbol = getPerpsDisplaySymbol(
    positionParam?.tokenSymbol ?? tokenSymbol ?? '',
  );
  const isClosed =
    isClosedOverride ??
    (positionParam != null && isClosedPosition(positionParam));

  const positionValue = isClosed ? null : positionParam?.currentValueUSD;

  // Perps reliably populate pnlValueUsd / pnlPercent (realized + unrealized) for
  // both open and closed positions, so prefer those. Spot keeps the
  // realized-on-close / unrealized-while-open split.
  const pnlValue = isPerp
    ? (positionParam?.pnlValueUsd ?? positionParam?.realizedPnl)
    : isClosed
      ? positionParam?.realizedPnl
      : positionParam?.pnlValueUsd;
  const pnlPercent = isPerp
    ? (positionParam?.pnlPercent ??
      (positionParam?.boughtUsd
        ? (positionParam.realizedPnl / positionParam.boughtUsd) * 100
        : null))
    : isClosed
      ? positionParam?.boughtUsd
        ? (positionParam.realizedPnl / positionParam.boughtUsd) * 100
        : null
      : (positionParam?.pnlPercent ?? null);
  const isPnlPositive = (pnlValue ?? 0) >= 0;

  // ── Trades ─────────────────────────────────────────────────────────────

  const allTrades = useMemo(
    () => positionParam?.trades ?? [],
    [positionParam?.trades],
  );

  const chartTrades = useMemo(() => {
    const now = Date.now();
    return allTrades.filter((t) => {
      const tsMs =
        t.timestamp > 0 && t.timestamp < 1e12
          ? t.timestamp * 1000
          : t.timestamp;
      return tsMs >= now - PERIOD_DURATION_MS[activeTimePeriod];
    });
  }, [allTrades, activeTimePeriod]);

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    symbol,
    tokenImageUrl,
    marketCap,
    currentPrice,
    isPerp,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    allTrades,
    chartTrades,
    activeTimePeriod,
    setActiveTimePeriod: setActiveTimePeriod as (period: TimePeriod) => void,
    timePeriods: TIME_PERIODS,
  };
}
