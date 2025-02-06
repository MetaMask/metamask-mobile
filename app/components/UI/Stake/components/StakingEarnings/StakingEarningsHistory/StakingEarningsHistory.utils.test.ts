import {
  MOCK_STAKED_ETH_MAINNET_ASSET,
  MOCK_USDC_MAINNET_ASSET,
} from '../../../__mocks__/mockData';
import {
  getEntryTimePeriodGroupInfo,
  fillGapsInEarningsHistory,
  formatRewardsWei,
  formatRewardsNumber,
  formatRewardsFiat,
} from './StakingEarningsHistory.utils';
import { DateRange } from './StakingEarningsTimePeriod/StakingEarningsTimePeriod.types';

const mockChartGroupDaily = {
  dateStr: '2023-10-01',
  chartGroup: '2023-10-01',
  chartGroupLabel: 'October 1',
  listGroup: '2023-10-01',
  listGroupLabel: 'October 1',
  listGroupHeader: '',
};

const mockChartGroupMonthly = {
  dateStr: '2023-10-01',
  chartGroup: '2023-10',
  chartGroupLabel: 'October',
  listGroup: '2023-10',
  listGroupLabel: 'October',
  listGroupHeader: '2023',
};

const mockChartGroupYearly = {
  dateStr: '2023-10-01',
  chartGroup: '2023',
  chartGroupLabel: '2023',
  listGroup: '2023',
  listGroupLabel: '2023',
  listGroupHeader: '',
};

describe('StakingEarningsHistory Utils', () => {
  describe('getEntryTimePeriodGroupInfo', () => {
    it('should return correct time period group info for daily', () => {
      const result = getEntryTimePeriodGroupInfo(
        mockChartGroupDaily.dateStr,
        DateRange.DAILY,
      );
      expect(result).toEqual(mockChartGroupDaily);
    });

    it('should return correct time period group info for monthly', () => {
      const result = getEntryTimePeriodGroupInfo(
        mockChartGroupMonthly.dateStr,
        DateRange.MONTHLY,
      );
      expect(result).toEqual(mockChartGroupMonthly);
    });

    it('should return correct time period group info for yearly', () => {
      const result = getEntryTimePeriodGroupInfo(
        mockChartGroupYearly.dateStr,
        DateRange.YEARLY,
      );
      expect(result).toEqual(mockChartGroupYearly);
    });

    it('should throw an error for unsupported time period', () => {
      expect(() =>
        getEntryTimePeriodGroupInfo('2023-10-01', 'unsupported' as DateRange),
      ).toThrow('Unsupported time period');
    });
  });

  describe('fillGapsInEarningsHistory', () => {
    it('should fill gaps in earnings history', () => {
      const earningsHistory = [
        { dateStr: '2023-10-01', dailyRewards: '10', sumRewards: '10' },
        { dateStr: '2023-10-02', dailyRewards: '20', sumRewards: '30' },
      ];
      const result = fillGapsInEarningsHistory(earningsHistory, 5);
      expect(result.length).toBe(5);
      expect(result[0].dateStr).toBe('2023-09-28');
      expect(result[1].dateStr).toBe('2023-09-29');
      expect(result[2].dateStr).toBe('2023-09-30');
    });

    it('should return an empty array if earnings history is null', () => {
      const result = fillGapsInEarningsHistory(null, 5);
      expect(result).toEqual([]);
    });

    it('should return an empty array if earnings history is empty', () => {
      const result = fillGapsInEarningsHistory([], 5);
      expect(result).toEqual([]);
    });
  });

  describe('formatRewardsWei', () => {
    it('should format rewards value with special characters', () => {
      const result = formatRewardsWei('1', MOCK_STAKED_ETH_MAINNET_ASSET);
      expect(result).toBe('< 0.00001');
    });

    it('should format rewards value with special characters when asset.isETH is false', () => {
      const result = formatRewardsWei('1', MOCK_USDC_MAINNET_ASSET);
      expect(result).toBe('< 0.00001');
    });

    it('should format rewards value without special characters', () => {
      const result = formatRewardsWei('1', MOCK_STAKED_ETH_MAINNET_ASSET, true);
      expect(result).toBe('0.000000000000000001');
    });

    it('should format rewards value without special characters when asset.isETH is false', () => {
      const result = formatRewardsWei('1', MOCK_USDC_MAINNET_ASSET, true);
      expect(result).toBe('0.000001');
    });
  });

  describe('formatRewardsNumber', () => {
    it('should format short rewards number correctly', () => {
      const result = formatRewardsNumber(1.456, MOCK_STAKED_ETH_MAINNET_ASSET);
      expect(result).toBe('1.456');
    });

    it('should format long rewards number with 5 decimals', () => {
      const result = formatRewardsNumber(
        1.456234265436536,
        MOCK_STAKED_ETH_MAINNET_ASSET,
      );
      expect(result).toBe('1.45623');
    });
  });

  describe('formatRewardsFiat', () => {
    it('should format rewards to fiat currency', () => {
      const result = formatRewardsFiat(
        '1000000000000000000',
        MOCK_STAKED_ETH_MAINNET_ASSET,
        'usd',
        2000,
        1,
      );
      expect(result).toBe('$2000');
    });

    it('should format rewards to fiat currency when asset.isETH is false', () => {
      const result = formatRewardsFiat(
        '1000000',
        MOCK_USDC_MAINNET_ASSET,
        'usd',
        2000,
        1,
      );
      expect(result).toBe('$2000');
    });
  });
});
