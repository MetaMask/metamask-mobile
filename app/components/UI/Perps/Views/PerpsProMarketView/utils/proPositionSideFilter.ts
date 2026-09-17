import {
  DEFAULT_PRO_LAYOUT_PREFERENCES,
  type Order,
  type Position,
  type ProOrdersSideFilter,
  type ProPositionsSideFilter,
  type TwapOrder,
} from '@metamask/perps-controller';
import type { ProTwapView } from './proTwapViews';

export type ProPositionSideFilter = ProPositionsSideFilter;

export type ProOrderSideFilter = ProOrdersSideFilter;

export const DEFAULT_PRO_POSITION_SIDE_FILTER: ProPositionSideFilter =
  DEFAULT_PRO_LAYOUT_PREFERENCES.positionsSideFilter;

export const DEFAULT_PRO_ORDER_SIDE_FILTER: ProOrderSideFilter =
  DEFAULT_PRO_LAYOUT_PREFERENCES.ordersSideFilter;

export const PRO_POSITION_SIDE_FILTER_OPTIONS: {
  id: ProPositionSideFilter;
  labelKey: string;
}[] = [
  {
    id: 'all',
    labelKey: 'perps.pro_positions_panel.side_filter.all_sides',
  },
  {
    id: 'long',
    labelKey: 'perps.pro_positions_panel.side_filter.long',
  },
  {
    id: 'short',
    labelKey: 'perps.pro_positions_panel.side_filter.short',
  },
];

/**
 * Shared shape of the positions and orders side filters. The two domains export
 * independent contracts (`ProPositionSideFilter` / `ProOrderSideFilter`) that
 * happen to be value-equal today; the shared internals below are typed against
 * this local union so neither domain borrows the other's contract.
 */
type ProSideFilter = ProPositionSideFilter | ProOrderSideFilter;

const getPositionSide = (position: Position): 'long' | 'short' =>
  parseFloat(position.size) >= 0 ? 'long' : 'short';

const filterProItemsBySide = <T>(
  items: T[],
  sideFilter: ProSideFilter,
  getSide: (item: T) => 'long' | 'short',
): T[] => {
  if (sideFilter === 'all') {
    return items;
  }

  return items.filter((item) => getSide(item) === sideFilter);
};

/**
 * Filters positions by direction. Returns the original array when filter is `all`.
 */
export const filterProPositionsBySide = (
  positions: Position[],
  sideFilter: ProPositionSideFilter,
): Position[] => filterProItemsBySide(positions, sideFilter, getPositionSide);

const getOrderSide = (order: Order): 'long' | 'short' =>
  order.side === 'buy' ? 'long' : 'short';

/**
 * Filters orders by their own side: a buy is a long order, a sell is a short
 * order. Closing orders are not inverted here — a "Close long" order is a sell,
 * so it belongs to the short side of this filter even though its label names the
 * long position it reduces. Returns the original array when filter is `all`.
 */
export const filterProOrdersBySide = (
  orders: Order[],
  sideFilter: ProOrderSideFilter,
): Order[] => filterProItemsBySide(orders, sideFilter, getOrderSide);

const getTwapOrderSide = (twapOrder: TwapOrder): 'long' | 'short' =>
  twapOrder.side === 'buy' ? 'long' : 'short';

/**
 * Filters TWAP schedules by their own side, matching `filterProOrdersBySide`: a
 * buy schedule is long, a sell schedule is short, and a reduce-only schedule is
 * not inverted. Returns the original array when filter is `all`.
 *
 * TWAP has no persisted preference field on `ProLayoutPreferences`, so the
 * caller owns this filter's state rather than reading it from the controller.
 */
export const filterProTwapOrdersBySide = (
  twapOrders: TwapOrder[],
  sideFilter: ProOrderSideFilter,
): TwapOrder[] =>
  filterProItemsBySide(twapOrders, sideFilter, getTwapOrderSide);

export const getProPositionSideFilterButtonLabelKey = (
  sideFilter: ProPositionSideFilter,
): string => {
  switch (sideFilter) {
    case 'long':
      return 'perps.pro_positions_panel.side_filter.long';
    case 'short':
      return 'perps.pro_positions_panel.side_filter.short';
    default:
      return 'perps.pro_positions_panel.side_filter.all_sides';
  }
};

const SIDE_FILTER_EMPTY_DESCRIPTION_KEYS = {
  positions: {
    long: 'perps.pro_positions_panel.positions_empty_long',
    short: 'perps.pro_positions_panel.positions_empty_short',
  },
  orders: {
    long: 'perps.pro_positions_panel.orders_empty_long',
    short: 'perps.pro_positions_panel.orders_empty_short',
  },
} as const;

const TWAP_SIDE_FILTER_EMPTY_DESCRIPTION_KEYS = {
  active: {
    long: 'perps.pro_positions_panel.twap_empty_long',
    short: 'perps.pro_positions_panel.twap_empty_short',
  },
  history: {
    long: 'perps.pro_positions_panel.twap_history_empty_long',
    short: 'perps.pro_positions_panel.twap_history_empty_short',
  },
  fill_history: {
    long: 'perps.pro_positions_panel.twap_fill_history_empty_long',
    short: 'perps.pro_positions_panel.twap_fill_history_empty_short',
  },
} as const;

export const getProSideFilterEmptyDescriptionKey = (
  sideFilter: ProSideFilter,
  entity: keyof typeof SIDE_FILTER_EMPTY_DESCRIPTION_KEYS,
): string | undefined => {
  if (sideFilter === 'all') {
    return undefined;
  }

  return SIDE_FILTER_EMPTY_DESCRIPTION_KEYS[entity][sideFilter];
};

export const getProPositionSideFilterEmptyDescriptionKey = (
  sideFilter: ProPositionSideFilter,
): string | undefined =>
  getProSideFilterEmptyDescriptionKey(sideFilter, 'positions');

export const getProOrderSideFilterEmptyDescriptionKey = (
  sideFilter: ProOrderSideFilter,
): string | undefined =>
  getProSideFilterEmptyDescriptionKey(sideFilter, 'orders');

export const getProTwapSideFilterEmptyDescriptionKey = (
  sideFilter: ProOrderSideFilter,
  view: ProTwapView,
): string | undefined => {
  if (sideFilter === 'all') {
    return undefined;
  }

  return TWAP_SIDE_FILTER_EMPTY_DESCRIPTION_KEYS[view][sideFilter];
};
