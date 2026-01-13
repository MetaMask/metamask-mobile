/**
 * Data point for game chart series
 */
export interface GameChartDataPoint {
  timestamp: number;
  value: number;
}

/**
 * Series configuration for game chart
 */
export interface GameChartSeries {
  label: string;
  color: string;
  data: GameChartDataPoint[];
}

/**
 * Available chart timeframes
 */
export type ChartTimeframe = 'live' | '6h' | '1d' | 'max';

/**
 * Props for PredictGameChart component
 */
export interface PredictGameChartProps {
  /** Array of chart series (max 2 for away/home teams) */
  data: GameChartSeries[];
  /** Whether chart data is loading */
  isLoading?: boolean;
  /** Currently selected timeframe */
  timeframe?: ChartTimeframe;
  /** Callback when timeframe changes */
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  /** Test ID for component */
  testID?: string;
}

/**
 * Props for TimeframeSelector sub-component
 */
export interface TimeframeSelectorProps {
  /** Currently selected timeframe */
  selected: ChartTimeframe;
  /** Callback when timeframe is selected */
  onSelect: (timeframe: ChartTimeframe) => void;
  /** Whether selector is disabled */
  disabled?: boolean;
}

/**
 * Props for ChartTooltip sub-component
 * Note: x and y functions are injected by react-native-svg-charts
 */
export interface ChartTooltipProps {
  /** X coordinate function (injected by chart) */
  x?: (index: number) => number;
  /** Y coordinate function (injected by chart) */
  y?: (value: number) => number;
  /** Currently active data index from touch */
  activeIndex: number;
  /** Primary series data with labels */
  primaryData: GameChartDataPoint[];
  /** All non-empty series */
  nonEmptySeries: GameChartSeries[];
  /** Chart width for label positioning */
  chartWidth: number;
  /** Content inset for positioning */
  contentInset: { top: number; bottom: number; left: number; right: number };
}

/**
 * Props for EndpointDots sub-component
 * Note: x and y functions are injected by react-native-svg-charts
 */
export interface EndpointDotsProps {
  /** X coordinate function (injected by chart) */
  x?: (index: number) => number;
  /** Y coordinate function (injected by chart) */
  y?: (value: number) => number;
  /** All non-empty series to render endpoints for */
  nonEmptySeries: GameChartSeries[];
}
