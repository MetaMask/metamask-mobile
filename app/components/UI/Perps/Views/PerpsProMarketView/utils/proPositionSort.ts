import type { Position } from '@metamask/perps-controller';

export type ProPositionSortField =
  | 'positionValue'
  | 'unrealizedPnl'
  | 'fundingRate';

export type ProPositionSortDirection = 'asc' | 'desc';

export interface ProPositionSortConfig {
  field: ProPositionSortField;
  direction: ProPositionSortDirection;
}

export const DEFAULT_PRO_POSITION_SORT: ProPositionSortConfig = {
  field: 'positionValue',
  direction: 'desc',
};

export const PRO_POSITION_SORT_OPTIONS: {
  id: ProPositionSortField;
  labelKey: string;
}[] = [
  {
    id: 'positionValue',
    labelKey: 'perps.pro_positions_panel.sort.position_value',
  },
  {
    id: 'unrealizedPnl',
    labelKey: 'perps.pro_positions_panel.sort.unrealized_pnl',
  },
  {
    id: 'fundingRate',
    labelKey: 'perps.pro_positions_panel.sort.funding_rate',
  },
];

const getSortValue = (
  position: Position,
  field: ProPositionSortField,
): number => {
  switch (field) {
    case 'positionValue':
      return parseFloat(position.positionValue) || 0;
    case 'unrealizedPnl':
      return parseFloat(position.unrealizedPnl) || 0;
    case 'fundingRate':
      return parseFloat(position.cumulativeFunding?.sinceOpen ?? '0') || 0;
    default:
      return 0;
  }
};

/**
 * Returns a new array of positions sorted by the selected field and direction.
 */
export const sortProPositions = (
  positions: Position[],
  config: ProPositionSortConfig,
): Position[] => {
  const multiplier = config.direction === 'asc' ? 1 : -1;

  return [...positions].sort((left, right) => {
    const leftValue = getSortValue(left, config.field);
    const rightValue = getSortValue(right, config.field);

    if (leftValue === rightValue) {
      return left.symbol.localeCompare(right.symbol);
    }

    return (leftValue - rightValue) * multiplier;
  });
};
