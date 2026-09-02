import {
  PERPS_CONSTANTS,
  type PositionModifyPreviewResult,
  type PositionPreviewValue,
} from '@metamask/perps-controller';

export interface PositionModifySummaryDisplay {
  /** Whether Margin / Est liquidation should use before → after. */
  showBeforeAfter: boolean;
  currentMarginDisplay: string;
  resultingMarginDisplay: string;
  currentLiquidationDisplay: string;
  resultingLiquidationDisplay: string;
  /**
   * Liquidation string for TP/SL risk checks when projecting an open position.
   * Undefined when there is no projected open liquidation to prefer.
   */
  tpslLiquidationPrice: string | undefined;
  /** Remaining-position direction for TP/SL; undefined when not projecting open. */
  tpslDirection: 'long' | 'short' | undefined;
}

const formatPreviewNumber = (
  value: PositionPreviewValue,
  format: (n: number) => string,
  fallback: string,
): string => (value.available ? format(value.value) : fallback);

/**
 * Maps a controller `previewPositionModify` result onto Pro order-form summary
 * and TP/SL inputs. Keeps presentation (before → after, fallbacks) in the
 * client while protocol math stays in `@metamask/perps-controller`.
 *
 * @param preview - Discriminated controller preview.
 * @param formatMargin - Formats a USD margin amount for display.
 * @param formatLiquidation - Formats a liquidation price for display.
 * @param hasValidAmount - Whether the order amount is valid for an "after" value.
 * @returns Display strings and TP/SL helpers; `showBeforeAfter` is false for
 * `none` / `unsupported`.
 */
export const getPositionModifySummaryDisplay = ({
  preview,
  formatMargin,
  formatLiquidation,
  hasValidAmount,
}: {
  preview: PositionModifyPreviewResult;
  formatMargin: (value: number) => string;
  formatLiquidation: (value: number) => string;
  hasValidAmount: boolean;
}): PositionModifySummaryDisplay => {
  const fallback = PERPS_CONSTANTS.FallbackDataDisplay;

  if (preview.status !== 'open' && preview.status !== 'full_close') {
    return {
      showBeforeAfter: false,
      currentMarginDisplay: fallback,
      resultingMarginDisplay: fallback,
      currentLiquidationDisplay: fallback,
      resultingLiquidationDisplay: fallback,
      tpslLiquidationPrice: undefined,
      tpslDirection: undefined,
    };
  }

  const currentMarginDisplay = formatPreviewNumber(
    preview.current.margin,
    formatMargin,
    fallback,
  );
  const currentLiquidationDisplay = formatPreviewNumber(
    preview.current.liquidationPrice,
    formatLiquidation,
    fallback,
  );

  if (preview.status === 'full_close') {
    return {
      showBeforeAfter: true,
      currentMarginDisplay,
      resultingMarginDisplay: hasValidAmount ? formatMargin(0) : fallback,
      currentLiquidationDisplay,
      resultingLiquidationDisplay: fallback,
      tpslLiquidationPrice: undefined,
      tpslDirection: undefined,
    };
  }

  const resultingMarginDisplay = hasValidAmount
    ? formatPreviewNumber(preview.resulting.margin, formatMargin, fallback)
    : fallback;
  const resultingLiquidationDisplay = hasValidAmount
    ? formatPreviewNumber(
        preview.resulting.liquidationPrice,
        formatLiquidation,
        fallback,
      )
    : fallback;
  const hasResultingLiquidation = preview.resulting.liquidationPrice.available;

  return {
    showBeforeAfter: true,
    currentMarginDisplay,
    resultingMarginDisplay,
    currentLiquidationDisplay,
    resultingLiquidationDisplay,
    tpslLiquidationPrice: hasResultingLiquidation
      ? String(preview.resulting.liquidationPrice.value)
      : undefined,
    tpslDirection: hasResultingLiquidation
      ? preview.resulting.direction
      : undefined,
  };
};
