import { useMemo } from 'react';
import type { PerpsProviderType } from '@metamask/perps-controller';
import {
  selectOrderLiquidationRow,
  type OrderLiquidationRow,
} from '../utils/crossMarginSummary';
import { usePerpsCrossLiquidationEstimate } from './usePerpsCrossLiquidationEstimate';

interface UseOrderLiquidationRowParams {
  isCrossOrder: boolean;
  symbol: string | undefined;
  direction: 'long' | 'short';
  entryPrice: number;
  /** Unsigned order size in base units. */
  positionSize: string;
  leverage: number;
  providerId?: PerpsProviderType;
  /** Changes when the account or position behind the cross estimate does. */
  refreshKey?: string;
  hasValidAmount: boolean;
  isolatedPrice: string | undefined;
}

/**
 * Liquidation row for an order ticket. Cross orders use
 * `PerpsController.estimateCrossLiquidation`; isolated orders use the
 * controller's isolated price. The view only renders the result.
 */
export const useOrderLiquidationRow = ({
  isCrossOrder,
  symbol,
  direction,
  entryPrice,
  positionSize,
  leverage,
  providerId,
  refreshKey,
  hasValidAmount,
  isolatedPrice,
}: UseOrderLiquidationRowParams): OrderLiquidationRow & {
  isCrossEstimateLoading: boolean;
} => {
  const { estimate: crossEstimate, isCalculating } =
    usePerpsCrossLiquidationEstimate({
      enabled: isCrossOrder && hasValidAmount,
      symbol,
      direction,
      size: positionSize,
      entryPrice,
      leverage,
      providerId,
      refreshKey,
    });
  const row = useMemo(
    () =>
      selectOrderLiquidationRow({
        isCrossOrder,
        crossEstimate,
        hasValidAmount,
        isolatedPrice,
      }),
    [isCrossOrder, crossEstimate, hasValidAmount, isolatedPrice],
  );
  return {
    ...row,
    isCrossEstimateLoading:
      isCrossOrder && hasValidAmount && isCalculating && !crossEstimate,
  };
};
