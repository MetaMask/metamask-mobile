import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Position } from '@metamask/social-controllers';
import { getPerpsDisplaySymbol } from '@metamask/perps-controller';
import type { TokenPrice } from '../../../hooks/useTokenHistoricalPrices';
import { chainNameToId } from '../utils/chainMapping';
import { isPerpPosition, isClosedPosition } from '../utils/perp';
import { tradeTimestampToMs } from '../utils/tradeTimestamp';
import { getAssetImageUrl } from '../../../UI/Bridge/hooks/useAssetMetadata/utils';
import { useSpotTraderPositionPrices } from './useSpotTraderPositionPrices';
import {
  derivePercentChange,
  PERIOD_DURATION_MS,
  TIME_PERIODS,
  type TimePeriod,
} from './traderPositionData';

export type { TimePeriod };
export { TIME_PERIODS };

const PERIODS_BY_SPAN: readonly TimePeriod[] = ['1H', '1D', '1W', '1M', 'All'];

function getTradeTimestampRange(
  trades: readonly { timestamp: number }[] | undefined,
): { min: number; max: number } | null {
  if (!trades?.length) return null;

  let min = Infinity;
  let max = -Infinity;

  for (const trade of trades) {
    const timestamp = tradeTimestampToMs(trade.timestamp);
    if (!Number.isFinite(timestamp)) continue;
    min = Math.min(min, timestamp);
    max = Math.max(max, timestamp);
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return { min, max };
}

/**
 * Selects the smallest period that can contain the span between the first and
 * last trade. This keeps a three-day position on 1W, a three-week position on
 * 1M, and only falls back to All for spans wider than a month.
 */
export function getRecommendedTradeSpanPeriod(
  trades: readonly { timestamp: number }[] | undefined,
): TimePeriod {
  const tradeRange = getTradeTimestampRange(trades);
  if (!tradeRange) return '1M';

  const spanMs = Math.max(0, tradeRange.max - tradeRange.min);
  return (
    PERIODS_BY_SPAN.find((period) => spanMs <= PERIOD_DURATION_MS[period]) ??
    'All'
  );
}

function getPositionPeriodIdentity(position: Position | undefined): string {
  if (!position) return '';
  return [
    position.chain,
    position.tokenAddress,
    position.tokenSymbol,
    isPerpPosition(position) ? 'perp' : 'spot',
  ].join('|');
}

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
  isTimePeriodAutoSelected: boolean;
  setActiveTimePeriod: (period: TimePeriod) => void;
  setAutomaticTimePeriod: (period: TimePeriod) => void;
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
  const positionPeriodIdentity = useMemo(
    () => getPositionPeriodIdentity(positionParam),
    [positionParam],
  );
  const recommendedTradeSpanPeriod = useMemo(
    () => getRecommendedTradeSpanPeriod(positionParam?.trades),
    [positionParam?.trades],
  );
  const userSelectedTimePeriodRef = useRef(false);
  const [isTimePeriodAutoSelected, setIsTimePeriodAutoSelected] =
    useState(true);
  const lastPositionPeriodIdentityRef = useRef(positionPeriodIdentity);
  const [activeTimePeriod, setActiveTimePeriodState] = useState<TimePeriod>(
    () => recommendedTradeSpanPeriod,
  );

  useEffect(() => {
    if (!positionPeriodIdentity) return;

    if (lastPositionPeriodIdentityRef.current !== positionPeriodIdentity) {
      lastPositionPeriodIdentityRef.current = positionPeriodIdentity;
      userSelectedTimePeriodRef.current = false;
      setIsTimePeriodAutoSelected(true);
    }

    if (!userSelectedTimePeriodRef.current) {
      setActiveTimePeriodState(recommendedTradeSpanPeriod);
    }
  }, [positionPeriodIdentity, recommendedTradeSpanPeriod]);

  const setActiveTimePeriod = useCallback((period: TimePeriod) => {
    userSelectedTimePeriodRef.current = true;
    setIsTimePeriodAutoSelected(false);
    setActiveTimePeriodState(period);
  }, []);

  const setAutomaticTimePeriod = useCallback((period: TimePeriod) => {
    setActiveTimePeriodState(period);
  }, []);

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

  const spotPrices = useSpotTraderPositionPrices(
    { positionParam, caipChainId },
    { enabled: !isPerp },
  );

  const resolvedPrices = spotPrices.pricesByPeriod;
  const isPricesLoading = isPerp ? false : spotPrices.isLoading;
  const marketCap = spotPrices.marketCap;

  const { historicalPrices, priceDiff, pricePercentChange } = useMemo(() => {
    if (isPerp) {
      return {
        historicalPrices: [] as TokenPrice[],
        priceDiff: 0,
        pricePercentChange: undefined,
      };
    }

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

    const lastPrice = prices.at(-1)?.[1];
    const diff =
      prices.length < 2 || lastPrice == null ? 0 : lastPrice - prices[0][1];

    return {
      historicalPrices: prices,
      priceDiff: diff,
      pricePercentChange: derivePercentChange(prices, activeTimePeriod, now),
    };
  }, [isPerp, resolvedPrices, activeTimePeriod]);

  const currentPrice = useMemo(() => {
    if (isPerp) return undefined;

    const source =
      resolvedPrices['1H'] ??
      resolvedPrices['1D'] ??
      resolvedPrices['1W'] ??
      resolvedPrices['1M'] ??
      resolvedPrices.All;
    if (!source?.length) return undefined;
    return source.at(-1)?.[1];
  }, [isPerp, resolvedPrices]);

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
    return allTrades.filter(
      (t) =>
        tradeTimestampToMs(t.timestamp) >=
        now - PERIOD_DURATION_MS[activeTimePeriod],
    );
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
    isTimePeriodAutoSelected,
    setActiveTimePeriod,
    setAutomaticTimePeriod,
    timePeriods: TIME_PERIODS,
  };
}
