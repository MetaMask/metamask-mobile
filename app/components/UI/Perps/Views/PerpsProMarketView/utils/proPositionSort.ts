import {
  DEFAULT_PRO_LAYOUT_PREFERENCES,
  type Position,
  type ProPositionsSortConfig,
  type ProPositionsSortField,
} from '@metamask/perps-controller';
import { compareProSortValues, type ProSortDirection } from './proSortCompare';

export type ProPositionSortField = ProPositionsSortField;

export type ProPositionSortDirection = ProSortDirection;

export type ProPositionSortConfig = ProPositionsSortConfig;

export const DEFAULT_PRO_POSITION_SORT: ProPositionSortConfig = {
  ...DEFAULT_PRO_LAYOUT_PREFERENCES.positionsSortConfig,
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
  fundingRatesBySymbol?: Readonly<Record<string, number | undefined>>,
): number => {
  switch (field) {
    case 'positionValue':
      return parseFloat(position.positionValue) || 0;
    case 'unrealizedPnl':
      return parseFloat(position.unrealizedPnl) || 0;
    case 'fundingRate':
      return fundingRatesBySymbol?.[position.symbol] ?? 0;
    default:
      return 0;
  }
};

/**
 * Returns a new array of positions sorted by the selected field and direction.
 * Funding-rate sorts use live market funding rates keyed by position symbol.
 */
export const sortProPositions = (
  positions: Position[],
  config: ProPositionSortConfig,
  fundingRatesBySymbol?: Readonly<Record<string, number | undefined>>,
): Position[] =>
  [...positions].sort((left, right) =>
    compareProSortValues(
      getSortValue(left, config.field, fundingRatesBySymbol),
      getSortValue(right, config.field, fundingRatesBySymbol),
      config.direction,
      () => left.symbol.localeCompare(right.symbol),
    ),
  );
