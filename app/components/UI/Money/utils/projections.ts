/** Number of years the projected earnings are simulated over. */
export const PROJECTION_YEARS = 1;

/**
 * Linear projection of earnings over a given time period.
 *
 * We intentionally use simple interest rather than compound interest because
 * the APY rate is variable and may change daily. Compounding a variable rate
 * over multiple years would create unrealistic return expectations.
 *
 * @param principalFiat - The fiat value of the principal amount.
 * @param apyPercent - APY expressed as a percentage (e.g. 4 for 4%).
 * @param years - The number of years to project over (defaults to 1).
 * @returns The projected earnings in fiat.
 */
export const calculateProjectedEarnings = (
  principalFiat: number,
  apyPercent: number,
  years: number = 1,
): number => principalFiat * (apyPercent / 100) * years;
