import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { Position } from '@metamask/social-controllers';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import type { Hex } from '@metamask/utils';
import { handleFetch } from '@metamask/controller-utils';
import { chainNameToId } from '../utils/chainMapping';
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

/**
 * Derives percentage change from historical price data points.
 * For "1H" we find the point closest to one hour ago within the data set.
 */
function derivePercentChange(
  prices: TokenPrice[],
  period: TimePeriod,
): number | undefined {
  if (!prices.length) return undefined;

  const endPrice = prices[prices.length - 1][1];
  let startPrice: number;

  if (period === '1H') {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
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

  // Trades (filtered by active period)
  trades: Position['trades'];

  // Time period
  activeTimePeriod: TimePeriod;
  setActiveTimePeriod: (period: TimePeriod) => void;
  timePeriods: readonly TimePeriod[];
}

export type { TimePeriod };
export { TIME_PERIODS };

export function useTraderPositionData(
  positionParam: Position | undefined,
  tokenSymbol: string,
): TraderPositionData {
  const [activeTimePeriod, setActiveTimePeriod] = useState<TimePeriod>('1D');

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
  const [isPricesLoading, setIsPricesLoading] = useState(true);

  useEffect(() => {
    if (!positionParam || !caipChainId) return;
    setIsPricesLoading(true);
    const assetIdentifier = `erc20:${positionParam.tokenAddress}`;
    const vsCurrency = currentCurrency.toLowerCase();
    let cancelled = false;

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

  // Resolve with fallbacks:
  // - 1H: truncate 1d data to last 60 min; if < 5 points, use full 1d
  // - All: if 3y returns empty, cascade through 1M → 1W → 1D
  const historicalPrices = useMemo(() => {
    let prices = allPrices[activeTimePeriod] ?? [];

    if (activeTimePeriod === 'All' && !prices.length) {
      prices = allPrices['1M'] ?? allPrices['1W'] ?? allPrices['1D'] ?? [];
    }

    if (activeTimePeriod === '1H' && prices.length) {
      const oneHourAgo = Date.now() - 60 * 60 * 1000;
      const lastHour = prices.filter((pt) => Number(pt[0]) >= oneHourAgo);
      return lastHour.length >= 5 ? lastHour : prices;
    }

    return prices;
  }, [allPrices, activeTimePeriod]);

  const priceDiff = useMemo(() => {
    if (historicalPrices.length < 2) return 0;
    return (
      historicalPrices[historicalPrices.length - 1][1] - historicalPrices[0][1]
    );
  }, [historicalPrices]);

  const pricePercentChange = derivePercentChange(
    historicalPrices,
    activeTimePeriod,
  );

  // ── Position card ──────────────────────────────────────────────────────

  const symbol = positionParam?.tokenSymbol ?? tokenSymbol;
  const isClosed =
    positionParam != null &&
    positionParam.positionAmount === 0 &&
    positionParam.soldUsd > 0;

  const positionValue = isClosed ? null : positionParam?.currentValueUSD;
  const pnlValue = isClosed
    ? positionParam?.realizedPnl
    : positionParam?.pnlValueUsd;
  const pnlPercent = isClosed
    ? positionParam?.boughtUsd
      ? (positionParam.realizedPnl / positionParam.boughtUsd) * 100
      : null
    : (positionParam?.pnlPercent ?? null);
  const isPnlPositive = (pnlValue ?? 0) >= 0;

  // ── Trades (filtered by period) ────────────────────────────────────────

  const trades = (positionParam?.trades ?? []).filter((t) => {
    const tsMs =
      t.timestamp > 0 && t.timestamp < 1e12 ? t.timestamp * 1000 : t.timestamp;
    return tsMs >= Date.now() - PERIOD_DURATION_MS[activeTimePeriod];
  });

  // ── Return ─────────────────────────────────────────────────────────────

  return {
    symbol,
    tokenImageUrl,
    marketCap,
    historicalPrices,
    priceDiff,
    isPricesLoading,
    pricePercentChange,
    isClosed,
    positionValue,
    pnlValue,
    pnlPercent,
    isPnlPositive,
    trades,
    activeTimePeriod,
    setActiveTimePeriod: setActiveTimePeriod as (period: TimePeriod) => void,
    timePeriods: TIME_PERIODS,
  };
}
