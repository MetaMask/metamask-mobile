import type { Position, Trade } from '@metamask/social-controllers';
import { isClosedPosition, isPerpPosition } from './perp';

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
 * `trader_position.action`.
 *
 * Perps name the lifecycle stage — the position is the thing being tracked, and
 * the LONG/SHORT badge alongside carries the direction. Spot names the
 * direction instead: a token row has no badge, and in the feed the amount
 * beside it is P&L rather than trade direction, so the verb is the only signal
 * of whether the trader was buying or selling.
 */
export const tradeActionLabelKey = (
  isPerp: boolean,
  action: TradeAction,
): string => {
  if (isPerp) {
    return `perps_${action}`;
  }
  return isEntryAction(action) ? 'spot_bought' : 'spot_sold';
};

/**
 * Fields the social API added alongside the lifecycle work but that
 * `@metamask/social-controllers` does not type yet. Widened locally so mobile
 * can consume them ahead of the package release — same pattern `perp.ts` uses
 * for `marginUsd`. Drop the widening once the published types carry them.
 */
type TradeWithAction = Trade & { action?: TradeAction };

/**
 * A `Position` (or a feed item, which is one plus an actor), carrying the
 * open-state field when the API is new enough to send it.
 */
export type PositionWithOpenState = Position & { isOpen?: boolean };

/**
 * Relative tolerance for "the position is back to zero". Matches the social
 * API's own threshold and absorbs the precision dust a chain of partial exits
 * leaves behind.
 */
const DUST_EPSILON = 1e-4;

/**
 * How far `positionAmount` may diverge from the fills before we conclude the
 * trade window is truncated rather than merely imprecise. The two are
 * aggregated separately upstream, so small drift is expected; a genuinely
 * truncated prefix is orders of magnitude larger.
 */
const SEED_TOLERANCE = 1e-3;

/**
 * Size a fill contributes to the running position: positive for an entry,
 * negative for an exit.
 *
 * The sign comes from `intent`, never from `tokenAmount` or `direction`.
 * `tokenAmount` is negative for sells, but opening a perp short is
 * `direction: 'sell'` with `intent: 'enter'` while `positionAmount` is reported
 * as a positive magnitude — so signing by intent makes longs and shorts
 * accumulate identically and one walk covers both.
 */
const signedSize = (trade: Trade): number =>
  trade.intent === 'enter'
    ? Math.abs(trade.tokenAmount)
    : -Math.abs(trade.tokenAmount);

const isFlat = (running: number, peak: number): boolean =>
  running <= DUST_EPSILON * Math.max(peak, 1);

/**
 * Indices into `trades`, oldest first. The API sends newest-first, so reversing
 * before a stable sort keeps same-timestamp siblings in chronological order too
 * — which matters for Hyperliquid flip legs, emitted with one timestamp and an
 * exit that must be walked before its paired entry.
 */
function chronologicalOrder(trades: readonly Trade[]): number[] {
  const order = trades.map((_, index) => index).reverse();
  return order.sort((a, b) => trades[a].timestamp - trades[b].timestamp);
}

/**
 * Derives every fill's lifecycle stage from the trade history.
 *
 * Mirrors `resolveTradeActions` in va-mmcx-social-api
 * (`apps/api/clicker/trade-action.utils.ts`) so a feed row, a trade row, and
 * the push notification that links to them can never disagree about the same
 * fill. Keep the two in step when either changes.
 *
 * For spot the walk is *anchored* rather than a plain accumulation from zero:
 * the API caps a position at 50 fills and preferentially retains commented
 * ones, so `trades` can start mid-position and accumulating from zero would
 * report fill #51 of a long-lived position as the one that opened it. Seeding
 * with whatever `positionAmount` cannot account for recovers the truncated
 * prefix.
 *
 * Perps opt out of that anchor: they keep their historical `positionAmount`
 * after closing (a closed 5x long still reports a size of 5, see
 * {@link isClosedPosition}), so seeding from it would fabricate a pre-window
 * balance and read every closing fill as a reduce. The cost is that a truncated
 * perp window can misread its oldest visible fill as an open.
 */
function deriveTradeActions(position: PositionWithOpenState): TradeAction[] {
  const { trades, positionAmount } = position;
  if (trades.length === 0) {
    return [];
  }

  const order = chronologicalOrder(trades);
  const netTraded = trades.reduce((sum, trade) => sum + signedSize(trade), 0);
  const grossTraded = trades.reduce(
    (sum, trade) => sum + Math.abs(trade.tokenAmount),
    0,
  );
  const unaccounted = isPerpPosition(position)
    ? 0
    : Math.abs(positionAmount) - netTraded;
  let running =
    unaccounted > SEED_TOLERANCE * Math.max(grossTraded, 1) ? unaccounted : 0;
  let peak = running;

  const actions = new Array<TradeAction>(trades.length);
  const walked = new Map<string, TradeAction>();
  for (const index of order) {
    const trade = trades[index];
    // A redelivered fill can appear twice. Walking it again would double-count
    // its size and report the copy as an add to itself. Keyed on intent and
    // size too, so a flip's two legs — which share a hash — stay distinct.
    const identity = `${trade.transactionHash}:${trade.intent}:${trade.tokenAmount}`;
    const duplicate = walked.get(identity);
    if (duplicate) {
      actions[index] = duplicate;
      continue;
    }

    if (trade.intent === 'enter') {
      actions[index] = isFlat(running, peak) ? 'opened' : 'added';
      running += Math.abs(trade.tokenAmount);
      peak = Math.max(peak, running);
    } else {
      running -= Math.abs(trade.tokenAmount);
      actions[index] = isFlat(running, peak) ? 'closed' : 'reduced';
    }
    walked.set(identity, actions[index]);
  }

  // The newest exit is the fill the feed row is about, so the position's own
  // open/closed verdict beats the dust arithmetic. `isClosedPosition` prefers
  // the API's `isOpen` and otherwise falls back to the snapshot heuristic,
  // which knows a closed perp is marked by the absence of remaining exposure
  // rather than by a zero size.
  const newest = order[order.length - 1];
  if (trades[newest].intent === 'exit') {
    actions[newest] = isClosedPosition(position) ? 'closed' : 'reduced';
  }

  return actions;
}

/**
 * Lifecycle stage for each of a position's fills, in the same order as
 * `position.trades`.
 *
 * Prefers the API-supplied `trade.action` — computed server-side against the
 * full history — and falls back to deriving the whole array locally when the
 * response predates that field.
 */
export function resolveTradeActions(
  position: PositionWithOpenState,
): TradeAction[] {
  const trades = position.trades as TradeWithAction[];
  if (trades.length > 0 && trades.every((trade) => trade.action)) {
    return trades.map((trade) => trade.action as TradeAction);
  }
  return deriveTradeActions(position);
}

/**
 * Lifecycle stage of one specific fill. Identity-based rather than hash-based,
 * since a Hyperliquid flip's two legs share a `transactionHash`.
 *
 * `undefined` when the trade does not belong to this position.
 */
export function resolveTradeAction(
  position: PositionWithOpenState,
  trade: Trade,
): TradeAction | undefined {
  const index = position.trades.indexOf(trade);
  if (index === -1) {
    return undefined;
  }
  return resolveTradeActions(position)[index];
}
