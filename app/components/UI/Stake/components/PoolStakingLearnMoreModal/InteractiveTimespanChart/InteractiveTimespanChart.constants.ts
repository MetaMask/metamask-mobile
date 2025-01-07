import { colors } from '@metamask/design-tokens';
import { GraphOptions } from './InteractiveTimespanChart.types';
import { ChartButton } from './ChartTimespanButtonGroup/ChartTimespanButtonGroup.types';
import { strings } from '../../../../../../../locales/i18n';

// Small dataset ~10 points or less
export const SMALL_DATASET_THRESHOLD = 10;
export const SMALL_DATASET_PADDING = 16;
// Large dataset ~90 points and more
export const SMALL_DATASET_SNAP_RATIO = 0.5;

export const CHART_BUTTONS: ChartButton[] = [
  { label: strings('stake.interactive_chart.timespan_buttons.7D'), value: 7 },
  { label: strings('stake.interactive_chart.timespan_buttons.1M'), value: 30 },
  { label: strings('stake.interactive_chart.timespan_buttons.3M'), value: 90 },
  { label: strings('stake.interactive_chart.timespan_buttons.6M'), value: 180 },
];

export enum CHART_TIMESPAN_VALUES {
  ONE_WEEK = 7,
  ONE_MONTH = 30,
  THREE_MONTHS = 90,
  SIX_MONTHS = 180,
}

const DEFAULT_INSET = 0;

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = {
  insetTop: DEFAULT_INSET,
  insetRight: DEFAULT_INSET,
  insetBottom: DEFAULT_INSET,
  insetLeft: DEFAULT_INSET,
  timespanButtons: CHART_BUTTONS,
  color: colors.light.success.default,
};
