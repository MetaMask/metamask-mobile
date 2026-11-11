import type {
  AccountState,
  CrossMarginSummary,
} from '@metamask/perps-controller';

export type CrossMarginRatioTone = 'safe' | 'warning' | 'danger';

export interface CrossMarginAccountSummary {
  /** Cross maintenance margin over cross collateral (0..1+). */
  accountRatio?: number;
  /** Cross maintenance margin in USD. */
  maintenanceMargin?: number;
  /** Cross notional over total account equity. */
  accountLeverage?: number;
  /** Cross margin used over cross collateral (0..1+). */
  crossMarginUsage?: number;
}

/** Ratio at and above which the account is shown as elevated risk. */
export const CROSS_MARGIN_RATIO_WARNING_THRESHOLD = 0.5;
/** Ratio above which the account is shown as critical risk. */
export const CROSS_MARGIN_RATIO_DANGER_THRESHOLD = 0.75;

const toFiniteNumber = (value: string | number | undefined | null) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const share = (
  numerator: number | undefined,
  denominator: number | undefined,
): number | undefined => {
  if (numerator === undefined || denominator === undefined) {
    return undefined;
  }
  if (denominator <= 0) {
    return undefined;
  }
  return numerator / denominator;
};

/**
 * Collateral backing cross positions: the cross account value plus any spot
 * collateral the venue counts towards perps margin.
 */
export const getCrossCollateral = (
  crossMarginSummary: CrossMarginSummary | undefined,
  spotCollateral?: number,
): number | undefined => {
  const accountValue = toFiniteNumber(crossMarginSummary?.accountValue);
  if (accountValue === undefined) {
    return undefined;
  }
  return accountValue + (spotCollateral ?? 0);
};

/**
 * Derives the cross margin metrics shown in the balance summary. Mirrors
 * `calculateAccountSummary` from newer `@metamask/perps-controller` versions.
 */
export const calculateCrossMarginAccountSummary = ({
  totalEquity,
  crossMarginSummary,
  spotCollateral,
}: {
  totalEquity: string | number | undefined;
  crossMarginSummary: CrossMarginSummary | undefined;
  spotCollateral?: number;
}): CrossMarginAccountSummary => {
  const collateral = getCrossCollateral(crossMarginSummary, spotCollateral);
  const maintenanceMargin = toFiniteNumber(
    crossMarginSummary?.maintenanceMargin,
  );
  return {
    maintenanceMargin,
    accountRatio: share(maintenanceMargin, collateral),
    accountLeverage: share(
      toFiniteNumber(crossMarginSummary?.notional),
      toFiniteNumber(totalEquity),
    ),
    crossMarginUsage: share(
      toFiniteNumber(crossMarginSummary?.marginUsed),
      collateral,
    ),
  };
};

export const calculateCrossMarginAccountSummaryFromAccount = (
  account: AccountState | null | undefined,
): CrossMarginAccountSummary =>
  calculateCrossMarginAccountSummary({
    totalEquity: account?.totalBalance,
    crossMarginSummary: account?.crossMarginSummary,
  });

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
  spotCollateral,
}: {
  entryPrice: number;
  /** Unsigned order size in base units. */
  size: number;
  isLong: boolean;
  maxLeverage: number;
  crossMarginSummary: CrossMarginSummary | undefined;
  spotCollateral?: number;
}): number | undefined => {
  const collateral = getCrossCollateral(crossMarginSummary, spotCollateral);
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

/**
 * Formats a 0..1 ratio as a percentage with at most one decimal, e.g.
 * `0.174` => `"17.4%"` and `0.63` => `"63%"`.
 */
export const formatCrossMarginRatio = (ratio: number): string =>
  `${Number((ratio * 100).toFixed(1))}%`;

/**
 * Formats account leverage with at most 2 decimals, e.g. `12.5` => `"12.5x"`.
 */
export const formatAccountLeverage = (leverage: number): string =>
  `${Number(leverage.toFixed(2))}x`;
