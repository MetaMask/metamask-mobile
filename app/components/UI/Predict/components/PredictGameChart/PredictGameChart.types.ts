import { PredictMarket } from '../../types';

export interface GameChartDataPoint {
  timestamp: number;
  value: number;
}

export interface GameChartSeries {
  label: string;
  color: string;
  data: GameChartDataPoint[];
}

export type ChartTimeframe = 'live' | '1h' | '6h' | '1d' | 'max';

export interface GameChartSeriesConfig {
  label: string;
  color: string;
}

export interface PredictGameChartContentProps {
  data: GameChartSeries[];
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  timeframe?: ChartTimeframe;
  onTimeframeChange?: (timeframe: ChartTimeframe) => void;
  disabledTimeframeSelector?: boolean;
  testID?: string;
}

export interface PredictGameChartProps {
  market: PredictMarket;
  providerId?: string;
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
  /** Length of the primary data array - used to position all dots at the right edge */
  primaryDataLength: number;
}
