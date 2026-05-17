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
