import { TagSeverity, TextColor } from '@metamask/design-system-react-native';
import {
  getPerpsDisplaySymbol,
  type Position,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import {
  formatPercentage,
  formatPerpsFiat,
  formatProPercentage,
  formatProPerpsFiat,
  formatProPnl,
  formatProPositionSize,
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
  locale?: string,
): PerpsPositionHeaderDisplay => {
  const size = Number.parseFloat(position.size);
  const isLong = size > 0;
  const absoluteSize = Math.abs(size);
  const displaySymbol = getPerpsDisplaySymbol(position.symbol);
  const direction = isLong
    ? strings('perps.market.long')
    : strings('perps.market.short');
  const pnl = Number.parseFloat(position.unrealizedPnl);
  const roe = (Number.parseFloat(position.returnOnEquity) || 0) * 100;
  const pnlColor = pnl >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
  const positionValue = locale
    ? formatProPerpsFiat(
        position.positionValue,
        { ranges: PRICE_RANGES_MINIMAL_VIEW },
        locale,
      )
    : formatPerpsFiat(position.positionValue, {
        ranges: PRICE_RANGES_MINIMAL_VIEW,
      });
  const positionSize = locale
    ? formatProPositionSize(absoluteSize.toString(), undefined, locale)
    : formatPositionSize(absoluteSize.toString());
  const pnlText = locale ? formatProPnl(pnl, locale) : formatPnl(pnl);
  const roeText = locale
    ? formatProPercentage(roe, 1, locale)
    : formatPercentage(roe, 1);

  return {
    displaySymbol,
    absoluteSize,
    directionLabel: `${position.leverage.value}x ${direction}`,
    directionSeverity: isLong ? TagSeverity.Success : TagSeverity.Danger,
    description: `${positionSize} ${displaySymbol} • ${positionValue}`,
    pnlText,
    roeText,
    pnlColor,
  };
};
