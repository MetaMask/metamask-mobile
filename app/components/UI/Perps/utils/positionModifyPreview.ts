import {
  PERPS_CONSTANTS,
  type PositionModifyPreviewResult,
  type PositionPreviewValue,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';

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

/** A Cross position its account's collateral covers has no liquidation price. */
const formatPreviewLiquidation = (
  value: PositionPreviewValue,
  format: (n: number) => string,
  fallback: string,
): string =>
  !value.available && value.reason === 'covered_by_account'
    ? strings('perps.cross_position.no_liquidation_price')
    : formatPreviewNumber(value, format, fallback);

/**
 * Maps a controller `previewPositionModify` result onto Pro order-form summary
 * and TP/SL inputs. Keeps presentation (before → after, fallbacks) in the
 * client while protocol math stays in `@metamask/perps-controller`.
 *
 * @param preview - Discriminated controller preview.
 * @param formatMargin - Formats a USD margin amount for display.
 * @param formatLiquidation - Formats a liquidation price for display.
 * @param hasValidAmount - Whether the order amount is valid for an "after" value.
 * @param isCurrentCoveredByAccount - Whether the open position is a Cross one
 * its account's collateral keeps out of liquidation.
 * @returns Display strings and TP/SL helpers; `showBeforeAfter` is false for
 * `none` / `unsupported`.
 */
export const getPositionModifySummaryDisplay = ({
  preview,
  formatMargin,
  formatLiquidation,
  hasValidAmount,
  isCurrentCoveredByAccount = false,
}: {
  preview: PositionModifyPreviewResult;
  formatMargin: (value: number) => string;
  formatLiquidation: (value: number) => string;
  hasValidAmount: boolean;
  isCurrentCoveredByAccount?: boolean;
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
  const currentLiquidationDisplay = isCurrentCoveredByAccount
    ? strings('perps.cross_position.no_liquidation_price')
    : formatPreviewNumber(
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
    ? formatPreviewLiquidation(
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

/** Where an order on an open Cross position leaves it liquidated. */
export type CrossPreviewLiquidation =
  | { status: 'price'; price: string }
  | { status: 'none' }
  | { status: 'unavailable' };

/**
 * @param preview - Discriminated controller preview of a Cross position.
 * @returns A price, `none` when the position closes or the account's collateral
 * covers it, or `unavailable` without an estimate.
 */
export const getCrossPreviewLiquidation = (
  preview: PositionModifyPreviewResult,
): CrossPreviewLiquidation => {
  if (preview.status === 'full_close') {
    return { status: 'none' };
  }
  if (preview.status !== 'open') {
    return { status: 'unavailable' };
  }
  const { liquidationPrice } = preview.resulting;
  if (liquidationPrice.available) {
    return { status: 'price', price: String(liquidationPrice.value) };
  }
  return {
    status:
      liquidationPrice.reason === 'covered_by_account' ? 'none' : 'unavailable',
  };
};
