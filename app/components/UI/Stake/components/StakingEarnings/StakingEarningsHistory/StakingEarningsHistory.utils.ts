import {
  balanceToFiatNumber,
  renderFromTokenMinimalUnit,
  renderFiat,
  fromTokenMinimalUnit,
  weiToFiatNumber,
  renderFromWei,
  fromWei,
} from '../../../../../../util/number';
import { BN } from 'ethereumjs-util';
import type { TimePeriodGroupInfo } from './StakingEarningsHistory.types';
import { DateRange } from './StakingEarningsTimePeriod/StakingEarningsTimePeriod.types';
import BigNumber from 'bignumber.js';
import type { EarningHistory } from '../../../hooks/useStakingEarningsHistory';
import type { TokenI } from '../../../../Tokens/types';

/**
 * Formats the date string into a time period group info object
 *
 * @param {string} dateStr - The date string YYYY-MM-DD to format.
 * @param {DateRange} selectedTimePeriod - The selected time period.
 * @returns {TimePeriodGroupInfo} The formatted time period group info object.
 */
export const getEntryTimePeriodGroupInfo = (
  dateStr: string,
  selectedTimePeriod: DateRange,
): TimePeriodGroupInfo => {
  const [newYear, newMonth] = dateStr.split('-');
  const date = new Date(dateStr);
  date.setUTCHours(0, 0, 0, 0);
  const timePeriodInfo: TimePeriodGroupInfo = {
    dateStr,
    chartGroup: '',
    chartGroupLabel: '',
    listGroup: '',
    listGroupLabel: '',
    listGroupHeader: '',
  };
  const dayLabel = date.toLocaleString(undefined, {
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const monthLabel = date.toLocaleString(undefined, {
    month: 'long',
    timeZone: 'UTC',
  });
  const yearLabel = date.toLocaleString(undefined, {
    year: 'numeric',
    timeZone: 'UTC',
  });
  switch (selectedTimePeriod) {
    case DateRange.DAILY:
      timePeriodInfo.chartGroup = dateStr;
      timePeriodInfo.chartGroupLabel = dayLabel;
      timePeriodInfo.listGroup = dateStr;
      timePeriodInfo.listGroupLabel = dayLabel;
      break;
    case DateRange.MONTHLY:
      timePeriodInfo.chartGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.chartGroupLabel = monthLabel;
      timePeriodInfo.listGroup = `${newYear}-${newMonth}`;
      timePeriodInfo.listGroupLabel = monthLabel;
      timePeriodInfo.listGroupHeader = newYear;
      break;
    case DateRange.YEARLY:
      timePeriodInfo.chartGroup = newYear;
      timePeriodInfo.chartGroupLabel = yearLabel;
      timePeriodInfo.listGroup = newYear;
      timePeriodInfo.listGroupLabel = yearLabel;
      break;
    default:
      throw new Error('Unsupported time period');
  }
  return timePeriodInfo;
};

/**
 * Fills gaps in earnings history by adding zero values for days missing out of the limitDays
 *
 * @param {EarningHistory[] | null} earningsHistory - The earnings history to fill gaps in.
 * @param {number} limitDays - The number of days to fill gaps for.
 * @returns {EarningHistory[]} The filled earnings history.
 */
export const fillGapsInEarningsHistory = (
  earningsHistory: EarningHistory[] | null,
  limitDays: number,
): EarningHistory[] => {
  if (!earningsHistory?.length) return [];
  const gapFilledEarningsHistory = [...earningsHistory];
  const earliestDate = new Date(earningsHistory[0].dateStr);
  const daysToFill = limitDays - earningsHistory.length;
  const gapDate = new Date(earliestDate);
  gapDate.setUTCHours(0, 0, 0, 0);
  for (let i = 0; i < daysToFill; i++) {
    gapDate.setDate(gapDate.getDate() - 1);
    gapFilledEarningsHistory.unshift({
      dateStr: gapDate.toISOString().split('T')[0],
      dailyRewards: '0',
      sumRewards: '0',
    });
  }
  return gapFilledEarningsHistory;
};

/**
 * Formats the rewards value from minimal unit to string representation
 *
 * @param {number | string | BN} rewardsValue - The rewards value in minimal units.
 * @param {TokenI} asset - The asset to format the rewards value for.
 * @param {boolean} [isRemoveSpecialCharacters=false] - A flag indicating whether to remove special characters from the formatted output.
 * @returns {string} The formatted rewards value as a string.
 */
export const formatRewardsWei = (
  rewardsValue: number | string | BN,
  asset: TokenI,
  isRemoveSpecialCharacters = false,
): string => {
  if (!isRemoveSpecialCharacters) {
    // return a string with possible special characters in display formatting
    return asset.isETH
      ? renderFromWei(rewardsValue.toString())
      : renderFromTokenMinimalUnit(rewardsValue.toString(), asset.decimals);
  }
  // return a string without special characters
  return asset.isETH
    ? fromWei(rewardsValue)
    : fromTokenMinimalUnit(rewardsValue, asset.decimals);
};

/**
 * Formats floating point number rewards value into a string representation
 *
 * @param {number} rewardsValue - The raw rewards value to format.
 * @param {TokenI} asset - The asset to format the rewards value for.
 * @returns {string} The formatted rewards value string.
 */
export const formatRewardsNumber = (
  rewardsValue: number,
  asset: TokenI,
): string => {
  const weiValue = new BN(
    new BigNumber(rewardsValue)
      .multipliedBy(new BigNumber(10).pow(asset.decimals))
      .toString(),
  );
  return formatRewardsWei(weiValue, asset);
};

/**
 * Formats the rewards amount into a fiat currency representation.
 *
 * @param {string | BN} rewardsValue - The amount of rewards to format in minimal units, which can be a string or a BigNumber (BN).
 * @param {TokenI} asset - The asset to format the rewards value for.
 * @param {string} currency - The currency symbol to convert to.
 * @param {number} conversionRate - ETH to current currency conversion rate
 * @param {number} exchangeRate - Asset to ETH conversion rate.
 * @returns {string} The formatted fiat currency string.
 */
export const formatRewardsFiat = (
  rewardsValue: string | BN,
  asset: TokenI,
  currency: string,
  conversionRate: number,
  exchangeRate = 0,
): string => {
  if (asset.isETH) {
    const weiFiatNumber = weiToFiatNumber(
      rewardsValue.toString(),
      conversionRate,
    );
    return renderFiat(weiFiatNumber, currency, 2);
  }
  const balanceFiatNumber = balanceToFiatNumber(
    renderFromTokenMinimalUnit(rewardsValue.toString(), asset.decimals),
    conversionRate,
    exchangeRate,
  );
  return renderFiat(balanceFiatNumber, currency, 2);
};
