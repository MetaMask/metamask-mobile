import type { Position, Trade } from '@metamask/social-controllers';
import { tradeTimestampToMs } from '../../../../UI/SocialFeed/utils/tradeTimestamp';
import {
  deriveAverageEntryPrice,
  deriveExitPrice,
} from '../../../../UI/SocialFeed/utils/toSocialV1FeedItem';

export type ChartLevelKind =
  | 'entry'
  | 'exit'
  | 'current'
  | 'takeProfit'
  | 'stopLoss';

export interface ChartLevel {
  kind: ChartLevelKind;
  /** Price in USD, on the same axis as the chart line. */
  price: number;
  /** When the level was set (first entry / last exit fill). */
  timestampMs?: number;
}

/**
 * Take-profit / stop-loss prices are not on the social `Position` yet. Read
 * them optionally so the lines appear as soon as social-api starts sending
 * them, without waiting on a `@metamask/social-controllers` bump.
 */
export type PositionWithBrackets = Position & {
  takeProfitPriceUsd?: number | null;
  stopLossPriceUsd?: number | null;
};

const isPositivePrice = (value: number | null | undefined): value is number =>
  value != null && Number.isFinite(value) && value > 0;

const pickTimestamp = (
  trades: readonly Trade[],
  intent: Trade['intent'],
  pick: 'first' | 'last',
): number | undefined => {
  const stamps = trades
    .filter((trade) => trade.intent === intent)
    .map((trade) => tradeTimestampToMs(trade.timestamp))
    .filter(Number.isFinite);
  if (stamps.length === 0) return undefined;
  return pick === 'first' ? Math.min(...stamps) : Math.max(...stamps);
};

export interface DeriveChartLevelsParams {
  position: Position;
  isClosed: boolean;
  isPerp: boolean;
  currentPrice: number | undefined;
}

/**
 * Horizontal reference lines drawn across the chart. Entry is always shown
 * when it can be derived, Exit once the position is closed, and TP/SL only
 * for open perps that report them.
 */
export function deriveChartLevels({
  position,
  isClosed,
  isPerp,
  currentPrice,
}: DeriveChartLevelsParams): ChartLevel[] {
  const levels: ChartLevel[] = [];
  const trades = position.trades ?? [];

  const entryPrice = deriveAverageEntryPrice(position);
  if (isPositivePrice(entryPrice)) {
    levels.push({
      kind: 'entry',
      price: entryPrice,
      timestampMs: pickTimestamp(trades, 'enter', 'first'),
    });
  }

  if (isClosed) {
    const exitPrice = deriveExitPrice(position);
    if (isPositivePrice(exitPrice)) {
      levels.push({
        kind: 'exit',
        price: exitPrice,
        timestampMs: pickTimestamp(trades, 'exit', 'last'),
      });
    }
  }

  if (isPerp && !isClosed) {
    const { takeProfitPriceUsd, stopLossPriceUsd } =
      position as PositionWithBrackets;
    if (isPositivePrice(takeProfitPriceUsd)) {
      levels.push({ kind: 'takeProfit', price: takeProfitPriceUsd });
    }
    if (isPositivePrice(stopLossPriceUsd)) {
      levels.push({ kind: 'stopLoss', price: stopLossPriceUsd });
    }
  }

  if (isPositivePrice(currentPrice)) {
    levels.push({ kind: 'current', price: currentPrice });
  }

  return levels;
}
