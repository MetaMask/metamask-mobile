/** Number of years the projected earnings are simulated over. */
export const PROJECTION_YEARS = 1;

/**
 * Compound projection of earnings over a given time period.
 *
 * APY already expresses the effective annual yield with intra-year compounding
 * baked in, so the honest way to derive earnings for any horizon is to compound
 * the rate: `(1 + apy)^years - 1`. At exactly one year this equals
 * `principal * apy`, and for fractional or multi-year horizons it stays
 * consistent with the compound projection used in BalanceProjection.
 *
 * @param principalFiat - The fiat value of the principal amount.
 * @param apyDecimal - APY expressed as a decimal (e.g. 0.04 for 4%).
 * @param years - The number of years to project over (defaults to 1).
 * @returns The projected earnings in fiat.
 */
export const calculateProjectedEarnings = (
  principalFiat: number,
  apyDecimal: number,
  years: number = 1,
): number => principalFiat * (Math.pow(1 + apyDecimal, years) - 1);
