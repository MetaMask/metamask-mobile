/**
 * Proportional pad applied to the membership top-up, in parts per million
 * (10 ppm = 0.001%).
 *
 * The Veda teller mints `floor(amount * 1e6 / (rate + 1))` shares, but values
 * them at `floor(shares * rate / 1e6)`. The `+ 1` loses `amount / (rate + 1)`,
 * about 1 ppm at rate 1e6, and each `floor` drops up to one more base unit.
 * For example, depositing 4.99 mUSD (4,990,000 units) at rate 1,000,000 mints
 * floor(4,990,000 * 1,000,000 / 1,000,001) = 4,989,995 shares, worth
 * 4,989,995 units: 5 units (~1 ppm) short.
 *
 * The funds are deposited twice (base vault, then premium vault migration),
 * so funding exactly 4,990,000 settles at about 4,989,989 and fails the
 * `>= 4,990,000` balance check. The pad must cover >= ~2 ppm plus a few
 * units. 10 ppm keeps the pad under 1 cent for plans up to ~$1,000, so the
 * displayed price is unchanged.
 */
export const MEMBERSHIP_FUNDING_PAD_PPM = BigInt(10);

/**
 * Fixed pad added to the membership top-up, in mUSD base units (6 decimals).
 * Covers the per-deposit rounding of a few base units; see
 * {@link MEMBERSHIP_FUNDING_PAD_PPM}.
 */
export const MEMBERSHIP_FUNDING_PAD_FIXED_UNITS = BigInt(10);

const PPM_DENOMINATOR = BigInt(1_000_000);

/**
 * Pads an mUSD shortfall so the value that lands in the premium vault, after
 * vault deposit rounding losses, still covers the shortfall.
 *
 * @param shortfall - Missing mUSD in base units (6 decimals).
 * @returns Amount to fund in base units, or 0 when there is no shortfall.
 */
export function getMembershipFundingAmount(shortfall: bigint): bigint {
  if (shortfall <= BigInt(0)) {
    return BigInt(0);
  }

  const proportionalPad =
    (shortfall * MEMBERSHIP_FUNDING_PAD_PPM + PPM_DENOMINATOR - BigInt(1)) /
    PPM_DENOMINATOR;

  return shortfall + proportionalPad + MEMBERSHIP_FUNDING_PAD_FIXED_UNITS;
}
