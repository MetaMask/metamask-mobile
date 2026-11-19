import {
  MEMBERSHIP_FUNDING_PAD_FIXED_UNITS,
  MEMBERSHIP_FUNDING_PAD_PPM,
  getMembershipFundingAmount,
} from './membershipFundingAmount';

const UNITS_PER_CENT = BigInt(10_000);

/** Simulates base-vault deposit then premium-vault migration deposit. */
function simulateVaultValue(
  funding: bigint,
  baseRate: bigint,
  premiumRate: bigint,
): bigint {
  const million = BigInt(1_000_000);
  const baseShares = (funding * million) / (baseRate + BigInt(1));
  const musd = (baseShares * baseRate) / million;
  const premiumShares = (musd * million) / (premiumRate + BigInt(1));
  return (premiumShares * premiumRate) / million;
}

describe('getMembershipFundingAmount', () => {
  it('exposes pad constants', () => {
    expect(MEMBERSHIP_FUNDING_PAD_PPM).toBe(BigInt(10));
    expect(MEMBERSHIP_FUNDING_PAD_FIXED_UNITS).toBe(BigInt(10));
  });

  it.each([
    [4_990_000, 4_990_060],
    [39_990_000, 39_990_410],
    [499_000_000, 499_005_000],
    [10_000, 10_011],
    [1, 12],
  ])('pads shortfall %d to %d', (shortfall, expected) => {
    const result = getMembershipFundingAmount(BigInt(shortfall));

    expect(result).toBe(BigInt(expected));
  });

  it('returns 0 for zero shortfall', () => {
    const result = getMembershipFundingAmount(BigInt(0));

    expect(result).toBe(BigInt(0));
  });

  it('returns 0 for negative shortfall', () => {
    const result = getMembershipFundingAmount(BigInt(-5_000_000));

    expect(result).toBe(BigInt(0));
  });

  it('keeps displayed cents unchanged for 4.99 and 499 plans', () => {
    const shortfalls = [BigInt(4_990_000), BigInt(499_000_000)];

    shortfalls.forEach((shortfall) => {
      const padded = getMembershipFundingAmount(shortfall);

      expect(padded - shortfall).toBeLessThan(UNITS_PER_CENT);
      expect(padded / UNITS_PER_CENT).toBe(shortfall / UNITS_PER_CENT);
    });
  });

  describe('vault deposit rounding coverage', () => {
    const shortfalls = [
      1, 10_000, 500_000, 4_990_000, 49_990_000, 499_000_000, 1_000_000_000,
    ];
    const rates = [1_000_000, 1_003_008, 1_500_000, 2_000_000];

    it('documents that unpadded 4,990,000 is short at rates 1_000_000 / 1_003_008', () => {
      const shortfall = BigInt(4_990_000);

      const value = simulateVaultValue(
        shortfall,
        BigInt(1_000_000),
        BigInt(1_003_008),
      );

      expect(value).toBeLessThan(shortfall);
    });

    it.each(shortfalls)(
      'padded funding covers shortfall %d across all rate pairs',
      (shortfallNumber) => {
        const shortfall = BigInt(shortfallNumber);
        const funding = getMembershipFundingAmount(shortfall);

        rates.forEach((baseRate) => {
          rates.forEach((premiumRate) => {
            const value = simulateVaultValue(
              funding,
              BigInt(baseRate),
              BigInt(premiumRate),
            );

            expect(value >= shortfall).toBe(true);
          });
        });
      },
    );
  });
});
