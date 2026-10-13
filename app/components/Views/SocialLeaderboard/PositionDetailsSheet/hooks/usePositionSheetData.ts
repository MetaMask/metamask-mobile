import { useEffect, useMemo, useState } from 'react';
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
  formatUsd,
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
  deriveChartLevels,
  type ChartLevel,
  type ChartLevelKind,
} from '../utils/chartLevels';
import {
  buildTimeAxisLabels,
  deriveDailyChangePercent,
  getFirstTradeMs,
  resolveChartWindow,
  resolveSpotPeriod,
  sliceToWindow,
} from '../utils/chartWindow';
import { formatTradeTooltipLabel } from '../utils/tradeTooltipLabel';
import { usePerpsSheetPrices } from './usePerpsSheetPrices';

const TIME_AXIS_LABEL_COUNT = 4;

const LEVEL_LABEL_KEYS: Record<ChartLevelKind, string> = {
  entry: 'social_leaderboard.position_sheet.level.entry',
  exit: 'social_leaderboard.position_sheet.level.exit',
  current: 'social_leaderboard.position_sheet.level.current',
  takeProfit: 'social_leaderboard.position_sheet.level.take_profit',
  stopLoss: 'social_leaderboard.position_sheet.level.stop_loss',
};

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

export interface PositionSheetLevel extends ChartLevel {
  label: string;
  valueLabel: string;
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
  levels: PositionSheetLevel[];

  /** Spot values read as market cap when one is known, otherwise as price. */
  isMarketCapMode: boolean;
  formatValue: (price: number) => string;
  currentPrice: number | undefined;
  dailyChangePercent: number | undefined;
  marketCap: number | undefined;

  summaryTitle: string;
  summarySubtitle: string;
  pnlPercentLabel: string;
  pnlValueLabel: string;
  isPnlPositive: boolean;
}

const sumEntryTokens = (position: Position): number =>
  (position.trades ?? [])
    .filter((trade) => trade.intent === 'enter')
    .reduce((total, trade) => total + Math.abs(trade.tokenAmount), 0);

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
  const chartWindow = useMemo(
    () => resolveChartWindow(position?.trades, nowMs),
    [position?.trades, nowMs],
  );

  const base = useTraderPositionData(position, undefined, isClosedOverride);
  const { isPerp, setActiveTimePeriod, activeTimePeriod } = base;

  const spotPeriod = resolveSpotPeriod(chartWindow);
  useEffect(() => {
    if (!isPerp && activeTimePeriod !== spotPeriod) {
      setActiveTimePeriod(spotPeriod);
    }
  }, [isPerp, activeTimePeriod, spotPeriod, setActiveTimePeriod]);

  const perps = usePerpsSheetPrices({
    symbol: position?.tokenSymbol,
    earliestTradeMs: getFirstTradeMs(position?.trades),
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
      : base.isPricesLoading || activeTimePeriod !== spotPeriod);

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
    isMarketCapMode,
    base.tradeActions,
    isPerp,
    perpDirection,
  ]);

  const levels = useMemo((): PositionSheetLevel[] => {
    if (!position) return [];
    return deriveChartLevels({
      position,
      isClosed: base.isClosed,
      isPerp,
      currentPrice,
    }).map((level) => {
      const name = strings(LEVEL_LABEL_KEYS[level.kind]);
      return {
        ...level,
        label:
          level.timestampMs !== undefined
            ? strings('social_leaderboard.position_sheet.level.with_age', {
                level: name,
                age: formatFeedPostAge(level.timestampMs, nowMs),
              })
            : name,
        valueLabel: formatValue(level.price),
      };
    });
  }, [position, base.isClosed, isPerp, currentPrice, formatValue, nowMs]);

  const symbol = base.symbol;
  const assetName =
    position?.tokenName && position.tokenName !== position.tokenSymbol
      ? position.tokenName
      : symbol;

  const summaryTitle = useMemo(() => {
    if (!position) return '';
    if (isPerp) {
      const meta = [
        leverage ? `${leverage}x` : undefined,
        perpDirection ? strings(DIRECTION_KEYS[perpDirection]) : undefined,
      ]
        .filter(Boolean)
        .join(' ');
      return meta ? `${symbol} \u00b7 ${meta}` : symbol;
    }
    const amount = base.isClosed
      ? sumEntryTokens(position)
      : Math.abs(position.positionAmount);
    return `${formatTokenAmount(amount)} ${symbol}`;
  }, [position, isPerp, leverage, perpDirection, symbol, base.isClosed]);

  const summaryValue = base.isClosed
    ? (position?.boughtUsd ?? position?.costBasis)
    : (base.positionValue ?? position?.costBasis);

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
    timeAxisLabels: buildTimeAxisLabels(chartWindow, TIME_AXIS_LABEL_COUNT),
    isTrendPositive:
      prices.length < 2 || prices[prices.length - 1][1] >= prices[0][1],
    markers,
    levels,
    isMarketCapMode,
    formatValue,
    currentPrice,
    dailyChangePercent: deriveDailyChangePercent(prices, nowMs),
    marketCap,
    summaryTitle,
    summarySubtitle: formatUsd(summaryValue),
    pnlPercentLabel: formatPercent(base.pnlPercent),
    pnlValueLabel: formatSignedUsd(base.pnlValue),
    isPnlPositive: base.isPnlPositive,
  };
}
