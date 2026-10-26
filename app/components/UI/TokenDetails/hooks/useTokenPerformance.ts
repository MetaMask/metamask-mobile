import { useMemo } from 'react';
import type { FungibleAssetPrice } from '@metamask/assets-controller';
import type { TokenAssetMarketData } from '../queries/tokenAssetQuery';

/** Percent change values rendered by the Performance section. Null → gray dash. */
export interface TokenPerformance {
  fiveMinute: number | null;
  oneHour: number | null;
  fourHour: number | null;
  twentyFourHour: number | null;
}

export interface UseTokenPerformanceParams {
  marketData: FungibleAssetPrice | null;
  assetMarketData: TokenAssetMarketData | null;
}

const toFiniteOrNull = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const parseAssetPercent = (value: string | null | undefined): number | null => {
  if (value == null || value === '') {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const useTokenPerformance = ({
  marketData,
  assetMarketData,
}: UseTokenPerformanceParams): TokenPerformance =>
  useMemo(
    () => ({
      fiveMinute: parseAssetPercent(assetMarketData?.pricePercentChange5m),
      oneHour: toFiniteOrNull(marketData?.pricePercentChange1h),
      fourHour: parseAssetPercent(assetMarketData?.pricePercentChange4h),
      twentyFourHour: toFiniteOrNull(marketData?.pricePercentChange1d),
    }),
    [marketData, assetMarketData],
  );

export default useTokenPerformance;
