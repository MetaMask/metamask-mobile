import { TokenPrice } from 'app/components/hooks/useTokenHistoricalPrices';

// this function is used to sample the data points to be displayed on the chart
// it will return a maximum of 100 data points
// if there are less than 100 data points, it will return all of them
// if there are more than 100 data points, it will return 100 evenly distributed data points
// the first and last data points will always be included
// the data points are distributed evenly across the dataset to ensure similar gaps between points

// this is to ensure that the chart does not become unresponsive when there are too many data points
export function distributeDataPoints(dataPoints: TokenPrice[]): TokenPrice[] {
  const numDataPoints = dataPoints.length;

  if (numDataPoints <= 100) {
    return dataPoints;
  }

  // Calculate the exact interval to evenly distribute 100 points across the dataset
  // We want indices: 0, interval, 2*interval, ..., numDataPoints-1
  // So we need 99 intervals to get 100 points
  const interval = (numDataPoints - 1) / 99;

  const sampledDataPoints: [string, number][] = [];

  for (let i = 0; i < 100; i++) {
    const index = Math.round(i * interval);
    sampledDataPoints.push(dataPoints[index]);
  }

  return sampledDataPoints;
}

// this data draws a placeholder chart to show a greyed out chart when there is no data available
export const placeholderData = [
  3, 5, 6, 8, 7, 5, 7, 9, 10, 12, 14, 15, 14, 12, 11, 10, 9, 10, 8, 7, 5, 6, 5,
  4, 5, 4, 3, 4, 5, 6, 7, 8, 10, 12, 13, 12, 10, 9, 8, 10, 11, 10, 8, 7, 8, 10,
  12, 13, 14, 16, 15, 13, 12, 11, 12, 14, 15, 13, 11, 10, 9, 7, 6, 5, 4, 3, 2,
  3, 4, 5, 6, 5, 7, 8, 10, 11, 13, 14, 16, 15, 14, 12, 10, 9, 11, 12, 10, 8, 7,
  8, 9, 11, 13, 14, 16, 15, 13, 11, 9, 7, 6, 5, 4, 5, 7, 8, 28, 26, 24, 22, 20,
  18, 20, 22, 19, 18, 20, 22, 24, 26, 23, 21, 20, 19, 22, 21, 20, 22, 23, 21,
  19, 18, 16, 14, 12, 14, 13, 15, 16, 18, 20, 22, 24, 22, 21, 20, 18, 16, 15,
  14, 12, 14, 13, 11, 10, 11, 13, 12, 10, 12, 14, 16, 18, 17, 16, 14, 12, 10, 9,
  8, 10, 11, 13, 14, 12, 11, 9, 8, 7, 6, 7, 8, 10, 11, 12, 10, 9, 8, 7, 5, 10,
  11, 12, 10, 12, 13, 14, 15, 17, 19, 21, 22, 24, 23, 26, 27, 29, 27, 32, 28,
  35, 30, 39, 40, 38, 41, 36, 39, 42, 40, 37, 35, 38, 39, 40, 41, 43, 45, 47,
  43, 41, 38, 36, 35, 33, 31, 30, 28, 27, 29, 30,
];
