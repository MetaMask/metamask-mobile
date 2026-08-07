import type { Order, Position } from '@metamask/perps-controller';
import { getOrderPositionDirection } from '../../../utils/orderUtils';

export type ProPositionSideFilter = 'all' | 'long' | 'short';

export const DEFAULT_PRO_POSITION_SIDE_FILTER: ProPositionSideFilter = 'all';

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

const getPositionSide = (position: Position): 'long' | 'short' =>
  parseFloat(position.size) >= 0 ? 'long' : 'short';

const filterProItemsBySide = <T>(
  items: T[],
  sideFilter: ProPositionSideFilter,
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

/**
 * Filters orders by the position direction they create or reduce.
 * Returns the original array when filter is `all`.
 */
export const filterProOrdersBySide = (
  orders: Order[],
  sideFilter: ProPositionSideFilter,
): Order[] =>
  filterProItemsBySide(orders, sideFilter, getOrderPositionDirection);

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

export const getProSideFilterEmptyDescriptionKey = (
  sideFilter: ProPositionSideFilter,
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
  sideFilter: ProPositionSideFilter,
): string | undefined =>
  getProSideFilterEmptyDescriptionKey(sideFilter, 'orders');
