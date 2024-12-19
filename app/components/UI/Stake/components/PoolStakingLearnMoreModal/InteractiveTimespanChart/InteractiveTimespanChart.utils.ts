import { VaultAprs } from '@metamask/stake-sdk';
import BigNumber from 'bignumber.js';
import { strings } from '../../../../../../../locales/i18n';

export const calculateSegmentCenters = (
  dataPoints: number[] | string[],
  segmentWidth: number,
) =>
  dataPoints.map((_, index) => {
    /**
     * Ex. If each segment is 30px wide:
     * The start position of first segment (index: 0) = 0 * segmentWidth OR 0 * 30px = 0
     * The center position of the first segment (index: 0) = startPosition + segmentWidth / 2 OR 0 + 30 / 2 = 15
     */
    const startOfSegment = index * segmentWidth;
    const centerOfSegment = startOfSegment + segmentWidth / 2;
    return centerOfSegment;
  });

export const formatChartDate = (timestamp: string) =>
  new Date(timestamp).toUTCString().split(' ').slice(0, 4).join(' ');

// Example: Sun, 01 Dec 2024
export const formatDailyAprReward = (reward: {
  daily_apy: string;
  timestamp: string;
}) => ({
  apr: `${new BigNumber(reward.daily_apy).toFixed(2, BigNumber.ROUND_DOWN)}%`,
  timestamp: new Date(reward.timestamp)
    .toUTCString()
    .split(' ')
    .slice(0, 4)
    .join(' '),
});

export const getGraphContentInset = (dataPoints: number[]) => {
  let inset = 0;

  if (dataPoints.length <= 10) inset = 20;

  if (dataPoints.length >= 30) inset = 15;

  if (dataPoints.length >= 90) inset = 10;

  if (dataPoints.length >= 180) inset = 5;

  return inset;
};

export const parseVaultTimespanAprsResponse = (
  vaultTimespanAprs: VaultAprs,
) => {
  const numDaysMap: Record<
    keyof VaultAprs,
    { numDays: number; label: string }
  > = {
    oneDay: { numDays: 1, label: strings('stake.today') },
    oneWeek: { numDays: 7, label: strings('stake.one_week_average') },
    oneMonth: { numDays: 30, label: strings('stake.one_month_average') },
    threeMonths: { numDays: 90, label: strings('stake.three_month_average') },
    sixMonths: { numDays: 180, label: strings('stake.six_month_average') },
    oneYear: { numDays: 365, label: strings('stake.one_year_average') },
  };

  return Object.entries(vaultTimespanAprs).reduce<
    Record<number, { apr: string; numDays: number; label: string }>
  >((map, [key, value]) => {
    const numDaysMapEntry = numDaysMap[key as keyof typeof numDaysMap];
    map[numDaysMapEntry.numDays] = { apr: value, ...numDaysMapEntry };
    return map;
  }, {});
};
