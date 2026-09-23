import { useMemo } from 'react';
import {
  PERFORMANCE_CONFIG,
  type PerpsProviderType,
  type Position,
} from '@metamask/perps-controller';
import { usePerpsPositionModifyPreview } from '../../../../hooks';
import { usePerpsLocale } from '../../../../hooks/usePerpsLocale';
import {
  formatProPerpsFiat,
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
 * @returns Display-ready before/after values, atomic TP/SL inputs, and whether
 * the first preview for this position is still pending.
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
  const locale = usePerpsLocale();
  const { preview, isAwaitingFirstPreview } = usePerpsPositionModifyPreview(
    {
      position,
      direction,
      size,
      price: String(price),
      leverage,
      reduceOnly,
      feeAmountUsd,
      providerId: providerId ?? position?.providerId,
      enabled,
    },
    // Live mid/mark and fee ticks re-request this preview while the form is
    // open on a held market. ValidationDebounceMs (300ms) coalesces those
    // estimates without a perceptible lag on typed size/leverage.
    { debounceMs: PERFORMANCE_CONFIG.ValidationDebounceMs },
  );

  const summaryDisplay = useMemo(
    () =>
      getPositionModifySummaryDisplay({
        preview,
        formatMargin: (value) =>
          formatProPerpsFiat(
            value,
            { ranges: PRICE_RANGES_MINIMAL_VIEW },
            locale,
          ),
        formatLiquidation: (value) =>
          formatProPerpsFiat(value, { ranges: PRICE_RANGES_UNIVERSAL }, locale),
        hasValidAmount,
      }),
    [hasValidAmount, locale, preview],
  );

  return {
    summaryDisplay,
    isAwaitingFirstPreview,
  };
};
