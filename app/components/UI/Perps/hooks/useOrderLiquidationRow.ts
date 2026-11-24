import { useMemo } from 'react';
import type {
  CrossMarginSummary,
  PerpsProviderType,
} from '@metamask/perps-controller';
import {
  estimateCrossLiquidationPrice,
  selectOrderLiquidationRow,
  type OrderLiquidationRow,
} from '../utils/crossMarginSummary';

interface UseOrderLiquidationRowParams {
  isCrossOrder: boolean;
  isPositionLoading: boolean;
  entryPrice: number;
  positionSize: string;
  isLong: boolean;
  maxLeverage: number | undefined;
  marginTableId?: number;
  crossMarginSummary: CrossMarginSummary | undefined;
  spotCollateral: string | undefined;
  providerId: PerpsProviderType;
  existingSignedSize: number;
  hasValidAmount: boolean;
  isolatedPrice: string;
}

/**
 * Liquidation row for an order ticket. Cross orders use the account estimate.
 * Isolated orders use the controller price. The view only renders the result.
 */
export const useOrderLiquidationRow = ({
  isCrossOrder,
  isPositionLoading,
  entryPrice,
  positionSize,
  isLong,
  maxLeverage,
  marginTableId,
  crossMarginSummary,
  spotCollateral,
  providerId,
  existingSignedSize,
  hasValidAmount,
  isolatedPrice,
}: UseOrderLiquidationRowParams): OrderLiquidationRow =>
  useMemo(() => {
    const crossEstimate =
      !isCrossOrder || isPositionLoading || typeof maxLeverage !== 'number'
        ? ({ status: 'unknown' } as const)
        : estimateCrossLiquidationPrice({
            entryPrice,
            size: Number.parseFloat(positionSize),
            isLong,
            maxLeverage,
            crossMarginSummary,
            spotCollateral,
            providerId,
            existingSignedSize,
            marginTableId,
          });
    return selectOrderLiquidationRow({
      isCrossOrder,
      crossEstimate,
      hasValidAmount,
      isolatedPrice,
    });
  }, [
    isCrossOrder,
    isPositionLoading,
    entryPrice,
    positionSize,
    isLong,
    maxLeverage,
    marginTableId,
    crossMarginSummary,
    spotCollateral,
    providerId,
    existingSignedSize,
    hasValidAmount,
    isolatedPrice,
  ]);
