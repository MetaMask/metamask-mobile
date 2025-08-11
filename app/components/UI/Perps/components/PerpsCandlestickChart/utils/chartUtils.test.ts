import {
  formatPriceForAxis,
  formatTimeForXAxis,
  generateTimeIntervals,
  getGridLineStyle,
  extractPricesFromChartData,
  getPriceRange,
  calculatePricePosition,
  ChartDataPoint,
} from './chartUtils';
import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';

const mockChartData: ChartDataPoint[] = [
  {
    timestamp: 1640995200000,
    open: 44000,
    high: 45000,
    low: 43500,
    close: 44500,
  },
  {
    timestamp: 1640998800000,
    open: 44500,
    high: 46000,
    low: 44000,
    close: 45500,
  },
  {
    timestamp: 1641002400000,
    open: 45500,
    high: 47000,
    low: 45000,
    close: 46000,
  },
];

const mockColors = {
  border: {
    muted: '#666666',
  },
};

describe('chartUtils', () => {
  describe('formatPriceForAxis', () => {
    it('formats whole numbers with commas', () => {
      expect(formatPriceForAxis(45000)).toBe('45,000');
      expect(formatPriceForAxis(1234567)).toBe('1,234,567');
    });

    it('rounds decimal numbers to whole numbers', () => {
      expect(formatPriceForAxis(45000.7)).toBe('45,001');
      expect(formatPriceForAxis(45000.3)).toBe('45,000');
    });

    it('handles small numbers', () => {
      expect(formatPriceForAxis(123)).toBe('123');
      expect(formatPriceForAxis(0)).toBe('0');
    });
  });

  describe('formatTimeForXAxis', () => {
    it('formats timestamp with time and date', () => {
      // 2022-01-01 14:30:00 UTC
      const timestamp = 1641047400000;
      const result = formatTimeForXAxis(timestamp);

      // Should contain time format (may vary by timezone)
      expect(result).toMatch(
        /\d{2}:\d{2}\n(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}/,
      );
    });

    it('formats midnight correctly', () => {
      // 2022-01-01 00:00:00 UTC
      const timestamp = 1640995200000;
      const result = formatTimeForXAxis(timestamp);

      expect(result).toMatch(
        /\d{2}:\d{2}\n(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}/,
      );
    });

    it('pads single digit minutes and hours', () => {
      // 2022-01-01 09:05:00 UTC
      const timestamp = 1641028500000;
      const result = formatTimeForXAxis(timestamp);

      // Should have padded format (exact time may vary by timezone)
      expect(result).toMatch(
        /\d{2}:\d{2}\n(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s\d{1,2}/,
      );
    });
  });

  describe('generateTimeIntervals', () => {
    const chartWidth = 350;

    it('generates default number of intervals (5)', () => {
      const intervals = generateTimeIntervals(mockChartData, chartWidth);

      expect(intervals).toHaveLength(5);
      expect(intervals[0]).toEqual({
        time: mockChartData[0].timestamp,
        position: 0,
        index: 0,
      });
    });

    it('generates custom number of intervals', () => {
      const intervals = generateTimeIntervals(mockChartData, chartWidth, 3);

      expect(intervals).toHaveLength(3);
      expect(intervals[0].index).toBe(0);
      expect(intervals[1].index).toBe(1);
      expect(intervals[2].index).toBe(2);
    });

    it('calculates positions correctly across chart width', () => {
      const intervals = generateTimeIntervals(mockChartData, chartWidth, 3);
      const expectedWidth = chartWidth - 65; // Account for y-axis space

      expect(intervals[0].position).toBe(0);
      expect(intervals[1].position).toBe(expectedWidth / 2);
      expect(intervals[2].position).toBe(expectedWidth);
    });

    it('maps to correct data indices', () => {
      const intervals = generateTimeIntervals(mockChartData, chartWidth, 3);

      // Should map to first, middle, and last data points
      expect(intervals[0].time).toBe(mockChartData[0].timestamp);
      expect(intervals[2].time).toBe(
        mockChartData[mockChartData.length - 1].timestamp,
      );
    });

    it('handles single label count', () => {
      const intervals = generateTimeIntervals(mockChartData, chartWidth, 1);

      expect(intervals).toHaveLength(1);
      expect(intervals[0].time).toBe(mockChartData[0].timestamp);
      expect(intervals[0].position).toBe(0);
      expect(intervals[0].index).toBe(0);
    });

    it('handles single data point', () => {
      const singlePoint = [mockChartData[0]];
      const intervals = generateTimeIntervals(singlePoint, chartWidth, 3);

      expect(intervals).toHaveLength(3);
      // All intervals should point to the same data point
      intervals.forEach((interval) => {
        expect(interval.time).toBe(singlePoint[0].timestamp);
      });
    });

    it('handles empty data', () => {
      const intervals = generateTimeIntervals([], chartWidth, 5);

      expect(intervals).toEqual([]);
    });

    it('adjusts for different chart widths', () => {
      const narrowWidth = 200;
      const wideWidth = 800;

      const narrowIntervals = generateTimeIntervals(
        mockChartData,
        narrowWidth,
        3,
      );
      const wideIntervals = generateTimeIntervals(mockChartData, wideWidth, 3);

      // Positions should scale with chart width
      expect(narrowIntervals[2].position).toBeLessThan(
        wideIntervals[2].position,
      );
    });
  });

  describe('getGridLineStyle', () => {
    it('returns correct style for edge lines', () => {
      const style = getGridLineStyle(mockColors, true, 100);

      expect(style).toEqual({
        position: 'absolute',
        left: 0,
        right: 0,
        top: 100,
        height: 2,
        zIndex: 10,
        backgroundColor: '#666666',
        opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR,
      });
    });

    it('returns correct style for non-edge lines', () => {
      const style = getGridLineStyle(mockColors, false, 50);

      expect(style).toEqual({
        position: 'absolute',
        left: 0,
        right: 0,
        top: 50,
        height: 1,
        zIndex: 10,
        backgroundColor: '#666666',
        opacity: PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
      });
    });
  });

  describe('extractPricesFromChartData', () => {
    it('extracts all prices from chart data', () => {
      const prices = extractPricesFromChartData(mockChartData);

      expect(prices).toEqual([
        44000,
        45000,
        43500,
        44500, // First candle
        44500,
        46000,
        44000,
        45500, // Second candle
        45500,
        47000,
        45000,
        46000, // Third candle
      ]);
    });

    it('handles empty data', () => {
      const prices = extractPricesFromChartData([]);
      expect(prices).toEqual([]);
    });
  });

  describe('getPriceRange', () => {
    it('calculates correct price range', () => {
      const { minPrice, maxPrice, priceRange } = getPriceRange(mockChartData);

      expect(minPrice).toBe(43500); // Lowest low
      expect(maxPrice).toBe(47000); // Highest high
      expect(priceRange).toBe(3500); // 47000 - 43500
    });

    it('handles single data point', () => {
      const singlePoint = [mockChartData[0]];
      const { minPrice, maxPrice, priceRange } = getPriceRange(singlePoint);

      expect(minPrice).toBe(43500);
      expect(maxPrice).toBe(45000);
      expect(priceRange).toBe(1500);
    });

    it('handles flat prices', () => {
      const flatData: ChartDataPoint[] = [
        {
          timestamp: 1640995200000,
          open: 45000,
          high: 45000,
          low: 45000,
          close: 45000,
        },
      ];
      const { minPrice, maxPrice, priceRange } = getPriceRange(flatData);

      expect(minPrice).toBe(45000);
      expect(maxPrice).toBe(45000);
      expect(priceRange).toBe(0);
    });
  });

  describe('calculatePricePosition', () => {
    const minPrice = 43500;
    const maxPrice = 47000;
    const height = 300;

    it('calculates position for price in middle of range', () => {
      const midPrice = 45250; // Middle of 43500-47000
      const position = calculatePricePosition(
        midPrice,
        minPrice,
        maxPrice,
        height,
      );

      expect(position).toBe(150); // Middle of 300px height
    });

    it('calculates position for minimum price', () => {
      const position = calculatePricePosition(
        minPrice,
        minPrice,
        maxPrice,
        height,
      );

      expect(position).toBe(300); // Bottom of chart
    });

    it('calculates position for maximum price', () => {
      const position = calculatePricePosition(
        maxPrice,
        minPrice,
        maxPrice,
        height,
      );

      expect(position).toBe(0); // Top of chart
    });

    it('applies padding when withPadding option is true', () => {
      const midPrice = 45250;
      const position = calculatePricePosition(
        midPrice,
        minPrice,
        maxPrice,
        height,
        {
          withPadding: true,
        },
      );

      const expectedHeight = height - PERPS_CHART_CONFIG.PADDING.VERTICAL;
      expect(position).toBe(expectedHeight / 2);
    });

    it('applies position multiplier', () => {
      const midPrice = 45250;
      const position = calculatePricePosition(
        midPrice,
        minPrice,
        maxPrice,
        height,
        {
          positionMultiplier: 0.98,
        },
      );

      // With multiplier 0.98, the middle should be slightly lower
      expect(position).toBe(144); // 300 * (0.98 - 0.5) = 300 * 0.48
    });

    it('handles zero price range', () => {
      const position = calculatePricePosition(45000, 45000, 45000, height);

      expect(position).toBe(0);
    });
  });
});
