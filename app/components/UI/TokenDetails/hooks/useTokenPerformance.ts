import { useMemo } from 'react';
import type { TokenMarketData } from '../queries/tokenMarketData';

/** Percent change values rendered by the Performance section. Null → gray dash. */
export interface TokenPerformance {
  fiveMinute: number | null;
  oneHour: number | null;
  fourHour: number | null;
  twentyFourHour: number | null;
}

export interface UseTokenPerformanceParams {
  marketData: TokenMarketData | null;
}

const toFiniteOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

export const useTokenPerformance = ({
  marketData,
}: UseTokenPerformanceParams): TokenPerformance =>
  useMemo(
    () => ({
      fiveMinute: toFiniteOrNull(marketData?.pricePercentChange5m),
      oneHour: toFiniteOrNull(marketData?.pricePercentChange1h),
      fourHour: toFiniteOrNull(marketData?.pricePercentChange4h),
      twentyFourHour: toFiniteOrNull(marketData?.pricePercentChange1d),
    }),
    [marketData],
  );

export default useTokenPerformance;
