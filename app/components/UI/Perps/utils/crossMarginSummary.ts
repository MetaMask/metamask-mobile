import {
  calculateAccountSummary,
  getCrossCollateral,
  type AccountState,
  type CrossMarginSummary,
  type PerpsAccountSummary,
} from '@metamask/perps-controller';
import {
  CROSS_MARGIN_RATIO_DANGER_THRESHOLD,
  CROSS_MARGIN_RATIO_WARNING_THRESHOLD,
  CROSS_MARGIN_SPOT_COLLATERAL,
} from '../constants/perpsConfig';

export type CrossMarginRatioTone = 'safe' | 'warning' | 'danger';

const EMPTY_ACCOUNT_SUMMARY: PerpsAccountSummary = {
  maintenanceMargin: undefined,
  accountRatio: undefined,
  accountLeverage: undefined,
  crossMarginUsage: undefined,
};

/**
 * Derives the cross margin metrics shown in the balance summary from the
 * streamed account, using Core's account summary.
 */
export const calculateCrossMarginAccountSummaryFromAccount = (
  account: AccountState | null | undefined,
): PerpsAccountSummary =>
  account
    ? calculateAccountSummary({
        totalEquity: account.totalBalance,
        crossMarginSummary: account.crossMarginSummary,
        spotCollateral: CROSS_MARGIN_SPOT_COLLATERAL,
      })
    : EMPTY_ACCOUNT_SUMMARY;

const toFiniteNumber = (value: string | undefined): number | undefined => {
  if (value === undefined || value === '') {
    return undefined;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/**
 * Estimates where a new cross position liquidates: the price at which the
 * cross collateral, after the position's P&L, falls to the maintenance margin
 * of the existing cross positions plus the new one. Maintenance margin is half
 * the initial margin at the market's max leverage.
 *
 * @returns The liquidation price, or undefined when an input is missing or the
 * position cannot be liquidated at a positive price.
 */
export const estimateCrossLiquidationPrice = ({
  entryPrice,
  size,
  isLong,
  maxLeverage,
  crossMarginSummary,
}: {
  entryPrice: number;
  /** Unsigned order size in base units. */
  size: number;
  isLong: boolean;
  maxLeverage: number;
  crossMarginSummary: CrossMarginSummary | undefined;
}): number | undefined => {
  const collateral = getCrossCollateral(
    crossMarginSummary,
    CROSS_MARGIN_SPOT_COLLATERAL,
  );
  const maintenanceMargin = toFiniteNumber(
    crossMarginSummary?.maintenanceMargin,
  );
  if (
    collateral === undefined ||
    maintenanceMargin === undefined ||
    !(entryPrice > 0) ||
    !(size > 0) ||
    !(maxLeverage > 0)
  ) {
    return undefined;
  }
  const side = isLong ? 1 : -1;
  const maintenanceFraction = 1 / (2 * maxLeverage);
  const marginAvailable =
    collateral - maintenanceMargin - size * entryPrice * maintenanceFraction;
  const liquidationPrice =
    entryPrice -
    (side * marginAvailable) / size / (1 - maintenanceFraction * side);
  return Number.isFinite(liquidationPrice) && liquidationPrice > 0
    ? liquidationPrice
    : undefined;
};

export const getCrossMarginRatioTone = (
  ratio: number | undefined,
): CrossMarginRatioTone | undefined => {
  if (ratio === undefined || !Number.isFinite(ratio)) {
    return undefined;
  }
  if (ratio < CROSS_MARGIN_RATIO_WARNING_THRESHOLD) {
    return 'safe';
  }
  return ratio <= CROSS_MARGIN_RATIO_DANGER_THRESHOLD ? 'warning' : 'danger';
};
