import { useCallback, useRef, useState } from 'react';
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
import type { LivelinePoint } from '../../Charts/LivelineChart/LivelineChart.types';

const LIVE_WINDOW_SECS = 30;
const LIVE_BUFFER_SECS = LIVE_WINDOW_SECS * 2;

export interface UseCryptoUpDownChartDataResult {
  data: LivelinePoint[];
  value: number;
  loading: boolean;
  isLive: boolean;
  window: number;
}

export const useCryptoUpDownChartData = (
  market: PredictMarket & { series: PredictSeries },
): UseCryptoUpDownChartDataResult => {
  const symbol = getCryptoSymbol(market);
  const recurrence = market.series.recurrence;
  const variant = getVariant(recurrence);
  const eventStartTime = getEventStartTime(market.endDate, recurrence);
  const durationSecs = RECURRENCE_TO_DURATION_SECS[recurrence] ?? 300;
  const isLive = market.endDate
    ? Date.now() < new Date(market.endDate).getTime()
    : false;

  const [liveData, setLiveData] = useState<LivelinePoint[]>([]);
  const [liveValue, setLiveValue] = useState(0);
  const frozenRef = useRef(false);

  // Reset live state and frozen flag when the market changes (e.g. time-slot switch or
  // auto-advance to live slot). Calling setState during render is intentional here:
  // React will immediately re-render with the reset values, avoiding stale chart data.
  const prevMarketIdRef = useRef(market.id);
  if (prevMarketIdRef.current !== market.id) {
    prevMarketIdRef.current = market.id;
    frozenRef.current = false;
    setLiveData([]);
    setLiveValue(0);
  }

  const handleLiveUpdate = useCallback(
    (update: CryptoPriceUpdate) => {
      if (market.endDate && Date.now() >= new Date(market.endDate).getTime()) {
        frozenRef.current = true;
      }

      if (frozenRef.current) {
        return;
      }

      // CryptoPriceUpdate.timestamp is in Unix milliseconds (from RTDS WebSocket)
      const timeSecs = Math.floor(update.timestamp / 1000);
      const point: LivelinePoint = {
        time: timeSecs,
        value: update.price,
      };

      setLiveValue(update.price);
      setLiveData((prev) => {
        const updated = [...prev, point];
        const cutoff = timeSecs - LIVE_BUFFER_SECS;

        return updated.filter((entry) => entry.time >= cutoff);
      });
    },
    [market.endDate],
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
      data: liveData,
      value: liveValue,
      loading: liveData.length === 0,
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
