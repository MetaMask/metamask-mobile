import { strings } from '../../../../../locales/i18n';
import { OrderParams } from '../controllers/types';
import { Position } from '../hooks';

/**
 * Get the order direction based on the side and position size
 * @param side - The side of the order
 * @param positionSize - The size of the position
 * @returns The order direction
 */
export const getOrderDirection = (
  side: 'buy' | 'sell',
  positionSize: string | undefined,
): string => {
  const hasPosition = !!positionSize;

  // No existing position → direction depends only on side
  if (!hasPosition) {
    return side === 'buy'
      ? strings('perps.market.long')
      : strings('perps.market.short');
  }

  // Existing position → infer direction based on position size
  if (positionSize && parseFloat(positionSize) > 0) {
    return strings('perps.market.long');
  }

  return strings('perps.market.short');
};

export const willFlipPosition = (
  currentPosition: Position,
  orderParams: OrderParams,
): boolean => {
  const currentPositionSize = parseFloat(currentPosition.size);
  const positionDirection = currentPositionSize > 0 ? 'long' : 'short';
  const orderDirection = orderParams.isBuy ? 'long' : 'short';
  const orderSize = parseFloat(orderParams.size);

  if (orderParams.reduceOnly === true) {
    return false;
  }

  if (orderParams.orderType !== 'market') {
    return false;
  }

  if (positionDirection === orderDirection) {
    return false;
  }

  if (orderSize > Math.abs(currentPositionSize)) {
    return true;
  }

  return false;
};
