import { useMemo } from 'react';
import {
  PERFORMANCE_CONFIG,
  type PerpsProviderType,
} from '@metamask/perps-controller';
import {
  selectOrderLiquidationRow,
  type OrderLiquidationRow,
} from '../utils/crossMarginSummary';
import { usePerpsCrossLiquidationEstimate } from './usePerpsCrossLiquidationEstimate';

interface UseOrderLiquidationRowParams {
  isCrossOrder: boolean;
  isPositionLoading: boolean;
  symbol: string;
  entryPrice: number;
  /** Unsigned order size in base units. */
  positionSize: string;
  direction: 'long' | 'short';
  leverage: number;
  providerId: PerpsProviderType;
  hasValidAmount: boolean;
  isolatedPrice: string | undefined;
}

/**
 * Liquidation row for an order ticket. Cross orders use the Core account
 * estimate. Isolated orders use the controller price. The view only renders
 * the result.
 */
export const useOrderLiquidationRow = ({
  isCrossOrder,
  isPositionLoading,
  symbol,
  entryPrice,
  positionSize,
  direction,
  leverage,
  providerId,
  hasValidAmount,
  isolatedPrice,
}: UseOrderLiquidationRowParams): OrderLiquidationRow & {
  /** True until the first cross estimate resolves for the current market. */
  isAwaitingCrossEstimate: boolean;
} => {
  const { estimate: crossEstimate, isCalculating } =
    usePerpsCrossLiquidationEstimate(
      {
        symbol,
        direction,
        size: positionSize,
        entryPrice,
        leverage,
        providerId,
        enabled: isCrossOrder && !isPositionLoading,
      },
      { debounceMs: PERFORMANCE_CONFIG.ValidationDebounceMs },
    );

  const isAwaitingCrossEstimate =
    isCrossOrder && isCalculating && crossEstimate === undefined;

  return useMemo(
    () => ({
      ...selectOrderLiquidationRow({
        isCrossOrder,
        crossEstimate,
        hasValidAmount,
        isolatedPrice,
      }),
      isAwaitingCrossEstimate,
    }),
    [
      isCrossOrder,
      crossEstimate,
      hasValidAmount,
      isolatedPrice,
      isAwaitingCrossEstimate,
    ],
  );
};
