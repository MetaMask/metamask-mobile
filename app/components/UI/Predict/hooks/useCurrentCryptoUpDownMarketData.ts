import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PredictMarketStatus, Recurrence, type PredictSeries } from '../types';
import {
  getCryptoSymbol,
  getEventStartTime,
  getVariant,
  isCryptoUpDown,
  resolveCryptoTargetPrice,
} from '../utils/cryptoUpDown';
import { formatPrice } from '../utils/format';
import {
  formatSeriesMarketCountdown,
  getSeriesDurationMs,
  getSeriesMarketProgressRemaining,
  getSeriesMarketTimeRemainingMs,
  type PredictMarketWithSeries,
} from '../utils/series';
import { predictQueries } from '../queries';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import { useLiveCryptoPrices } from './useLiveCryptoPrices';
import {
  useCurrentPredictMarketFromSeries,
  type UseCurrentPredictMarketFromSeriesParams,
} from './useCurrentPredictMarketFromSeries';

const FALLBACK_SERIES: PredictSeries = {
  id: '',
  slug: '',
  title: '',
  recurrence: '5m',
};

const FALLBACK_MARKET: PredictMarketWithSeries = {
  id: '',
  providerId: '',
  slug: '',
  title: '',
  description: '',
  image: '',
  status: PredictMarketStatus.CLOSED,
  recurrence: Recurrence.NONE,
  category: 'crypto',
  tags: [],
  outcomes: [],
  liquidity: 0,
  volume: 0,
  series: FALLBACK_SERIES,
};

export type UseCurrentCryptoUpDownMarketDataParams =
  UseCurrentPredictMarketFromSeriesParams;

const getRenderedPriceKey = (value: number | undefined) =>
  value === undefined || Number.isNaN(value)
    ? undefined
    : formatPrice(value, { maximumDecimals: 0 });

export const useCurrentCryptoUpDownMarketData = ({
  enabled = true,
  ...seriesParams
}: UseCurrentCryptoUpDownMarketDataParams) => {
  const currentMarketQuery = useCurrentPredictMarketFromSeries({
    ...seriesParams,
    enabled,
  });
  const resolvedMarket = currentMarketQuery.market;
  const cryptoMarket =
    resolvedMarket && isCryptoUpDown(resolvedMarket)
      ? resolvedMarket
      : undefined;
  const market = cryptoMarket ?? FALLBACK_MARKET;
  const shouldFetchMarketData = enabled && Boolean(cryptoMarket);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!shouldFetchMarketData) {
      return undefined;
    }

    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => clearInterval(interval);
  }, [shouldFetchMarketData]);

  const symbol = shouldFetchMarketData ? getCryptoSymbol(market) : undefined;
  const eventStartTime = shouldFetchMarketData
    ? getEventStartTime(market.endDate, market.series.recurrence)
    : undefined;
  const variant = getVariant(market.series.recurrence);
  const marketEndDateMs = market.endDate
    ? new Date(market.endDate).getTime()
    : undefined;
  const isLiveByEndDate =
    shouldFetchMarketData &&
    typeof marketEndDateMs === 'number' &&
    Number.isFinite(marketEndDateMs)
      ? Date.now() < marketEndDateMs
      : false;
  const liveHistoryEndDate = isLiveByEndDate ? undefined : market.endDate;
  const historyQuery = useQuery({
    ...predictQueries.cryptoPriceHistory.options({
      symbol: symbol ?? '',
      eventStartTime: eventStartTime ?? '',
      variant,
      endDate: liveHistoryEndDate,
    }),
    enabled:
      shouldFetchMarketData && Boolean(symbol) && Boolean(eventStartTime),
    staleTime: Infinity,
    refetchOnMount: false,
  });
  const { data: targetPrice, isFetching: isTargetPriceFetching } =
    useCryptoTargetPrice({
      eventId: market.id,
      symbol: symbol ?? '',
      eventStartTime: eventStartTime ?? '',
      variant,
      endDate: market.endDate ?? '',
      enabled:
        shouldFetchMarketData &&
        !market.twapWindowSeconds &&
        Boolean(symbol) &&
        Boolean(eventStartTime) &&
        Boolean(market.endDate),
    });
  const priceToBeat = shouldFetchMarketData
    ? market.twapWindowSeconds
      ? market.priceToBeat
      : resolveCryptoTargetPrice(market, targetPrice)
    : undefined;
  const [livePrice, setLivePrice] = useState<number | undefined>();
  const latestRenderedPriceKeyRef = useRef<string | undefined>();

  useEffect(() => {
    latestRenderedPriceKeyRef.current = undefined;
    setLivePrice(undefined);
  }, [market.id, shouldFetchMarketData, symbol]);

  const handleLivePriceUpdate = useCallback(
    (update: { price: number }) => {
      if (!shouldFetchMarketData) {
        return;
      }

      const nextPrice = update.price;
      const nextRenderedPriceKey = getRenderedPriceKey(nextPrice);

      if (nextRenderedPriceKey === latestRenderedPriceKeyRef.current) {
        return;
      }

      latestRenderedPriceKeyRef.current = nextRenderedPriceKey;
      setLivePrice(nextPrice);
    },
    [shouldFetchMarketData],
  );

  const wsSymbol =
    shouldFetchMarketData && symbol ? `${symbol.toLowerCase()}/usd` : '';
  useLiveCryptoPrices(
    wsSymbol,
    handleLivePriceUpdate,
    market.twapWindowSeconds,
  );
  const seededPrice = historyQuery.data?.at(-1)?.value;

  useEffect(() => {
    if (livePrice === undefined) {
      latestRenderedPriceKeyRef.current = getRenderedPriceKey(seededPrice);
    }
  }, [livePrice, seededPrice]);

  const currentPrice = useMemo(() => {
    if (livePrice !== undefined) {
      return livePrice;
    }

    return seededPrice;
  }, [livePrice, seededPrice]);
  const durationMs = getSeriesDurationMs(market.series.recurrence);
  const timeRemainingMs = getSeriesMarketTimeRemainingMs(market.endDate, nowMs);
  const chartData = useMemo(
    () => ({
      data: historyQuery.data ?? [],
      value: currentPrice ?? 0,
      loading: historyQuery.isLoading,
      isLive: isLiveByEndDate,
      window: durationMs / 1000,
    }),
    [
      currentPrice,
      durationMs,
      historyQuery.data,
      historyQuery.isLoading,
      isLiveByEndDate,
    ],
  );

  return {
    ...currentMarketQuery,
    market: cryptoMarket,
    marketId: cryptoMarket?.id,
    symbol,
    currentPrice,
    priceToBeat,
    targetPrice: priceToBeat,
    countdown: formatSeriesMarketCountdown(market.endDate, nowMs),
    timeRemainingMs,
    progressRemaining: getSeriesMarketProgressRemaining(
      market.endDate,
      durationMs,
      nowMs,
    ),
    chartData,
    isLoading:
      currentMarketQuery.isLoading ||
      (shouldFetchMarketData &&
        ((historyQuery.isLoading && currentPrice === undefined) ||
          isTargetPriceFetching)),
    isFetching:
      currentMarketQuery.isFetching ||
      historyQuery.isFetching ||
      isTargetPriceFetching,
  };
};
