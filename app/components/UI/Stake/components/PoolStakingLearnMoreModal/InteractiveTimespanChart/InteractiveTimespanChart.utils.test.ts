import {
  SMALL_DATASET_GRAPH_INSET,
  STANDARD_DATASET_GRAPH_INSET,
} from './InteractiveTimespanChart.constants';
import {
  getChartSegmentWidth,
  calculateSegmentCenters,
  formatChartDate,
  getGraphInsetsByDataPointLength,
  findClosestPointIndex,
  calculateSnapThreshold,
} from './InteractiveTimespanChart.utils';

const CHART_WIDTH = 100;

describe('InteractiveTimespanChart Utils', () => {
  describe('calculateSegmentCenter', () => {
    it('calculates center of each segment', () => {
      const MOCK_DATAPOINTS_1 = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

      const chartSegmentWidth1 = getChartSegmentWidth(
        CHART_WIDTH,
        MOCK_DATAPOINTS_1,
      );

      const result1 = calculateSegmentCenters(
        MOCK_DATAPOINTS_1,
        chartSegmentWidth1,
      );

      expect(result1).toEqual([5, 15, 25, 35, 45, 55, 65, 75, 85, 95]);

      const MOCK_DATAPOINTS_2 = [
        Number.MIN_VALUE,
        1.75,
        3.1,
        0,
        7.453,
        100,
        100000,
        2.5,
        75648293.123,
        1000000.230021,
        60.0,
        2.0001,
        99.99999,
        Number.MAX_VALUE,
      ];
      const chartSegmentWidth2 = getChartSegmentWidth(
        CHART_WIDTH,
        MOCK_DATAPOINTS_2,
      );

      const result2 = calculateSegmentCenters(
        MOCK_DATAPOINTS_2,
        chartSegmentWidth2,
      );

      expect(result2).toEqual([
        3.5714285, 10.7142855, 17.857142500000002, 24.9999995, 32.1428565,
        39.28571350000001, 46.428570500000006, 53.571427500000006,
        60.714284500000005, 67.8571415, 74.9999985, 82.1428555, 89.2857125,
        96.4285695,
      ]);
    });

    it('safely handles empty array', () => {
      const segmentWidth = getChartSegmentWidth(CHART_WIDTH, []);
      const result = calculateSegmentCenters([], segmentWidth);

      expect(result).toEqual([]);
    });
  });

  describe('formatChartDate', () => {
    it('formats chart date', () => {
      const iso8601Timestamp = '2024-11-30T00:00:00.000Z';

      const result = formatChartDate(iso8601Timestamp.toString());

      expect(result).toEqual('Sat, 30 Nov 2024');
    });

    it('handles invalid timestamp argument format', () => {
      const timestampInMs = 1736531527123;

      const result = formatChartDate(timestampInMs.toString());

      expect(result).toEqual('Invalid Date');
    });
  });

  describe('getGraphInsetsByDataPointLength', () => {
    it('calculates standard dataset graph inset', () => {
      const result = getGraphInsetsByDataPointLength(100);

      expect(result).toEqual({
        insetTop: STANDARD_DATASET_GRAPH_INSET,
        insetBottom: STANDARD_DATASET_GRAPH_INSET,
      });
    });

    it('calculates small dataset graph insets', () => {
      const result = getGraphInsetsByDataPointLength(0);

      expect(result).toEqual({
        insetTop: SMALL_DATASET_GRAPH_INSET,
        insetBottom: SMALL_DATASET_GRAPH_INSET,
      });
    });
  });

  describe('calculateSnapThreshold', () => {
    it('calculates the snap threshold for a small dataset (10 or less points)', () => {
      const dataPoints = [1, 2, 3, 4, 5];
      const segmentWidth = getChartSegmentWidth(CHART_WIDTH, dataPoints);

      const result = calculateSnapThreshold(segmentWidth, dataPoints.length);

      expect(result).toEqual(10);
    });

    it('outputs a snap threshold of 0 for standard sized datasets (more than 10 points)', () => {
      const dataPoints = [
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ];
      const segmentWidth = getChartSegmentWidth(CHART_WIDTH, dataPoints);

      const result = calculateSnapThreshold(segmentWidth, dataPoints.length);

      expect(result).toEqual(0);
    });
  });

  describe('findClosestPointIndex', () => {
    const dataPoints = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const segmentWidth = getChartSegmentWidth(CHART_WIDTH, dataPoints);
    const snapThreshold = calculateSnapThreshold(
      segmentWidth,
      dataPoints.length,
    );
    const segmentCenters = calculateSegmentCenters(dataPoints, segmentWidth);

    it('calculates closes point index for given x coordinate', () => {
      const xCoordinate = 25;

      const result = findClosestPointIndex(
        xCoordinate,
        segmentCenters,
        snapThreshold,
        dataPoints.length,
      );

      expect(result).toEqual(2);
    });

    it('return -1 when x coordinate is outside the bounds of the graph', () => {
      const xCoordinate = 1000;

      const result = findClosestPointIndex(
        xCoordinate,
        segmentCenters,
        snapThreshold,
        dataPoints.length,
      );

      expect(result).toEqual(-1);
    });

    // x coordinate value "-1" is what we use to convey a raised finger.
    // When we receive x coordinate "-1" we simply passthrough.
    it('allows -1  coordinate passthrough', () => {
      const xCoordinate = -1;

      const result = findClosestPointIndex(
        xCoordinate,
        segmentCenters,
        snapThreshold,
        dataPoints.length,
      );

      expect(result).toEqual(-1);
    });
  });
});
