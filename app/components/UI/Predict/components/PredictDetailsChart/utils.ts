import { curveCatmullRom } from 'd3-shape';
import { PredictPriceHistoryInterval } from '../../types';

export const DEFAULT_EMPTY_LABEL = '';
export const LINE_CURVE = curveCatmullRom.alpha(0.2);
export const CHART_HEIGHT = 192;
export const CHART_CONTENT_INSET = {
  top: 8,
  bottom: 4,
  left: 8,
  right: 48,
};
export const MAX_SERIES = 3;
export const MS_IN_SECOND = 1000;
export const DAY_IN_MS = 24 * 60 * 60 * 1000;

const MAX_INTERVAL_SHORT_RANGE_THRESHOLD_IN_MS = 30 * DAY_IN_MS;

export const getTimestampInMs = (timestamp: number): number =>
  timestamp > 1_000_000_000_000 ? timestamp : timestamp * MS_IN_SECOND;

export interface FormatPriceHistoryLabelOptions {
  timeRangeMs?: number;
}

export const formatPriceHistoryLabel = (
  timestamp: number,
  interval: PredictPriceHistoryInterval | string,
  options?: FormatPriceHistoryLabelOptions,
) => {
  const date = new Date(getTimestampInMs(timestamp));
  const timeRangeMs =
    typeof options?.timeRangeMs === 'number' ? options.timeRangeMs : null;

  const shouldUseShortMaxFormat =
    interval === PredictPriceHistoryInterval.MAX &&
    typeof timeRangeMs === 'number' &&
    timeRangeMs > 0 &&
    timeRangeMs < MAX_INTERVAL_SHORT_RANGE_THRESHOLD_IN_MS;

  if (shouldUseShortMaxFormat) {
    if (timeRangeMs !== null && timeRangeMs < DAY_IN_MS) {
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  switch (interval) {
    case PredictPriceHistoryInterval.ONE_HOUR:
    case PredictPriceHistoryInterval.SIX_HOUR:
    case PredictPriceHistoryInterval.ONE_DAY:
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    case PredictPriceHistoryInterval.ONE_WEEK: {
      const weekday = new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
      }).format(date);
      const period = date.getHours() >= 12 ? 'PM' : 'AM';
      return `${weekday} ${period}`;
    }
    case PredictPriceHistoryInterval.ONE_MONTH:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    case PredictPriceHistoryInterval.MAX:
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: '2-digit',
      }).format(date);
  }
};

export const formatTickValue = (value: number, range: number) => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  if (range < 1) {
    return value.toFixed(2);
  }

  if (range < 10) {
    return value.toFixed(1);
  }

  return value.toFixed(0);
};
