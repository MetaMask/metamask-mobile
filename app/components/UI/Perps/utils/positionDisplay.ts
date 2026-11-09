import { TagSeverity, TextColor } from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type Position,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import {
  formatPercentage,
  formatPerpsFiat,
  formatPnl,
  formatPositionSize,
  PRICE_RANGES_MINIMAL_VIEW,
} from './formatUtils';

export interface PerpsPositionHeaderDisplay {
  displaySymbol: string;
  absoluteSize: number;
  directionLabel: string;
  directionSeverity: TagSeverity;
  description: string;
  pnlText: string;
  roeText: string;
  pnlColor: TextColor;
}

/**
 * Parses a position's `returnOnEquity` into the percentage value the UI
 * renders. `returnOnEquity` is a decimal ratio (0.103 represents +10.30%).
 *
 * @param returnOnEquity - Raw `returnOnEquity` string from a position.
 * @returns The RoE as a percentage (for example, 10.3), or undefined when the
 * value is missing or malformed so callers can omit it instead of
 * fabricating 0.00%.
 */
export const parsePositionRoePercentage = (
  returnOnEquity: string | undefined,
): number | undefined => {
  const roeValue = Number.parseFloat(returnOnEquity ?? '');
  return Number.isNaN(roeValue) ? undefined : roeValue * 100;
};

/**
 * Derives the shared display values used by Lite and Pro position headers.
 *
 * Position size is signed by direction, while return on equity is provided as
 * a decimal ratio (for example, 0.1 represents 10%).
 *
 * @param position - Perps position to format.
 * @returns Shared position header display values.
 */
export const getPerpsPositionHeaderDisplay = (
  position: Position,
): PerpsPositionHeaderDisplay => {
  const size = Number.parseFloat(position.size);
  const isLong = size > 0;
  const absoluteSize = Math.abs(size);
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);
  const direction = isLong
    ? strings('perps.market.long')
    : strings('perps.market.short');
  const pnl = Number.parseFloat(position.unrealizedPnl);
  const roe = parsePositionRoePercentage(position.returnOnEquity) ?? 0;
  const pnlColor = pnl >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
  const positionValue = formatPerpsFiat(position.positionValue, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });

  return {
    displaySymbol,
    absoluteSize,
    directionLabel: `${position.leverage.value}x ${direction}`,
    directionSeverity: isLong ? TagSeverity.Success : TagSeverity.Danger,
    description: `${formatPositionSize(
      absoluteSize.toString(),
    )} ${displaySymbol} • ${positionValue}`,
    pnlText: formatPnl(pnl),
    roeText: formatPercentage(roe, 1),
    pnlColor,
  };
};
