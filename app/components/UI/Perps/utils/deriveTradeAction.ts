import { PERPS_EVENT_VALUE, type Position } from '@metamask/perps-controller';
import { getPositionDirection } from './positionCalculations';

export type PerpsTradeAction =
  | typeof PERPS_EVENT_VALUE.ACTION.CREATE_POSITION
  | typeof PERPS_EVENT_VALUE.ACTION.INCREASE_EXPOSURE
  | typeof PERPS_EVENT_VALUE.ACTION.FLIP_LONG_TO_SHORT
  | typeof PERPS_EVENT_VALUE.ACTION.FLIP_SHORT_TO_LONG;

/**
 * Derive the perps place-order trade action from the existing position (null
 * when flat) and the incoming order direction.
 *
 * - no position -> create_position
 * - same direction -> increase_exposure
 * - opposite direction -> flip_long_to_short / flip_short_to_long
 *
 * The controller forwards this verbatim as the transaction `action` property
 * (via `trackingData.tradeAction`), and the PERPS_TRANSACTION_CONSIDERED event
 * uses the same derivation so the considered and executed events agree.
 *
 * @param existingPosition - The existing position, or null/undefined when flat.
 * @param orderDirection - The incoming order direction.
 * @returns The derived trade action.
 */
export function derivePerpsTradeAction(
  existingPosition: Pick<Position, 'size'> | null | undefined,
  orderDirection: 'long' | 'short',
): PerpsTradeAction {
  const positionDirection = existingPosition
    ? getPositionDirection(existingPosition.size)
    : 'unknown';

  if (positionDirection === 'unknown') {
    return PERPS_EVENT_VALUE.ACTION.CREATE_POSITION;
  }
  if (positionDirection === orderDirection) {
    return PERPS_EVENT_VALUE.ACTION.INCREASE_EXPOSURE;
  }
  return positionDirection === 'long'
    ? PERPS_EVENT_VALUE.ACTION.FLIP_LONG_TO_SHORT
    : PERPS_EVENT_VALUE.ACTION.FLIP_SHORT_TO_LONG;
}
