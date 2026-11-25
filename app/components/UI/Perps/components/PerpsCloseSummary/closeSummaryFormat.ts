import { PERPS_CONSTANTS } from '@metamask/perps-controller';
import { TextColor } from '@metamask/design-system-react-native';
import {
  formatPerpsFiat,
  PRICE_RANGES_MINIMAL_VIEW,
} from '../../utils/formatUtils';

/** Formats a close amount, or the unavailable state while it is unknown. */
export const formatCloseSummaryFiat = (value: number | undefined): string =>
  value === undefined
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : formatPerpsFiat(value, { ranges: PRICE_RANGES_MINIMAL_VIEW });

/** Formats a close P&L with its sign, or the unavailable state while it is unknown. */
export const formatSignedCloseSummaryFiat = (
  value: number | undefined,
): string =>
  value === undefined
    ? PERPS_CONSTANTS.FallbackDataDisplay
    : `${value < 0 ? '-' : '+'}${formatCloseSummaryFiat(Math.abs(value))}`;

/** P&L color; neutral while the P&L is unknown. */
export const getCloseSummaryPnlColor = (
  value: number | undefined,
): TextColor => {
  if (value === undefined) {
    return TextColor.TextDefault;
  }
  return value < 0 ? TextColor.ErrorDefault : TextColor.SuccessDefault;
};
