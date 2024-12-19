import { colors } from '@metamask/design-tokens';
import { CHART_BUTTONS } from './InteractiveTimespanChart';
import { GraphOptions } from './InteractiveTimespanChart.types';

const DEFAULT_INSET = 0;

export const DEFAULT_GRAPH_OPTIONS: GraphOptions = {
  insetTop: DEFAULT_INSET,
  insetRight: DEFAULT_INSET,
  insetBottom: DEFAULT_INSET,
  insetLeft: DEFAULT_INSET,
  timespanButtons: CHART_BUTTONS,
  color: colors.light.success.default,
};
