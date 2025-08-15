import { PERPS_CHART_CONFIG } from '../../../constants/chartConfig';

/**
 * Represents transformed chart data structure
 */
export interface ChartDataPoint {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Helper function to format price for y-axis labels
 * Rounds to whole number and adds commas for thousands
 */
export const formatPriceForAxis = (price: number): string =>
  Math.round(price).toLocaleString('en-US');

/**
 * Month names for date formatting
 */
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/**
 * Format timestamp for X-axis display
 * Returns time and date on separate lines: "14:30\nNov 23"
 */
export const formatTimeForXAxis = (timestamp: number): string => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const month = MONTH_NAMES[date.getMonth()];
  const day = date.getDate();

  return `${hours}:${minutes}\n${month} ${day}`;
};

/**
 * Generate evenly spaced time intervals for X-axis labels
 */
export const generateTimeIntervals = (
  chartData: ChartDataPoint[],
  chartWidth: number,
  labelCount: number = 5,
): { time: number; position: number; index: number }[] => {
  if (chartData.length === 0) return [];

  const intervals = [];
  const dataLength = chartData.length;
  const chartWidthForLabels = chartWidth - 65; // Account for y-axis space

  for (let i = 0; i < labelCount; i++) {
    // Handle single label case to avoid division by zero
    const dataIndex =
      labelCount === 1
        ? 0
        : Math.floor((i / (labelCount - 1)) * (dataLength - 1));
    const time = chartData[dataIndex].timestamp;
    const position =
      labelCount === 1 ? 0 : (i / (labelCount - 1)) * chartWidthForLabels;
    intervals.push({ time, position, index: i });
  }

  return intervals;
};

/**
 * Helper function to get grid line style
 * Creates consistent styling for grid lines with proper positioning
 */
export const getGridLineStyle = (
  colors: { border: { muted: string } },
  isEdge: boolean,
  position: number,
  chartWidth?: number,
) => ({
  position: 'absolute' as const,
  left: 0,
  right: chartWidth ? undefined : 0,
  width: chartWidth ? chartWidth - 65 : undefined,
  top: position,
  height: isEdge ? 2 : 1,
  zIndex: 10,
  backgroundColor: colors.border.muted,
  opacity: isEdge
    ? PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MAJOR
    : PERPS_CHART_CONFIG.GRID_LINE_OPACITY.MINOR,
});

/**
 * Extract all prices from chart data for min/max calculations
 */
export const extractPricesFromChartData = (data: ChartDataPoint[]): number[] =>
  data.flatMap((d) => [d.open, d.high, d.low, d.close]);

/**
 * Calculate price range from chart data
 */
export const getPriceRange = (data: ChartDataPoint[]) => {
  const prices = extractPricesFromChartData(data);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  return { minPrice, maxPrice, priceRange };
};

/**
 * Calculate position for a price within the chart bounds
 * Used for positioning auxiliary lines and grid lines
 */
export const calculatePricePosition = (
  price: number,
  minPrice: number,
  maxPrice: number,
  height: number,
  options?: {
    /** Apply vertical padding adjustment */
    withPadding?: boolean;
    /** Fine-tune positioning (default: 1) */
    positionMultiplier?: number;
  },
): number => {
  const priceRange = maxPrice - minPrice;
  if (priceRange === 0) return 0;

  const { withPadding = false, positionMultiplier = 1 } = options || {};
  const chartHeight = withPadding
    ? height - PERPS_CHART_CONFIG.PADDING.VERTICAL
    : height;
  const normalizedPosition = (price - minPrice) / priceRange;

  return chartHeight * (positionMultiplier - normalizedPosition);
};
