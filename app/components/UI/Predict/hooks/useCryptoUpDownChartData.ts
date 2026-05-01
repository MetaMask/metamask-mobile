import {
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { predictQueries } from '../queries';
import { useLiveCryptoPrices } from './useLiveCryptoPrices';
import {
  getCryptoSymbol,
  getVariant,
  getEventStartTime,
  RECURRENCE_TO_DURATION_SECS,
} from '../utils/cryptoUpDown';
import type { PredictMarket, PredictSeries, CryptoPriceUpdate } from '../types';
import type {
  LivelineChartRef,
  LivelinePoint,
} from '../../Charts/LivelineChart/LivelineChart.types';

const EMPTY_DATA: LivelinePoint[] = [];
const MILLISECOND_TIMESTAMP_THRESHOLD = 9999999999;

const toTimestampSeconds = (timestamp: number) =>
  timestamp > MILLISECOND_TIMESTAMP_THRESHOLD
    ? Math.floor(timestamp / 1000)
    : timestamp;

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

export interface UseCryptoUpDownChartDataResult {
  data: LivelinePoint[];
  value: number;
  loading: boolean;
  isLive: boolean;
  window: number;
}

export const useCryptoUpDownChartData = (
  market: PredictMarket & { series: PredictSeries },
  chartRef?: RefObject<LivelineChartRef | null>,
  targetPrice?: number,
): UseCryptoUpDownChartDataResult => {
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
    typeof liveEndDateMs === 'number' ? Date.now() < liveEndDateMs : false;

  const [frozenMarketId, setFrozenMarketId] = useState<string>();
  const hasFrozenLiveData = frozenMarketId === market.id;
  const [liveLoading, setLiveLoading] = useState(true);
  const liveLoadingRef = useRef(true);
  const [liveValue, setLiveValue] = useState(0);
  const [livePoints, setLivePoints] = useState<LivelinePoint[]>(EMPTY_DATA);
  const stableHistoricalDataRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const fallbackStartPointRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const frozenRef = useRef(false);
  const durationSecsRef = useRef(durationSecs);
  const liveEndDateMsRef = useRef(liveEndDateMs);
  const marketIdRef = useRef(market.id);
  const frozenMarketIdRef = useRef(frozenMarketId);
  durationSecsRef.current = durationSecs;
  liveEndDateMsRef.current = liveEndDateMs;
  marketIdRef.current = market.id;
  frozenMarketIdRef.current = frozenMarketId;

  const prevMarketIdRef = useRef(market.id);
  const isCurrentMarket = prevMarketIdRef.current === market.id;
  useEffect(() => {
    if (prevMarketIdRef.current === market.id) {
      return;
    }

    prevMarketIdRef.current = market.id;
    frozenRef.current = false;
    setFrozenMarketId(undefined);
    liveLoadingRef.current = true;
    setLiveLoading(true);
    setLiveValue(0);
    setLivePoints(EMPTY_DATA);
    stableHistoricalDataRef.current = EMPTY_DATA;
    fallbackStartPointRef.current = EMPTY_DATA;
    chartRef?.current?.clearData();
  }, [chartRef, market.id]);

  const hasExpiredLiveData =
    isCurrentMarket && !isLiveByEndDate && livePoints.length > 0;

  useEffect(() => {
    if (!hasExpiredLiveData || frozenMarketId === market.id) {
      return;
    }

    frozenRef.current = true;
    frozenMarketIdRef.current = market.id;
    setFrozenMarketId(market.id);
  }, [frozenMarketId, hasExpiredLiveData, market.id]);

  const handleLiveUpdate = useCallback((update: CryptoPriceUpdate) => {
    const currentLiveEndDateMs = liveEndDateMsRef.current;
    const currentMarketId = marketIdRef.current;
    if (
      typeof currentLiveEndDateMs === 'number' &&
      Date.now() >= currentLiveEndDateMs
    ) {
      frozenRef.current = true;
      frozenMarketIdRef.current = currentMarketId;
      setFrozenMarketId(currentMarketId);
    }

    if (frozenRef.current && frozenMarketIdRef.current === currentMarketId) {
      return;
    }

    const timeSecs = toTimestampSeconds(update.timestamp);
    const point: LivelinePoint = {
      time: timeSecs,
      value: update.price,
    };

    setLiveValue(update.price);
    setLivePoints((points) => {
      const nextPoints = mergeLivelinePoints(points, [point]);
      const cutoff = timeSecs - durationSecsRef.current * 2;
      return nextPoints.filter((nextPoint) => nextPoint.time >= cutoff);
    });
    if (liveLoadingRef.current) {
      liveLoadingRef.current = false;
      setLiveLoading(false);
    }
  }, []);

  const isLive = isLiveByEndDate && !hasFrozenLiveData;

  const wsSymbol = isLive && symbol ? `${symbol.toLowerCase()}usdt` : '';

  useLiveCryptoPrices(wsSymbol, handleLiveUpdate);

  const historyEndDate = isLive ? undefined : market.endDate;

  // TODO: Explore alternate price history sources when Polymarket's Binance-backed history endpoint is unavailable.
  const historicalQuery = useQuery({
    ...predictQueries.cryptoPriceHistory.options({
      symbol: symbol ?? '',
      eventStartTime: eventStartTime ?? '',
      variant,
      endDate: historyEndDate,
    }),
    enabled: !!symbol && !!eventStartTime,
    staleTime: isLive ? 1000 : Infinity,
    refetchOnMount: isLive ? 'always' : false,
    refetchInterval: isLive ? 10000 : false,
  });

  const historicalValue = historicalQuery.data?.at(-1)?.value;
  const historicalData = historicalQuery.data ?? EMPTY_DATA;
  const stableHistoricalData =
    historicalData.length > 0
      ? historicalData
      : stableHistoricalDataRef.current;

  useEffect(() => {
    if (historicalData.length > 0) {
      stableHistoricalDataRef.current = historicalData;
    }
  }, [historicalData]);

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
    if (fallbackStartPoint.length > 0) {
      fallbackStartPointRef.current = fallbackStartPoint;
    }
  }, [fallbackStartPoint]);

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
  const hasRenderableLiveData = chartData.length >= 2;
  const displayedLiveValue =
    liveLoadingRef.current && typeof historicalValue === 'number'
      ? historicalValue
      : liveValue;

  useEffect(() => {
    if (
      isLive &&
      liveLoadingRef.current &&
      typeof historicalValue === 'number'
    ) {
      setLiveValue(historicalValue);
    }
  }, [historicalValue, isLive]);

  if (isLive || hasFrozenLiveData || hasExpiredLiveData) {
    return {
      data: chartData,
      value: displayedLiveValue,
      loading: isLive && (!symbol || (liveLoading && !hasRenderableLiveData)),
      isLive,
      window: durationSecs,
    };
  }

  return {
    data: historicalData,
    value: historicalQuery.data?.at(-1)?.value ?? 0,
    loading: historicalQuery.isFetching,
    isLive: false,
    window: durationSecs,
  };
};
