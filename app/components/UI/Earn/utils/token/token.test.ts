import { getEstimatedAnnualRewards } from '.';

describe('tokenUtils', () => {
  describe('getEstimatedAnnualRewards', () => {
    it('calculates estimated annual rewards correctly', () => {
      const result = getEstimatedAnnualRewards(
        '10', // 10% APR
        1000,
        '1000000000000000000000',
        'usd',
        18,
        'ETH',
      );

      expect(result.estimatedAnnualRewardsFormatted).toBe('$100.00');
      expect(result.estimatedAnnualRewardsFiatNumber).toBe(100);
      expect(result.estimatedAnnualRewardsTokenMinimalUnit).toBe(
        '100000000000000000000',
      );
      expect(result.estimatedAnnualRewardsTokenFormatted).toBe('100 ETH');
    });

    it('handles small amounts by showing cents', () => {
      const result = getEstimatedAnnualRewards(
        '10', // 10% APR
        0.5, // $0.50 amount
        '500000000000000000', // 0.5 tokens (18 decimals)
        'USD',
        18,
        'ETH',
      );

      expect(result.estimatedAnnualRewardsFormatted).toBe('$0.05');
      expect(result.estimatedAnnualRewardsFiatNumber).toBe(0.05);
      expect(result.estimatedAnnualRewardsTokenMinimalUnit).toBe(
        '50000000000000000',
      );
      expect(result.estimatedAnnualRewardsTokenFormatted).toBe('0.05 ETH');
    });

    it('returns empty strings and zero values for invalid inputs', () => {
      const result = getEstimatedAnnualRewards(
        'NaN', // Invalid APR
        1000,
        '1000000000000000000000',
        'USD',
        18,
        'ETH',
      );

      expect(result.estimatedAnnualRewardsFormatted).toBe('');
      expect(result.estimatedAnnualRewardsFiatNumber).toBe(0);
      expect(result.estimatedAnnualRewardsTokenMinimalUnit).toBe('0');
      expect(result.estimatedAnnualRewardsTokenFormatted).toBe('');
    });
  });
});
