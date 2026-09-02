import { useMemo } from 'react';
import type { PerpsProviderType, Position } from '@metamask/perps-controller';
import { usePerpsPositionModifyPreview } from '../../../../hooks';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
  PRICE_RANGES_UNIVERSAL,
} from '../../../../utils/formatUtils';
import { getPositionModifySummaryDisplay } from '../../../../utils/positionModifyPreview';

export interface UsePerpsProPositionModifyPreviewParams {
  position: Position | null | undefined;
  direction: 'long' | 'short';
  size: string;
  price: number;
  leverage: number;
  reduceOnly: boolean;
  feeAmountUsd?: number;
  providerId?: PerpsProviderType;
  hasValidAmount: boolean;
  enabled: boolean;
}

/**
 * Owns Pro-form position-modify preview orchestration and display mapping.
 * Protocol calculations remain in `PerpsController.previewPositionModify`.
 *
 * @param params - Current position, proposed order, and display state.
 * @returns Display-ready before/after values, atomic TP/SL inputs, and loading.
 */
export const usePerpsProPositionModifyPreview = ({
  position,
  direction,
  size,
  price,
  leverage,
  reduceOnly,
  feeAmountUsd,
  providerId,
  hasValidAmount,
  enabled,
}: UsePerpsProPositionModifyPreviewParams) => {
  const { preview, isCalculating } = usePerpsPositionModifyPreview({
    position,
    direction,
    size,
    price: String(price),
    leverage,
    reduceOnly,
    feeAmountUsd,
    providerId: providerId ?? position?.providerId,
    enabled,
  });

  const summaryDisplay = useMemo(
    () =>
      getPositionModifySummaryDisplay({
        preview,
        formatMargin: (value) =>
          formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW }),
        formatLiquidation: (value) =>
          formatPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL }),
        hasValidAmount,
      }),
    [hasValidAmount, preview],
  );

  return {
    summaryDisplay,
    isCalculating,
  };
};
