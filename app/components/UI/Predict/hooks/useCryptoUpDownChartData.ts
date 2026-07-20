import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { useLiveCryptoPrices } from './useLiveCryptoPrices';
import {
  getCryptoSymbol,
  getVariant,
  getEventStartTime,
  RECURRENCE_TO_DURATION_SECS,
  toTimestampSeconds,
} from '../utils/cryptoUpDown';
import type { PredictMarket, PredictSeries, CryptoPriceUpdate } from '../types';
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';

const EMPTY_DATA: LivelinePoint[] = [];
const LIVE_CHART_WINDOW_SECS = 30;
const LIVE_CHART_RETENTION_SECS = LIVE_CHART_WINDOW_SECS * 2;
const LIVE_CHART_MAX_POINTS = LIVE_CHART_RETENTION_SECS * 60;
const CURRENT_TIMESTAMP_TOLERANCE_SECS = 5;
const MIN_LIVE_POINT_DELTA_SECS = 0.001;
const LIVE_STREAM_STALE_TIMEOUT_MS = LIVE_CHART_WINDOW_SECS * 1000;
const CONNECTION_ERROR_TIMEOUT_MS = 12000;

// Circuit breaker for the historical-candle poll. When the endpoint is
// unreachable we don't want to keep hammering it every 10s indefinitely, so the
// interval backs off as consecutive failures accumulate and eventually stops.
// React Query resets `fetchFailureCount` to 0 on the first successful fetch,
// which automatically restores the normal cadence once the endpoint recovers.
const POLL_INTERVAL_MS = 10000;
const POLL_BACKOFF_30S_MS = 30000;
const POLL_BACKOFF_60S_MS = 60000;
const POLL_BACKOFF_30S_THRESHOLD = 3; // 3rd consecutive failure -> 30s
const POLL_BACKOFF_60S_THRESHOLD = 5; // 5th consecutive failure -> 60s
const POLL_DISABLE_THRESHOLD = 7; // 7th consecutive failure -> stop polling

export const getHistoricalPollInterval = (
  fetchFailureCount: number,
): number | false => {
  if (fetchFailureCount >= POLL_DISABLE_THRESHOLD) {
    return false;
  }
  if (fetchFailureCount >= POLL_BACKOFF_60S_THRESHOLD) {
    return POLL_BACKOFF_60S_MS;
  }
  if (fetchFailureCount >= POLL_BACKOFF_30S_THRESHOLD) {
    return POLL_BACKOFF_30S_MS;
  }
  return POLL_INTERVAL_MS;
};

const mergeLivelinePoints = (
  historicalData: LivelinePoint[],
  liveData: LivelinePoint[],
): LivelinePoint[] => {
  if (historicalData.length === 0) {
    return liveData;
  }

  if (liveData.length === 0) {
    return historicalData;
  }

  const byTime = new Map<number, LivelinePoint>();
  historicalData.forEach((point) => byTime.set(point.time, point));
  liveData.forEach((point) => byTime.set(point.time, point));

  return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
};

const trimLivePoints = (
  points: LivelinePoint[],
  latestTime: number,
): LivelinePoint[] => {
  const cutoff = latestTime - LIVE_CHART_RETENTION_SECS;
  const retainedPoints = points.filter((point) => point.time >= cutoff);

  if (retainedPoints.length <= LIVE_CHART_MAX_POINTS) {
    return retainedPoints;
  }

  return retainedPoints.slice(-LIVE_CHART_MAX_POINTS);
};

const getLivePointTime = (
  timestamp: number,
  previousPointTime?: number,
): number => {
  const sourceTime = toTimestampSeconds(timestamp);
  const nowSecs = Date.now() / 1000;

  if (!Number.isFinite(sourceTime)) {
    return nowSecs;
  }

  const isCurrentTimestamp =
    Math.abs(sourceTime - nowSecs) <= CURRENT_TIMESTAMP_TOLERANCE_SECS;

  if (
    isCurrentTimestamp &&
    typeof previousPointTime === 'number' &&
    sourceTime <= previousPointTime
  ) {
    return Math.max(nowSecs, previousPointTime + MIN_LIVE_POINT_DELTA_SECS);
  }

  return sourceTime;
};

export interface UseCryptoUpDownChartDataResult {
  data: LivelinePoint[];
  value: number;
  loading: boolean;
  isLive: boolean;
  window: number;
  /**
   * True when a live market has produced no renderable data for a sustained
   * grace period (upstream data outage). The UI should show a connection-error
   * state instead of an indefinite loading spinner.
   */
  connectionError: boolean;
}

interface UseCryptoUpDownChartDataOptions {
  enabled?: boolean;
  liveUpdatesEnabled?: boolean;
  historicalWindow?: {
    startDate: string;
    endDate?: string;
  };
}

export const useCryptoUpDownChartData = (
  market: PredictMarket & { series: PredictSeries },
  targetPrice?: number,
  options: UseCryptoUpDownChartDataOptions = {},
): UseCryptoUpDownChartDataResult => {
  const enabled = options.enabled ?? true;
  const liveUpdatesEnabled = options.liveUpdatesEnabled ?? true;
  const preserveHistoricalDataAcrossMarket =
    !liveUpdatesEnabled && Boolean(options.historicalWindow);
  const symbol = getCryptoSymbol(market);
  const recurrence = market.series.recurrence;
  const variant = getVariant(recurrence);
  const eventStartTime = getEventStartTime(market.endDate, recurrence);
  const durationSecs = RECURRENCE_TO_DURATION_SECS[recurrence] ?? 300;
  const marketEndDateMs = market.endDate
    ? new Date(market.endDate).getTime()
    : undefined;
  const liveEndDateMs =
    typeof marketEndDateMs === 'number' && Number.isFinite(marketEndDateMs)
      ? marketEndDateMs
      : undefined;
  const isLiveByEndDate =
    enabled && typeof liveEndDateMs === 'number'
      ? Date.now() < liveEndDateMs
      : false;

  const [frozenMarketId, setFrozenMarketId] = useState<string>();
  const hasFrozenLiveData = frozenMarketId === market.id;
  const [liveLoading, setLiveLoading] = useState(true);
  const liveLoadingRef = useRef(true);
  const [liveStreamStale, setLiveStreamStale] = useState(true);
  const staleTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [connectionError, setConnectionError] = useState(false);
  const connectionErrorTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);
  const [liveValue, setLiveValue] = useState(0);
  const [livePoints, setLivePoints] = useState<LivelinePoint[]>(EMPTY_DATA);
  const stableHistoricalDataRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const fallbackStartPointRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const frozenRef = useRef(false);
  const liveMarketRef = useRef({ id: market.id, liveEndDateMs });
  const marketIdRef = useRef(market.id);
  const frozenMarketIdRef = useRef(frozenMarketId);
  const enabledRef = useRef(enabled);
  liveMarketRef.current = { id: market.id, liveEndDateMs };
  marketIdRef.current = market.id;
  frozenMarketIdRef.current = frozenMarketId;
  enabledRef.current = enabled;

  const prevMarketIdRef = useRef(market.id);
  const isCurrentMarket = prevMarketIdRef.current === market.id;
  const pendingFrozenMarketIdRef = useRef<string | undefined>(undefined);
  const pendingFrozenSyncRef = useRef(false);
  if (enabled && !isCurrentMarket) {
    const isNextMarketAlreadyExpired =
      typeof liveEndDateMs === 'number' && Date.now() >= liveEndDateMs;

    prevMarketIdRef.current = market.id;
    frozenRef.current = isNextMarketAlreadyExpired;
    const nextFrozenMarketId = isNextMarketAlreadyExpired
      ? market.id
      : undefined;
    frozenMarketIdRef.current = nextFrozenMarketId;
    pendingFrozenMarketIdRef.current = nextFrozenMarketId;
    pendingFrozenSyncRef.current = true;
    // Intentionally do NOT reset livePoints / historical refs here — preserving
    // them across rollover is what keeps the chart drawing continuously.
  }

  useEffect(() => {
    if (!enabled) return;
    if (!pendingFrozenSyncRef.current) {
      return;
    }
    pendingFrozenSyncRef.current = false;
    setFrozenMarketId(pendingFrozenMarketIdRef.current);
  }, [enabled, market.id]);

  const hasExpiredLiveData =
    isCurrentMarket && !isLiveByEndDate && livePoints.length > 0;

  useEffect(() => {
    if (!enabled) return;
    if (!hasExpiredLiveData || frozenMarketId === market.id) {
      return;
    }

    frozenRef.current = true;
    frozenMarketIdRef.current = market.id;
    setFrozenMarketId(market.id);
  }, [enabled, frozenMarketId, hasExpiredLiveData, market.id]);

  const markLiveStreamFresh = useCallback(() => {
    setLiveStreamStale(false);
    if (staleTimerRef.current) {
      clearTimeout(staleTimerRef.current);
    }
    staleTimerRef.current = setTimeout(() => {
      setLiveStreamStale(true);
    }, LIVE_STREAM_STALE_TIMEOUT_MS);
  }, []);

  const handleLiveUpdate = useCallback(
    (update: CryptoPriceUpdate) => {
      if (!enabledRef.current) return;
      const { id: liveMarketId, liveEndDateMs: currentLiveEndDateMs } =
        liveMarketRef.current;
      const currentMarketId = marketIdRef.current;
      if (
        liveMarketId !== currentMarketId ||
        prevMarketIdRef.current !== currentMarketId
      ) {
        return;
      }

      const shouldFreezeAfterUpdate =
        typeof currentLiveEndDateMs === 'number' &&
        Date.now() >= currentLiveEndDateMs;

      if (frozenRef.current && frozenMarketIdRef.current === currentMarketId) {
        return;
      }

      markLiveStreamFresh();
      setLiveValue(update.price);
      setLivePoints((points) => {
        const timeSecs = getLivePointTime(
          update.timestamp,
          points.at(-1)?.time,
        );
        const point: LivelinePoint = {
          time: timeSecs,
          value: update.price,
        };
        const nextPoints = mergeLivelinePoints(points, [point]);
        return trimLivePoints(nextPoints, timeSecs);
      });
      if (liveLoadingRef.current) {
        liveLoadingRef.current = false;
        setLiveLoading(false);
      }
      if (shouldFreezeAfterUpdate) {
        frozenRef.current = true;
        frozenMarketIdRef.current = currentMarketId;
        setFrozenMarketId(currentMarketId);
      }
    },
    [markLiveStreamFresh],
  );

  useEffect(
    () => () => {
      if (staleTimerRef.current) {
        clearTimeout(staleTimerRef.current);
      }
    },
    [],
  );

  const isLive = isLiveByEndDate && !hasFrozenLiveData;
  const shouldStreamLive = isLive && liveUpdatesEnabled;

  const wsSymbol =
    enabled && shouldStreamLive && symbol ? `${symbol.toLowerCase()}/usd` : '';

  // The live-data WebSocket streams real-time ticks while healthy, so the HTTP
  // query only needs its initial historical baseline in that case. Interval
  // polling is gated on `liveStreamStale` (see `refetchInterval` below) rather
  // than this hook's `isConnected` flag: `isConnected` latches true on the first
  // tick and never flips back on a silent RTDS drop, whereas `liveStreamStale`
  // flips back to true when ticks stop arriving — correctly resuming HTTP
  // polling as a fallback.
  useLiveCryptoPrices(wsSymbol, handleLiveUpdate);

  const historyStartDate =
    options.historicalWindow?.startDate ?? eventStartTime;
  const liveHistoryEndDate = isLiveByEndDate ? undefined : market.endDate;
  const historyEndDate = options.historicalWindow
    ? options.historicalWindow.endDate
    : liveHistoryEndDate;

  // Counts consecutive failed historical-poll cycles. React Query's
  // `fetchFailureCount` only counts retries *within a single fetch* and resets
  // to 0 at the start of every fetch, so it cannot drive a backoff across
  // separate interval polls. We track the count ourselves: increment on each
  // settled error and reset on the next successful fetch (and on market change).
  const consecutivePollFailuresRef = useRef(0);

  // A fresh live stream is a recovery signal: reset the polling circuit breaker
  // so that if the socket later drops (stream goes stale again), HTTP polling
  // resumes from the base cadence instead of staying latched at the disabled
  // threshold.
  useEffect(() => {
    if (!liveStreamStale) {
      consecutivePollFailuresRef.current = 0;
    }
  }, [liveStreamStale]);

  const recordPollFailure = useCallback(() => {
    consecutivePollFailuresRef.current += 1;
  }, []);

  const recordPollSuccess = useCallback(() => {
    consecutivePollFailuresRef.current = 0;
  }, []);

  const historicalQueryOptions = predictQueries.cryptoPriceHistory.options({
    symbol: symbol ?? '',
    eventStartTime: historyStartDate ?? '',
    variant,
    endDate: historyEndDate,
  });

  const historicalQuery = useQuery({
    ...historicalQueryOptions,
    queryFn: async (context) => {
      try {
        const data = await historicalQueryOptions.queryFn(context);
        recordPollSuccess();
        return data;
      } catch (error) {
        recordPollFailure();
        throw error;
      }
    },
    enabled: enabled && !!symbol && !!historyStartDate,
    placeholderData: keepPreviousData,
    staleTime: shouldStreamLive ? 1000 : Infinity,
    refetchOnMount: shouldStreamLive || !liveUpdatesEnabled ? 'always' : false,
    meta: {
      recordPollFailure,
      recordPollSuccess,
    },
    // Only poll while streaming live AND the live stream is not currently
    // delivering fresh ticks (`liveStreamStale`). `refetchOnMount` still seeds
    // the historical baseline once; while the socket streams real-time ticks the
    // interval poll is redundant, but it resumes automatically if ticks stop.
    // When polling is active, the interval backs off (and ultimately stops) as
    // consecutive failures accumulate so an unreachable endpoint is not hit
    // every 10s indefinitely.
    refetchInterval: () =>
      shouldStreamLive && liveStreamStale
        ? getHistoricalPollInterval(consecutivePollFailuresRef.current)
        : false,
  });

  const historicalData = historicalQuery.data ?? EMPTY_DATA;
  const hasUsableHistoricalData = preserveHistoricalDataAcrossMarket
    ? historicalData.length >= 2
    : historicalData.length > 0;
  const stableHistoricalData = hasUsableHistoricalData
    ? historicalData
    : stableHistoricalDataRef.current;
  const historicalValue =
    historicalQuery.data?.at(-1)?.value ?? stableHistoricalData.at(-1)?.value;

  useEffect(() => {
    if (!enabled) return;
    if (hasUsableHistoricalData) {
      stableHistoricalDataRef.current = historicalData;
    }
  }, [enabled, hasUsableHistoricalData, historicalData]);

  const eventStartTimeSecs = eventStartTime
    ? Math.floor(new Date(eventStartTime).getTime() / 1000)
    : undefined;
  const fallbackStartPoint = useMemo(
    () =>
      isLive &&
      typeof targetPrice === 'number' &&
      targetPrice > 0 &&
      typeof eventStartTimeSecs === 'number' &&
      Number.isFinite(eventStartTimeSecs)
        ? [{ time: eventStartTimeSecs, value: targetPrice }]
        : EMPTY_DATA,
    [eventStartTimeSecs, isLive, targetPrice],
  );
  const stableFallbackStartPoint =
    fallbackStartPoint.length > 0
      ? fallbackStartPoint
      : fallbackStartPointRef.current;

  useEffect(() => {
    if (!enabled) return;
    if (fallbackStartPoint.length > 0) {
      fallbackStartPointRef.current = fallbackStartPoint;
    }
  }, [enabled, fallbackStartPoint]);

  const firstLivePointTime = livePoints[0]?.time;
  const livePointOffsetFromEventStart =
    typeof firstLivePointTime === 'number' &&
    typeof eventStartTimeSecs === 'number'
      ? firstLivePointTime - eventStartTimeSecs
      : undefined;
  const firstLivePointIsNearEventStart =
    typeof livePointOffsetFromEventStart === 'number' &&
    livePointOffsetFromEventStart >= 0 &&
    livePointOffsetFromEventStart <= 90;
  const shouldUseFallbackStartPoint =
    stableHistoricalData.length > 0 || firstLivePointIsNearEventStart;
  const baseHistoricalData = mergeLivelinePoints(
    shouldUseFallbackStartPoint ? stableFallbackStartPoint : EMPTY_DATA,
    stableHistoricalData,
  );
  const chartData = mergeLivelinePoints(baseHistoricalData, livePoints);
  const hasRenderableChartData = chartData.length >= 2;
  const newestLivePointTime = livePoints.at(-1)?.time;
  const liveWindowStartSecs =
    typeof newestLivePointTime === 'number'
      ? newestLivePointTime - LIVE_CHART_WINDOW_SECS
      : undefined;
  const liveWindowPointCount =
    typeof liveWindowStartSecs === 'number' &&
    typeof newestLivePointTime === 'number'
      ? chartData.reduce(
          (count, point) =>
            point.time >= liveWindowStartSecs &&
            point.time <= newestLivePointTime
              ? count + 1
              : count,
          0,
        )
      : 0;
  const hasRenderableLiveWindow = liveWindowPointCount >= 2;
  const displayedLiveValue =
    liveLoadingRef.current && typeof historicalValue === 'number'
      ? historicalValue
      : liveValue;

  useEffect(() => {
    if (!enabled) return;
    if (
      isCurrentMarket &&
      isLive &&
      liveLoadingRef.current &&
      typeof historicalValue === 'number'
    ) {
      setLiveValue(historicalValue);
    }
  }, [enabled, historicalValue, isCurrentMarket, isLive]);

  useEffect(() => {
    if (connectionErrorTimerRef.current) {
      clearTimeout(connectionErrorTimerRef.current);
      connectionErrorTimerRef.current = undefined;
    }
    setConnectionError(false);
    consecutivePollFailuresRef.current = 0;
  }, [market.id]);

  const isAwaitingLiveData =
    enabled && isLive && (!hasRenderableLiveWindow || liveStreamStale);
  useEffect(() => {
    if (!isAwaitingLiveData) {
      if (connectionErrorTimerRef.current) {
        clearTimeout(connectionErrorTimerRef.current);
        connectionErrorTimerRef.current = undefined;
      }
      setConnectionError(false);
      return undefined;
    }

    if (connectionErrorTimerRef.current) {
      return undefined;
    }
    connectionErrorTimerRef.current = setTimeout(() => {
      setConnectionError(true);
    }, CONNECTION_ERROR_TIMEOUT_MS);

    return () => {
      if (connectionErrorTimerRef.current) {
        clearTimeout(connectionErrorTimerRef.current);
        connectionErrorTimerRef.current = undefined;
      }
    };
    // `market.id` restarts the grace window when switching markets.
  }, [isAwaitingLiveData, market.id]);

  if (!enabled) {
    return {
      data: EMPTY_DATA,
      value: 0,
      loading: false,
      isLive: false,
      window: durationSecs,
      connectionError: false,
    };
  }

  if (!liveUpdatesEnabled) {
    return {
      data: stableHistoricalData,
      value: historicalValue ?? stableHistoricalData.at(-1)?.value ?? 0,
      loading: historicalQuery.isFetching && stableHistoricalData.length === 0,
      isLive: false,
      window: durationSecs,
      connectionError: false,
    };
  }

  if (isLive || hasFrozenLiveData || hasExpiredLiveData) {
    return {
      data: chartData,
      value: displayedLiveValue,
      // While live, treat a stalled stream (no recent tick) as loading so the
      // chart shows the spinner instead of a blank canvas once the last point
      // scrolls out of the live window. Frozen/expired data only "loads" when
      // there is genuinely nothing renderable.
      loading: isLive
        ? !symbol || !hasRenderableLiveWindow || liveStreamStale
        : !hasRenderableChartData,
      isLive,
      window: LIVE_CHART_WINDOW_SECS,
      connectionError: isLive ? connectionError : false,
    };
  }

  return {
    data: historicalData,
    value: historicalQuery.data?.at(-1)?.value ?? 0,
    loading: historicalQuery.isFetching,
    isLive: false,
    window: durationSecs,
    connectionError: false,
  };
};
