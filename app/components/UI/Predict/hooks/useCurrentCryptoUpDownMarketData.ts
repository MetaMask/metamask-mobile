import { useEffect, useMemo, useState } from 'react';
import { PredictMarketStatus, Recurrence, type PredictSeries } from '../types';
import {
  getCryptoSymbol,
  getEventStartTime,
  getVariant,
  isCryptoUpDown,
} from '../utils/cryptoUpDown';
import {
  formatSeriesMarketCountdown,
  getSeriesDurationMs,
  getSeriesMarketProgressRemaining,
  getSeriesMarketTimeRemainingMs,
  type PredictMarketWithSeries,
} from '../utils/series';
import { useCryptoTargetPrice } from './useCryptoTargetPrice';
import { useCryptoUpDownChartData } from './useCryptoUpDownChartData';
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
  const { data: targetPrice, isFetching: isTargetPriceFetching } =
    useCryptoTargetPrice({
      eventId: market.id,
      symbol: symbol ?? '',
      eventStartTime: eventStartTime ?? '',
      variant,
      endDate: market.endDate ?? '',
      enabled:
        shouldFetchMarketData &&
        Boolean(symbol) &&
        Boolean(eventStartTime) &&
        Boolean(market.endDate),
    });
  const priceToBeat =
    shouldFetchMarketData && typeof targetPrice === 'number' && targetPrice > 0
      ? targetPrice
      : undefined;
  const chartData = useCryptoUpDownChartData(market, priceToBeat, {
    enabled: shouldFetchMarketData,
  });
  const currentPrice = useMemo(
    () =>
      chartData.data.at(-1)?.value ??
      (chartData.value > 0 ? chartData.value : undefined),
    [chartData.data, chartData.value],
  );
  const durationMs = getSeriesDurationMs(market.series.recurrence);
  const timeRemainingMs = getSeriesMarketTimeRemainingMs(market.endDate, nowMs);

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
      (shouldFetchMarketData && (chartData.loading || isTargetPriceFetching)),
    isFetching: currentMarketQuery.isFetching || isTargetPriceFetching,
  };
};
