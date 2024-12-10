import BigNumber from 'bignumber.js';

export const calculateSegmentCenters = (
  dataPoints: number[],
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
