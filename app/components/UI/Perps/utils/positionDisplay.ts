import { TagSeverity, TextColor } from '@metamask/design-system-react-native';
import {
  calculateAccountReturnOnEquity,
  getPerpsDisplaySymbol,
  type AccountState,
  type Position,
} from '@metamask/perps-controller';
import { strings } from '../../../../../locales/i18n';
import {
  formatLeverage,
  formatRoePercentage,
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
 * An account's unrealized PnL and its return on the margin in use, from the
 * account totals: `"+$12.50 (+10.4%)"`. Without margin there is no return to
 * show, only the PnL; an unknown account shows both placeholders.
 *
 * @param account - Account totals, or nothing while they load.
 * @returns The display string.
 */
export const formatAccountPnl = (
  account:
    | Pick<AccountState, 'unrealizedPnl' | 'marginUsed'>
    | null
    | undefined,
): string => {
  const formatRoe = (roe: number | undefined) =>
    `(${formatRoePercentage(roe, roe !== undefined && roe < 0)})`;
  if (!account) {
    return `${formatPnl(undefined)} ${formatRoe(undefined)}`;
  }
  const pnl = formatPnl(account.unrealizedPnl);
  const roe = calculateAccountReturnOnEquity({
    unrealizedPnl: account.unrealizedPnl,
    marginUsed: account.marginUsed,
  });
  return roe === undefined ? pnl : `${pnl} ${formatRoe(roe)}`;
};

/**
 * Margin amount to show for a position.
 *
 * Hyperliquid reports raw initial margin on `marginUsed`. When cross equity
 * is below that initial margin, the venue shows a smaller figure, which the
 * controller puts on `displayMarginUsed`. Isolated positions and a healthy
 * cross account omit it or set it equal to `marginUsed`.
 *
 * @param position - Position carrying the venue margin fields.
 * @returns The margin string the position card should format.
 */
export const getDisplayedPositionMargin = (
  position: Pick<Position, 'marginUsed' | 'displayMarginUsed'>,
): string => {
  const displayed = position.displayMarginUsed?.trim();
  if (!displayed) {
    return position.marginUsed;
  }
  const value = Number.parseFloat(displayed);
  return Number.isFinite(value) ? displayed : position.marginUsed;
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
  const roe = parsePositionRoePercentage(position.returnOnEquity);
  const pnlColor = pnl >= 0 ? TextColor.SuccessDefault : TextColor.ErrorDefault;
  const positionValue = formatPerpsFiat(position.positionValue, {
    ranges: PRICE_RANGES_MINIMAL_VIEW,
  });

  return {
    displaySymbol,
    absoluteSize,
    directionLabel:
      position.leverage.value === undefined
        ? direction
        : `${formatLeverage(position.leverage.value)} ${direction}`,
    directionSeverity: isLong ? TagSeverity.Success : TagSeverity.Danger,
    description: `${formatPositionSize(
      absoluteSize.toString(),
    )} ${displaySymbol} • ${positionValue}`,
    pnlText: formatPnl(pnl),
    roeText: formatRoePercentage(roe, pnl < 0),
    pnlColor,
  };
};
