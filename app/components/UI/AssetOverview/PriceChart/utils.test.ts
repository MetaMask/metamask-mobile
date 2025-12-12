import { distributeDataPoints } from './utils';

describe('distributeDataPoints', () => {
  it('returns all data points when there are exactly 100 points', () => {
    const dataPoints = createDataPoints(100);

    const result = distributeDataPoints(dataPoints);

    expect(result).toEqual(dataPoints);
    expect(result.length).toBe(100);
  });

  it('returns all data points when there are fewer than 100 points', () => {
    const dataPoints = createDataPoints(50);

    const result = distributeDataPoints(dataPoints);

    expect(result).toEqual(dataPoints);
    expect(result.length).toBe(50);
  });

  it('returns exactly 100 points when there are more than 100 points', () => {
    const dataPoints = createDataPoints(200);

    const result = distributeDataPoints(dataPoints);

    expect(result.length).toBe(100);
  });

  it('includes the first and last data points', () => {
    const dataPoints = createDataPoints(200);

    const result = distributeDataPoints(dataPoints);

    expect(result[0]).toEqual(dataPoints[0]);
    expect(result[99]).toEqual(dataPoints[199]);
  });

  it('maintains chronological order of data points', () => {
    const dataPoints = createDataPoints(500);

    const result = distributeDataPoints(dataPoints);

    for (let i = 1; i < result.length; i++) {
      const prevTimestamp = parseInt(result[i - 1][0], 10);
      const currTimestamp = parseInt(result[i][0], 10);
      expect(currTimestamp).toBeGreaterThanOrEqual(prevTimestamp);
    }
  });

  it('distributes points evenly across the dataset', () => {
    const dataPoints = createDataPoints(200, Date.now(), 0);

    const result = distributeDataPoints(dataPoints);

    // Expected interval: (200 - 1) / 99 ≈ 2.01
    // So we should get indices approximately: 0, 2, 4, 6, ..., 197, 199
    expect(result[0][1]).toBe(0);
    expect(result[1][1]).toBe(2);
    expect(result[2][1]).toBe(4);
    expect(result[98][1]).toBe(197);
    expect(result[99][1]).toBe(199);
  });

  it('does not duplicate points', () => {
    const dataPoints = createDataPoints(300, Date.now(), 0);

    const result = distributeDataPoints(dataPoints);

    // Check for duplicates by comparing timestamps
    const timestamps = result.map((point) => point[0]);
    const uniqueTimestamps = new Set(timestamps);
    expect(uniqueTimestamps.size).toBe(result.length);
  });

  it('handles empty array', () => {
    const dataPoints: [string, number][] = [];

    const result = distributeDataPoints(dataPoints);

    expect(result).toEqual([]);
    expect(result.length).toBe(0);
  });

  it('ensures gaps between points are relatively uniform', () => {
    const dataPoints = createDataPoints(500, Date.now(), 0);

    const result = distributeDataPoints(dataPoints);

    // Calculate the value differences between consecutive points
    const gaps: number[] = [];
    for (let i = 1; i < result.length; i++) {
      gaps.push(result[i][1] - result[i - 1][1]);
    }

    // Expected interval: (500 - 1) / 99 ≈ 5.04
    // All gaps should be either 5 or 6 due to rounding
    const minGap = Math.min(...gaps);
    const maxGap = Math.max(...gaps);
    expect(maxGap - minGap).toBeLessThanOrEqual(1);
  });
});

function createDataPoints(
  length: number,
  baseTime: number = Date.now(),
  basePrice: number = 3000,
): [string, number][] {
  return Array.from({ length }, (_, i) => [
    createTimestamp(baseTime, i),
    basePrice + i,
  ]);
}

function createTimestamp(baseTime: number, offsetMinutes: number): string {
  return (baseTime + offsetMinutes * 60 * 1000).toString();
}
