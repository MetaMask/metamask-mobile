import { type RefObject, useCallback, useRef, useState } from 'react';
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

const LIVE_WINDOW_SECS = 30;
const EMPTY_DATA: LivelinePoint[] = [];

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
  const frozenRef = useRef(false);

  const prevMarketIdRef = useRef(market.id);
  if (prevMarketIdRef.current !== market.id) {
    prevMarketIdRef.current = market.id;
    frozenRef.current = false;
    liveLoadingRef.current = true;
    setLiveLoading(true);
    setLiveValue(0);
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

      chartRef?.current?.appendPoint(point, update.price);

      setLiveValue(update.price);
      if (liveLoadingRef.current) {
        liveLoadingRef.current = false;
        setLiveLoading(false);
      }
    },
    [market.endDate, chartRef],
  );

  const wsSymbol = isLive && symbol ? `${symbol.toLowerCase()}usdt` : '';

  useLiveCryptoPrices(wsSymbol, handleLiveUpdate);

  const historicalQuery = useQuery({
    ...predictQueries.cryptoPriceHistory.options({
      symbol: symbol ?? '',
      eventStartTime: eventStartTime ?? '',
      variant,
      endDate: market.endDate,
    }),
    enabled: !isLive && !!symbol && !!eventStartTime,
  });

  if (isLive) {
    return {
      data: EMPTY_DATA,
      value: liveValue,
      loading: liveLoading,
      isLive: true,
      window: LIVE_WINDOW_SECS,
    };
  }

  return {
    data: historicalQuery.data ?? [],
    value: historicalQuery.data?.at(-1)?.value ?? 0,
    loading: historicalQuery.isFetching,
    isLive: false,
    window: durationSecs,
  };
};
