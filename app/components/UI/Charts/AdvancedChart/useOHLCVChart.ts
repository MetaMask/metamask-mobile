import { useQuery } from '@tanstack/react-query';
import type { OHLCVBar } from './AdvancedChart.types';
import {
  ohlcvChartQueryOptions,
  type OHLCVApiCandle,
  type OHLCVApiResponse,
  type OhlcvChartRequest,
} from './ohlcvChartQuery';
import type { OHLCVTimePeriod } from './TimeRangeSelector';

export type { OHLCVApiCandle, OHLCVApiResponse };

export interface UseOHLCVChartOptions {
  assetId: string;
  timePeriod: OHLCVTimePeriod;
  interval?: string;
  vsCurrency?: string;
}

export interface UseOHLCVChartResult {
  ohlcvData: OHLCVBar[];
  isLoading: boolean;
  error: string | null;
  hasMore: boolean;
  nextCursor: string | null;
  hasEmptyData: boolean;
}

const mapCandle = (candle: OHLCVApiCandle): OHLCVBar => ({
  time: candle.timestamp,
  open: candle.open,
  high: candle.high,
  low: candle.low,
  close: candle.close,
  volume: candle.volume,
});

const toRequest = (options: UseOHLCVChartOptions): OhlcvChartRequest => ({
  assetId: options.assetId,
  timePeriod: options.timePeriod,
  interval: options.interval,
  vsCurrency: options.vsCurrency,
});

export const useOHLCVChart = ({
  assetId,
  timePeriod,
  interval,
  vsCurrency,
}: UseOHLCVChartOptions): UseOHLCVChartResult => {
  const query = useQuery({
    ...ohlcvChartQueryOptions(
      toRequest({ assetId, timePeriod, interval, vsCurrency }),
    ),
    enabled: Boolean(assetId),
  });

  const response = query.data;
  const errorMessage =
    query.error instanceof Error
      ? query.error.message
      : query.error
        ? 'Unknown error'
        : null;

  return {
    ohlcvData: response ? response.data.map(mapCandle) : [],
    isLoading: Boolean(assetId) && query.isPending,
    error: errorMessage,
    hasMore: response?.hasNext ?? false,
    nextCursor: response?.nextCursor || null,
    hasEmptyData: Boolean(
      response && response.data.length === 0 && !query.error,
    ),
  };
};
