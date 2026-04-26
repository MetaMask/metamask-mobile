import {
  type RefObject,
  useCallback,
  useEffect,
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
  const isLive = market.endDate
    ? Date.now() < new Date(market.endDate).getTime()
    : false;

  const [liveLoading, setLiveLoading] = useState(true);
  const liveLoadingRef = useRef(true);
  const [liveValue, setLiveValue] = useState(0);
  const [livePoints, setLivePoints] = useState<LivelinePoint[]>(EMPTY_DATA);
  const stableHistoricalDataRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const fallbackStartPointRef = useRef<LivelinePoint[]>(EMPTY_DATA);
  const frozenRef = useRef(false);

  const prevMarketIdRef = useRef(market.id);
  if (prevMarketIdRef.current !== market.id) {
    prevMarketIdRef.current = market.id;
    frozenRef.current = false;
    liveLoadingRef.current = true;
    setLiveLoading(true);
    setLiveValue(0);
    setLivePoints(EMPTY_DATA);
    stableHistoricalDataRef.current = EMPTY_DATA;
    fallbackStartPointRef.current = EMPTY_DATA;
    chartRef?.current?.clearData();
  }

  const handleLiveUpdate = useCallback(
    (update: CryptoPriceUpdate) => {
      if (market.endDate && Date.now() >= new Date(market.endDate).getTime()) {
        frozenRef.current = true;
      }

      if (frozenRef.current) {
        return;
      }

      const timeSecs = Math.floor(update.timestamp / 1000);
      const point: LivelinePoint = {
        time: timeSecs,
        value: update.price,
      };

      setLiveValue(update.price);
      setLivePoints((points) => {
        const nextPoints = mergeLivelinePoints(points, [point]);
        const cutoff = timeSecs - durationSecs * 2;
        return nextPoints.filter((nextPoint) => nextPoint.time >= cutoff);
      });
      if (liveLoadingRef.current) {
        liveLoadingRef.current = false;
        setLiveLoading(false);
      }
    },
    [durationSecs, market.endDate],
  );

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
  if (historicalData.length > 0) {
    stableHistoricalDataRef.current = historicalData;
  }
  const stableHistoricalData = stableHistoricalDataRef.current;
  const eventStartTimeSecs = eventStartTime
    ? Math.floor(new Date(eventStartTime).getTime() / 1000)
    : undefined;
  const fallbackStartPoint =
    isLive &&
    typeof targetPrice === 'number' &&
    targetPrice > 0 &&
    typeof eventStartTimeSecs === 'number' &&
    Number.isFinite(eventStartTimeSecs)
      ? [{ time: eventStartTimeSecs, value: targetPrice }]
      : EMPTY_DATA;
  if (fallbackStartPoint.length > 0) {
    fallbackStartPointRef.current = fallbackStartPoint;
  }
  const firstLivePointTime = livePoints[0]?.time;
  const firstLivePointIsNearEventStart =
    typeof firstLivePointTime === 'number' &&
    typeof eventStartTimeSecs === 'number' &&
    firstLivePointTime - eventStartTimeSecs <= 90;
  const shouldUseFallbackStartPoint =
    stableHistoricalData.length > 0 || firstLivePointIsNearEventStart;
  const baseHistoricalData = mergeLivelinePoints(
    shouldUseFallbackStartPoint ? fallbackStartPointRef.current : EMPTY_DATA,
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

  if (isLive) {
    return {
      data: chartData,
      value: displayedLiveValue,
      loading:
        liveLoading &&
        !!symbol &&
        (!!eventStartTime || historicalQuery.isFetching) &&
        !hasRenderableLiveData,
      isLive: true,
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
