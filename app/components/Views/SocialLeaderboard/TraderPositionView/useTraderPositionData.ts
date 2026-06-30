import { useMemo, useState } from 'react';
import type { Position } from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { chainNameToId } from '../utils/chainMapping';
import { isPerpPosition, isClosedPosition } from '../utils/perp';
import { getAssetImageUrl } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { usePerpsTraderPositionPrices } from './usePerpsTraderPositionPrices';
import { useSpotTraderPositionPrices } from './useSpotTraderPositionPrices';
import {
  derivePercentChange,
  PERIOD_DURATION_MS,
  TIME_PERIODS,
  type TimePeriod,
} from './traderPositionData.shared';

export type { TimePeriod };
export { TIME_PERIODS };

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

  const tokenImageUrl = useMemo(() => {
    if (!positionParam || !caipChainId) return undefined;
    return getAssetImageUrl(positionParam.tokenAddress, caipChainId);
  }, [positionParam, caipChainId]);

  const isPerp = useMemo(
    () => positionParam != null && isPerpPosition(positionParam),
    [positionParam],
  );

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

  const spotPrices = useSpotTraderPositionPrices(
    { positionParam, caipChainId },
    { enabled: !isPerp },
  );
  const perpPrices = usePerpsTraderPositionPrices(
    { positionParam, activeTimePeriod, earliestTradeMs },
    { enabled: isPerp },
  );

  const resolvedPrices = isPerp
    ? perpPrices.pricesByPeriod
    : spotPrices.pricesByPeriod;
  const isPricesLoading = isPerp ? perpPrices.isLoading : spotPrices.isLoading;
  const marketCap = spotPrices.marketCap;

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

  const symbol = getPerpsDisplaySymbol(
    positionParam?.tokenSymbol ?? tokenSymbol ?? '',
  );
  const isClosed =
    isClosedOverride ??
    (positionParam != null && isClosedPosition(positionParam));

  const positionValue = isClosed ? null : positionParam?.currentValueUSD;

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
