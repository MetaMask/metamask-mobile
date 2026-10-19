import type { Position, Trade } from '@metamask/social-controllers';

/**
 * Where a fill sits in its position's lifecycle.
 *
 * Asset-agnostic on purpose. Perps surface all four stages; spot renders only
 * the direction (see {@link tradeActionLabelKey}), but still carries the full
 * value because it decides whether a row realizes P&L and it is what the
 * `feed_action` analytics property reports.
 *
 * Distinct from `Trade['intent']`, which only says whether the fill grew or
 * shrank the position — `intent: 'exit'` covers both a partial trim and a full
 * close, which is why the feed used to announce "closed" for a 10% reduction.
 */
export type TradeAction = 'opened' | 'added' | 'reduced' | 'closed';

/** True when the fill grows the position rather than shrinking it. */
export const isEntryAction = (action: TradeAction): boolean =>
  action === 'opened' || action === 'added';

/**
 * i18n key suffix for a fill's action label, under `feed.action` and
 * `trader_position.action`. Missing lifecycle metadata uses the neutral
 * `traded` action.
 *
 * Perps name the lifecycle stage — the position is the thing being tracked, and
 * the LONG/SHORT badge alongside carries the direction. Spot names the
 * direction instead: a token row has no badge, and in the feed the amount
 * beside it is P&L rather than trade direction, so the verb is the only signal
 * of whether the trader was buying or selling.
 */
export const tradeActionLabelKey = (
  isPerp: boolean,
  action?: TradeAction,
): string => {
  if (!action) {
    return 'traded';
  }
  if (isPerp) {
    return `perps_${action}`;
  }
  return isEntryAction(action) ? 'spot_bought' : 'spot_sold';
};

export type TradeActionSurface = 'feed' | 'trader_position';

/**
 * Full i18n key for a trade action label. Missing lifecycle metadata uses the
 * neutral "Traded" label for the relevant surface.
 */
export function getTradeActionI18nKey(
  surface: TradeActionSurface,
  isPerp: boolean,
  action?: TradeAction,
): string {
  return `social_leaderboard.${surface}.action.${tradeActionLabelKey(
    isPerp,
    action,
  )}`;
}

/**
 * Client contract for responses from the live social API. The action is
 * optional because older responses can omit the presentation metadata.
 */
type TradeWithAction = Trade & { action?: TradeAction };

/**
 * Lifecycle stage for each of a position's fills, in the same order as
 * `position.trades`.
 */
export function resolveTradeActions(
  position: Position,
): (TradeAction | undefined)[] {
  const trades = position.trades as TradeWithAction[];
  return trades.map((trade) => trade.action);
}

/**
 * Lifecycle stage of one specific fill. Identity-based rather than hash-based,
 * since a Hyperliquid flip's two legs share a `transactionHash`.
 *
 * `undefined` when the trade does not belong to this position or the API
 * omitted its action.
 */
export function resolveTradeAction(
  position: Position,
  trade: Trade,
): TradeAction | undefined {
  const index = position.trades.indexOf(trade);
  if (index === -1) {
    return undefined;
  }
  return (position.trades[index] as TradeWithAction).action;
}
