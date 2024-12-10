import { ChartButton } from './ChartTimespanButtonGroup/ChartTimespanButtonGroup.types';

// Small dataset ~10 points or less
export const SMALL_DATASET_THRESHOLD = 10;
export const SMALL_DATASET_PADDING = 16;
// Large dataset ~90 points and more
export const SMALL_DATASET_SNAP_RATIO = 0.5;

export const CHART_BUTTONS: ChartButton[] = [
  { label: '7D', value: 7 },
  { label: '1M', value: 30 },
  { label: '3M', value: 90 },
  { label: '6M', value: 180 },
  // We don't have enough data points for 1 year yet
  // { label: '12M', value: 360 },
];
