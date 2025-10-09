import { curveCatmullRom } from 'd3-shape';
import { PredictPriceHistoryInterval } from '../../types';

export const DEFAULT_EMPTY_LABEL = '';
export const LINE_CURVE = curveCatmullRom.alpha(0.3);
export const CHART_HEIGHT = 192;
export const CHART_CONTENT_INSET = {
  top: 20,
  bottom: 20,
  left: 20,
  right: 32,
};
export const MAX_SERIES = 3;

export const formatPriceHistoryLabel = (
  timestamp: number,
  interval: PredictPriceHistoryInterval | string,
) => {
  const isMilliseconds = timestamp > 1_000_000_000_000;
  const date = new Date(isMilliseconds ? timestamp : timestamp * 1000);

  switch (interval) {
    case PredictPriceHistoryInterval.ONE_HOUR:
    case PredictPriceHistoryInterval.SIX_HOUR:
    case PredictPriceHistoryInterval.ONE_DAY:
      return new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    case PredictPriceHistoryInterval.ONE_WEEK:
      return new Intl.DateTimeFormat('en-US', {
        weekday: 'short',
        hour: 'numeric',
      }).format(date);
    case PredictPriceHistoryInterval.ONE_MONTH:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
      }).format(date);
    case PredictPriceHistoryInterval.MAX:
    default:
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        year: 'numeric',
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
