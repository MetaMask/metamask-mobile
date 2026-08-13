import type { Position } from '@metamask/perps-controller';
import { getPositionDirection } from './positionCalculations';

/** Tolerance for token-size comparisons (covers floating-point / szDecimals noise). */
const SIZE_EPSILON = 1e-10;

export type ReduceOnlyValidationCode =
  | 'no_position'
  | 'wrong_side'
  | 'too_large';

export type ReduceOnlyOrderDirection = 'long' | 'short';

export interface ValidateReduceOnlyOrderParams {
  reduceOnly: boolean;
  /** Form direction: long = buy, short = sell. */
  direction: ReduceOnlyOrderDirection;
  /** Proposed order size in token units. */
  orderSize: string;
  /** Current position for the market, if any. */
  position: Position | null;
}

export interface ValidateReduceOnlyOrderResult {
  isValid: boolean;
  errorCode?: ReduceOnlyValidationCode;
  /**
   * True when the order consumes the full open position.
   * Callers may pass `isFullClose` to the controller so dust closes skip the
   * minimum-notional gate.
   */
  isFullClose: boolean;
}

/**
 * Validates reduce-only order semantics against the live position. Returns the
 * first blocking error in priority order:
 * no-position → wrong-side → too-large.
 *
 * When `reduceOnly` is false, the result is always valid.
 */
export const validateReduceOnlyOrder = ({
  reduceOnly,
  direction,
  orderSize,
  position,
}: ValidateReduceOnlyOrderParams): ValidateReduceOnlyOrderResult => {
  if (!reduceOnly) {
    return {
      isValid: true,
      isFullClose: false,
    };
  }

  const positionDirection = position
    ? getPositionDirection(position.size)
    : 'unknown';

  if (!position || positionDirection === 'unknown') {
    return {
      isValid: false,
      errorCode: 'no_position',
      isFullClose: false,
    };
  }

  if (direction === positionDirection) {
    return {
      isValid: false,
      errorCode: 'wrong_side',
      isFullClose: false,
    };
  }

  const absolutePositionSize = Math.abs(Number.parseFloat(position.size));

  const parsedOrderSize = Number.parseFloat(orderSize);
  // Empty/zero size is not `too_large`; usePerpsOrderValidation already marks
  // the form invalid when positionSize <= 0 before controller validation runs.
  const orderSizeValue =
    Number.isFinite(parsedOrderSize) && parsedOrderSize > 0
      ? parsedOrderSize
      : 0;

  if (orderSizeValue > absolutePositionSize + SIZE_EPSILON) {
    return {
      isValid: false,
      errorCode: 'too_large',
      isFullClose: false,
    };
  }

  const isFullClose =
    absolutePositionSize > 0 &&
    orderSizeValue + SIZE_EPSILON >= absolutePositionSize;

  return {
    isValid: true,
    isFullClose,
  };
};
