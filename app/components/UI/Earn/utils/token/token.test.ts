import { CHAIN_IDS } from '@metamask/transaction-controller';
import {
  getEstimatedAnnualRewards,
  sortByHighestRewards,
  sortByHighestApr,
} from '.';
import {
  createMockEarnToken,
  getCreateMockTokenOptions,
} from '../../../Stake/testUtils';
import { TOKENS_WITH_DEFAULT_OPTIONS } from '../../../Stake/testUtils/testUtils.types';
import { EarnTokenDetails } from '../../types/lending.types';

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

  describe('sortByHighestRewards', () => {
    const tokens = [
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.ETH,
        ),
        experience: {
          apr: '2.5',
          estimatedAnnualRewardsFiatNumber: 50,
        } as EarnTokenDetails['experience'],
      }),
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.DAI,
        ),
        experience: {
          apr: '3.0',
          estimatedAnnualRewardsFiatNumber: 100,
        } as EarnTokenDetails['experience'],
      }),
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.USDC,
        ),
        experience: {
          apr: '1.0',
          estimatedAnnualRewardsFiatNumber: 10,
        } as EarnTokenDetails['experience'],
      }),
    ];

    it('sorts tokens by highest fiat rewards', () => {
      const sorted = sortByHighestRewards(tokens);

      expect(sorted[0].experience.estimatedAnnualRewardsFiatNumber).toBe(100);
      expect(sorted[1].experience.estimatedAnnualRewardsFiatNumber).toBe(50);
      expect(sorted[2].experience.estimatedAnnualRewardsFiatNumber).toBe(10);
    });

    it('handles tokens with zero rewards', () => {
      const tokensWithZero = [
        ...tokens,
        createMockEarnToken({
          ...getCreateMockTokenOptions(
            CHAIN_IDS.MAINNET,
            TOKENS_WITH_DEFAULT_OPTIONS.USDT,
          ),
          experience: {
            apr: '0.0',
            estimatedAnnualRewardsFiatNumber: 0,
          } as EarnTokenDetails['experience'],
        }),
      ];
      const sorted = sortByHighestRewards(tokensWithZero);

      expect(
        sorted[sorted.length - 1].experience.estimatedAnnualRewardsFiatNumber,
      ).toBe(0);
    });

    it('returns empty array if input is empty', () => {
      expect(sortByHighestRewards([])).toEqual([]);
    });
  });

  describe('sortByHighestApr', () => {
    const tokens = [
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.ETH,
        ),
        experience: {
          apr: '2.5',
          estimatedAnnualRewardsFiatNumber: 50,
        } as EarnTokenDetails['experience'],
      }),
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.DAI,
        ),
        experience: {
          apr: '3.0',
          estimatedAnnualRewardsFiatNumber: 100,
        } as EarnTokenDetails['experience'],
      }),
      createMockEarnToken({
        ...getCreateMockTokenOptions(
          CHAIN_IDS.MAINNET,
          TOKENS_WITH_DEFAULT_OPTIONS.USDC,
        ),
        experience: {
          apr: '1.0',
          estimatedAnnualRewardsFiatNumber: 10,
        } as EarnTokenDetails['experience'],
      }),
    ];

    it('sorts tokens by highest APR', () => {
      const sorted = sortByHighestApr(tokens);

      expect(sorted[0].experience.apr).toBe('3.0');
      expect(sorted[1].experience.apr).toBe('2.5');
      expect(sorted[2].experience.apr).toBe('1.0');
    });

    it('handles tokens with zero APR', () => {
      const tokensWithZero = [
        ...tokens,
        createMockEarnToken({
          ...getCreateMockTokenOptions(
            CHAIN_IDS.MAINNET,
            TOKENS_WITH_DEFAULT_OPTIONS.USDT,
          ),
          experience: {
            apr: '0',
            estimatedAnnualRewardsFiatNumber: 0,
          } as EarnTokenDetails['experience'],
        }),
      ];
      const sorted = sortByHighestApr(tokensWithZero);

      expect(sorted[sorted.length - 1].experience.apr).toBe('0');
    });

    it('returns empty array if input is empty', () => {
      expect(sortByHighestApr([])).toEqual([]);
    });
  });
});
