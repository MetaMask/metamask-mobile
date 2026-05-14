import { useEffect, useMemo, useState } from 'react';
import type { GetSeriesParams, PredictSeries } from '../types';
import {
  getCurrentSeriesWindowMs,
  getSeriesDurationMs,
  getSeriesMarketWindow,
  resolvePredictMarketFromSeries,
} from '../utils/series';
import { usePredictSeries } from './usePredictSeries';

const DISABLED_SERIES_PARAMS: GetSeriesParams = {
  seriesId: '',
  endDateMin: new Date(0).toISOString(),
  endDateMax: new Date(0).toISOString(),
};

export interface UseCurrentPredictMarketFromSeriesParams {
  series?: PredictSeries;
  seriesId?: string;
  seriesRecurrence?: string;
  enabled?: boolean;
}

export const useCurrentPredictMarketFromSeries = ({
  series,
  seriesId,
  seriesRecurrence,
  enabled = true,
}: UseCurrentPredictMarketFromSeriesParams) => {
  const resolvedSeriesId = series?.id ?? seriesId;
  const durationMs = useMemo(
    () => getSeriesDurationMs(series?.recurrence ?? seriesRecurrence),
    [series?.recurrence, seriesRecurrence],
  );
  const [windowMs, setWindowMs] = useState(() =>
    getCurrentSeriesWindowMs(durationMs),
  );

  useEffect(() => {
    setWindowMs(getCurrentSeriesWindowMs(durationMs));
  }, [durationMs]);

  useEffect(() => {
    if (!enabled || !resolvedSeriesId) {
      return undefined;
    }

    const interval = setInterval(() => {
      const nextWindowMs = getCurrentSeriesWindowMs(durationMs);
      setWindowMs((currentWindowMs) =>
        currentWindowMs === nextWindowMs ? currentWindowMs : nextWindowMs,
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [durationMs, enabled, resolvedSeriesId]);

  const seriesQueryParams = useMemo<GetSeriesParams>(() => {
    if (!resolvedSeriesId) {
      return DISABLED_SERIES_PARAMS;
    }

    return {
      seriesId: resolvedSeriesId,
      ...getSeriesMarketWindow({ anchorMs: windowMs, durationMs }),
    };
  }, [durationMs, resolvedSeriesId, windowMs]);

  const query = usePredictSeries(seriesQueryParams, {
    enabled: enabled && Boolean(resolvedSeriesId),
  });

  const market = useMemo(
    () => resolvePredictMarketFromSeries(query.data, series),
    [query.data, series],
  );

  return {
    ...query,
    durationMs,
    market,
    marketId: market?.id,
    seriesQueryParams,
  };
};
