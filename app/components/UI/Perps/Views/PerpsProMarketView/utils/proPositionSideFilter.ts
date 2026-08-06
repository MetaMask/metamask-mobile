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

/**
 * Filters positions by direction. Returns the original array when filter is `all`.
 */
export const filterProPositionsBySide = (
  positions: Position[],
  sideFilter: ProPositionSideFilter,
): Position[] => {
  if (sideFilter === 'all') {
    return positions;
  }

  return positions.filter(
    (position) => getPositionSide(position) === sideFilter,
  );
};

/**
 * Filters orders by the position direction they create or reduce.
 * Returns the original array when filter is `all`.
 */
export const filterProOrdersBySide = (
  orders: Order[],
  sideFilter: ProPositionSideFilter,
): Order[] => {
  if (sideFilter === 'all') {
    return orders;
  }

  return orders.filter(
    (order) => getOrderPositionDirection(order) === sideFilter,
  );
};

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

export const getProPositionSideFilterEmptyDescriptionKey = (
  sideFilter: ProPositionSideFilter,
): string | undefined => {
  switch (sideFilter) {
    case 'long':
      return 'perps.pro_positions_panel.positions_empty_long';
    case 'short':
      return 'perps.pro_positions_panel.positions_empty_short';
    default:
      return undefined;
  }
};

export const getProOrderSideFilterEmptyDescriptionKey = (
  sideFilter: ProPositionSideFilter,
): string | undefined => {
  switch (sideFilter) {
    case 'long':
      return 'perps.pro_positions_panel.orders_empty_long';
    case 'short':
      return 'perps.pro_positions_panel.orders_empty_short';
    default:
      return undefined;
  }
};
