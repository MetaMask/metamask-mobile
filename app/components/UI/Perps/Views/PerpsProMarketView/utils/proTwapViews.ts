import type { TwapOrder, TwapOrderFill } from '@metamask/perps-controller';

/** Which of the TWAP tab's three views is showing. */
export type ProTwapView = 'active' | 'history' | 'fill_history';

export interface PerpsProTwapEmptyMetadata {
  filteredTicker?: string;
  filteredSideDescriptionKey?: string;
}

export const PRO_TWAP_VIEWS: readonly ProTwapView[] = [
  'active',
  'history',
  'fill_history',
] as const;

export const DEFAULT_PRO_TWAP_VIEW: ProTwapView = 'active';

/** One slice fill paired with the schedule it belongs to. */
export interface ProTwapFillRow {
  fill: TwapOrderFill;
  twapOrder: TwapOrder;
}

/**
 * Schedules still running. `getTwapOrders()` returns current and terminal
 * records together, so the two lists are complementary partitions of one fetch.
 */
export const selectActiveTwapOrders = (twapOrders: TwapOrder[]): TwapOrder[] =>
  twapOrders.filter((twapOrder) => twapOrder.status === 'active');

/** Schedules that have reached a terminal status, newest first. */
export const selectHistoricalTwapOrders = (
  twapOrders: TwapOrder[],
): TwapOrder[] =>
  twapOrders.filter((twapOrder) => twapOrder.status !== 'active');

/**
 * Every slice fill across the supplied schedules, newest first. Each row keeps
 * a reference to its parent schedule so the list can show the market and side
 * without a second lookup.
 */
export const selectTwapFillRows = (twapOrders: TwapOrder[]): ProTwapFillRow[] =>
  twapOrders
    .flatMap((twapOrder) =>
      twapOrder.fills.map((fill) => ({ fill, twapOrder })),
    )
    .sort((a, b) => b.fill.timestamp - a.fill.timestamp);
