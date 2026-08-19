import { useEffect, useMemo, useState } from 'react';
import {
  CandlePeriod,
  TimeDuration,
  type CandleData,
} from '@metamask/perps-controller';
import { usePerpsLiveCandles } from './stream/usePerpsLiveCandles';

export interface UsePerpsSyncedChartPriceParams {
  symbol: string;
  interval: CandlePeriod;
  isAdvancedChartEnabled: boolean;
}

export interface UsePerpsSyncedChartPriceResult {
  candleData: CandleData | null;
  isLoading: boolean;
  hasHistoricalData: boolean;
  fetchMoreHistory: () => Promise<void>;
  /**
   * Price shown in the market header, summary, and chart current-price line.
   * Advanced Chart latest-bar close when that chart is reporting, otherwise
   * the last candle close.
   */
  syncedChartCurrentPrice: number;
  setAdvancedChartCurrentPrice: (price: number | undefined) => void;
}

/**
 * Shared Lite/Pro source of truth for the market-detail display price.
 *
 * Last candle close is the baseline so the header and chart price line stay
 * in sync. When the Advanced Chart is enabled and reporting, its latest bar
 * close is preferred (same merge as `PerpsMarketDetailsView`).
 */
export function usePerpsSyncedChartPrice({
  symbol,
  interval,
  isAdvancedChartEnabled,
}: UsePerpsSyncedChartPriceParams): UsePerpsSyncedChartPriceResult {
  const { candleData, isLoading, hasHistoricalData, fetchMoreHistory } =
    usePerpsLiveCandles({
      symbol,
      interval,
      duration: TimeDuration.YearToDate,
      throttleMs: 1000,
    });

  const chartCurrentPrice = useMemo(() => {
    if (!candleData?.candles?.length) {
      return 0;
    }
    const lastCandle = candleData.candles.at(-1);
    return lastCandle?.close ? Number.parseFloat(lastCandle.close) : 0;
  }, [candleData]);

  const [advancedChartCurrentPrice, setAdvancedChartCurrentPrice] = useState<
    number | undefined
  >(undefined);

  const syncedChartCurrentPrice =
    isAdvancedChartEnabled && advancedChartCurrentPrice !== undefined
      ? advancedChartCurrentPrice
      : chartCurrentPrice;

  useEffect(() => {
    setAdvancedChartCurrentPrice(undefined);
  }, [isAdvancedChartEnabled, symbol, interval]);

  return {
    candleData,
    isLoading,
    hasHistoricalData,
    fetchMoreHistory,
    syncedChartCurrentPrice,
    setAdvancedChartCurrentPrice,
  };
}
