import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Position } from '@metamask/social-controllers';
import { strings } from '../../../../../../locales/i18n';
import type { TokenPrice } from '../../../../hooks/useTokenHistoricalPrices';
import {
  formatAbbreviatedUsd,
  formatFeedPostAge,
  formatPercent,
  formatSignedUsd,
  formatTokenAmount,
  formatTradeUnitPrice,
} from '../../../../UI/SocialFeed/utils/formatters';
import {
  getPerpPositionDirection,
  getSupportedXyzPerpMarketSymbol,
  type PerpDirection,
} from '../../../../UI/SocialFeed/utils/perp';
import { toUnitPrice } from '../../../../UI/SocialFeed/utils/toSocialV1FeedItem';
import { tradeTimestampToMs } from '../../../../UI/SocialFeed/utils/tradeTimestamp';
import { useTraderPositionData } from '../../TraderPositionView/useTraderPositionData';
import { mapTradesToMarkers } from '../../TraderPositionView/utils/tradeMarkers';
import {
  buildTimeAxisLabels,
  chartWindowForPeriod,
  deriveDailyChangePercent,
  sliceToWindow,
  type ChartPeriod,
} from '../utils/chartWindow';
import { formatTradeTooltipLabel } from '../utils/tradeTooltipLabel';
import { usePerpsSheetPrices } from './usePerpsSheetPrices';

const TIME_AXIS_LABEL_COUNT = 4;

const DIRECTION_KEYS: Record<PerpDirection, string> = {
  long: 'social_leaderboard.trader_position.long',
  short: 'social_leaderboard.trader_position.short',
};

export interface PositionSheetMarker {
  id: string;
  /** Index into `prices`. */
  index: number;
  intent: 'enter' | 'exit';
  timestampMs: number;
  tooltipLabel: string;
}

export interface PositionSheetData {
  isPerp: boolean;
  isClosed: boolean;
  /** Display ticker (`BTC`, `PEPE`), HIP-3 prefix stripped. */
  symbol: string;
  assetName: string;
  leverage: number | undefined;
  perpDirection: PerpDirection | null;
  /** Market to open in the Perps order sheet. Undefined for spot. */
  perpTradeSymbol: string | undefined;

  prices: TokenPrice[];
  isPricesLoading: boolean;
  timeAxisLabels: string[];
  isTrendPositive: boolean;
  markers: PositionSheetMarker[];

  /** Spot values read as market cap when one is known, otherwise as price. */
  isMarketCapMode: boolean;
  formatValue: (price: number) => string;
  currentPrice: number | undefined;
  dailyChangePercent: number | undefined;
  marketCap: number | undefined;

  /** Selected chart range. `1D` until the user picks another. */
  chartPeriod: ChartPeriod;
  setChartPeriod: (period: ChartPeriod) => void;

  summaryTitle: string;
  /**
   * `40x Short` on an open perp, `Closed 40x Short` on a closed perp, `Sold`
   * on closed spot. Absent on open spot.
   */
  summaryTagLabel: string | undefined;
  /** Relative age only. The open or closed word lives on the tag. */
  summarySubtitle: string;
  pnlPercentLabel: string;
  pnlValueLabel: string;
  isPnlPositive: boolean;
}

const sumEntryTokens = (position: Position): number =>
  (position.trades ?? [])
    .filter((trade) => trade.intent === 'enter')
    .reduce((total, trade) => total + Math.abs(trade.tokenAmount), 0);

const tradeTimesMs = (position: Position): number[] =>
  (position.trades ?? []).flatMap((trade) => {
    const time = tradeTimestampToMs(trade.timestamp);
    return Number.isFinite(time) && time > 0 ? [time] : [];
  });

const statusAtMs = (
  position: Position & { firstTradeAt?: number | null },
  isClosed: boolean,
): number | undefined => {
  if (isClosed) {
    if (position.lastTradeAt > 0) {
      return tradeTimestampToMs(position.lastTradeAt);
    }
    const times = tradeTimesMs(position);
    return times.length > 0 ? Math.max(...times) : undefined;
  }
  if (position.firstTradeAt != null && position.firstTradeAt > 0) {
    return tradeTimestampToMs(position.firstTradeAt);
  }
  const times = tradeTimesMs(position);
  return times.length > 0 ? Math.min(...times) : undefined;
};

/** `40x Short`, or undefined when the position has neither. */
const sideTagLabel = (
  leverage: number | undefined,
  perpDirection: PerpDirection | null,
): string | undefined => {
  const label = [
    leverage ? `${leverage}x` : undefined,
    perpDirection ? strings(DIRECTION_KEYS[perpDirection]) : undefined,
  ]
    .filter(Boolean)
    .join(' ');
  return label || undefined;
};

/**
 * Everything the position sheet renders, derived from one `Position`.
 * Pricing and P&L come from the same hooks as `TraderPositionView`, so the
 * sheet and the full screen agree on every figure.
 */
export function usePositionSheetData(
  position: Position | undefined,
  isClosedOverride?: boolean,
  { isNetworkAvailable = true }: { isNetworkAvailable?: boolean } = {},
): PositionSheetData {
  // The window is anchored once per position so re-renders don't refetch.
  const positionKey = position?.positionId;
  const [anchor, setAnchor] = useState(() => ({
    positionKey,
    nowMs: Date.now(),
  }));
  if (anchor.positionKey !== positionKey) {
    setAnchor({ positionKey, nowMs: Date.now() });
  }
  const { nowMs } = anchor;
  const [chartPeriod, setChartPeriodState] = useState<ChartPeriod>('1D');
  const [periodPositionKey, setPeriodPositionKey] = useState(positionKey);
  if (periodPositionKey !== positionKey) {
    setPeriodPositionKey(positionKey);
    setChartPeriodState('1D');
  }
  const setChartPeriod = useCallback((period: ChartPeriod) => {
    setChartPeriodState(period);
  }, []);
  const chartWindow = useMemo(
    () => chartWindowForPeriod(chartPeriod, nowMs),
    [chartPeriod, nowMs],
  );

  const base = useTraderPositionData(position, undefined, isClosedOverride);
  const { isPerp, setActiveTimePeriod, activeTimePeriod } = base;

  useEffect(() => {
    if (!isPerp && activeTimePeriod !== chartPeriod) {
      setActiveTimePeriod(chartPeriod);
    }
  }, [isPerp, activeTimePeriod, chartPeriod, setActiveTimePeriod]);

  const perps = usePerpsSheetPrices({
    symbol: position?.tokenSymbol,
    period: chartPeriod,
    nowMs,
    enabled: isPerp && isNetworkAvailable,
  });

  const rawPrices = isPerp ? perps.prices : base.historicalPrices;
  const prices = useMemo(
    () => sliceToWindow(rawPrices, chartWindow),
    [rawPrices, chartWindow],
  );
  const isPricesLoading =
    isNetworkAvailable &&
    (isPerp
      ? perps.isLoading
      : base.isPricesLoading || activeTimePeriod !== chartPeriod);

  const currentPrice = isPerp
    ? prices.at(-1)?.[1]
    : (base.currentPrice ?? prices.at(-1)?.[1]);
  const marketCap = isPerp ? undefined : base.marketCap;
  const marketCapPerPrice =
    marketCap && currentPrice ? marketCap / currentPrice : undefined;
  const isMarketCapMode = marketCapPerPrice !== undefined;

  const formatValue = useMemo(
    () =>
      marketCapPerPrice !== undefined
        ? (price: number) => formatAbbreviatedUsd(price * marketCapPerPrice)
        : (price: number) => formatTradeUnitPrice(price),
    [marketCapPerPrice],
  );

  const perpDirection = position ? getPerpPositionDirection(position) : null;
  const leverage = position?.perpLeverage ?? undefined;

  const markers = useMemo((): PositionSheetMarker[] => {
    if (!position) return [];
    return (position.trades ?? []).flatMap((trade, tradeIndex) => {
      const tradeMs = tradeTimestampToMs(trade.timestamp);
      if (tradeMs < chartWindow.startMs || tradeMs > chartWindow.endMs) {
        return [];
      }
      const [marker] = mapTradesToMarkers([trade], prices);
      if (!marker) return [];
      const unitPrice = toUnitPrice(trade);
      const priceLabel =
        isMarketCapMode && trade.marketCap
          ? formatAbbreviatedUsd(trade.marketCap)
          : formatTradeUnitPrice(unitPrice);
      return [
        {
          id: `${trade.transactionHash}-${tradeIndex}`,
          index: marker.index,
          intent: trade.intent,
          timestampMs: tradeTimestampToMs(trade.timestamp),
          tooltipLabel: formatTradeTooltipLabel({
            trade,
            action: base.tradeActions[tradeIndex],
            isPerp,
            perpDirection,
            priceLabel,
          }),
        },
      ];
    });
  }, [
    position,
    prices,
    chartWindow.startMs,
    chartWindow.endMs,
    isMarketCapMode,
    base.tradeActions,
    isPerp,
    perpDirection,
  ]);

  const symbol = base.symbol;
  const assetName =
    position?.tokenName && position.tokenName !== position.tokenSymbol
      ? position.tokenName
      : symbol;

  const summaryTitle = useMemo(() => {
    if (!position) return '';
    const amount = base.isClosed
      ? sumEntryTokens(position)
      : Math.abs(
          isPerp
            ? (position.positionAmountWithLeverage ?? position.positionAmount)
            : position.positionAmount,
        );
    return `${formatTokenAmount(amount)} ${symbol}`;
  }, [position, isPerp, symbol, base.isClosed]);

  const summaryTagLabel = useMemo(() => {
    if (base.isClosed && !isPerp) {
      return strings('social_leaderboard.feed.position_card.sold');
    }
    const side = isPerp ? sideTagLabel(leverage, perpDirection) : undefined;
    if (!base.isClosed) return side;
    return [strings('social_leaderboard.feed.position_card.closed'), side]
      .filter(Boolean)
      .join(' ');
  }, [base.isClosed, isPerp, leverage, perpDirection]);

  const summarySubtitle = useMemo(() => {
    if (!position) return '';
    const atMs = statusAtMs(position, base.isClosed);
    if (atMs == null) return '';
    return formatFeedPostAge(atMs, nowMs);
  }, [position, base.isClosed, nowMs]);
  const firstChartPrice = prices.at(0)?.[1];
  const lastChartPrice = prices.at(-1)?.[1];
  const isTrendPositive =
    prices.length < 2 ||
    (firstChartPrice !== undefined &&
      lastChartPrice !== undefined &&
      lastChartPrice >= firstChartPrice);

  return {
    isPerp,
    isClosed: base.isClosed,
    symbol,
    assetName,
    leverage,
    perpDirection,
    perpTradeSymbol:
      isPerp && position
        ? getSupportedXyzPerpMarketSymbol(position.tokenSymbol).targetSymbol
        : undefined,
    prices,
    isPricesLoading,
    timeAxisLabels: buildTimeAxisLabels(
      chartWindow,
      TIME_AXIS_LABEL_COUNT,
      chartPeriod,
    ),
    isTrendPositive,
    markers,
    isMarketCapMode,
    formatValue,
    currentPrice,
    dailyChangePercent: deriveDailyChangePercent(prices, nowMs),
    marketCap,
    chartPeriod,
    setChartPeriod,
    summaryTitle,
    summaryTagLabel,
    summarySubtitle,
    pnlPercentLabel: formatPercent(base.pnlPercent),
    pnlValueLabel: formatSignedUsd(base.pnlValue),
    isPnlPositive: base.isPnlPositive,
  };
}
