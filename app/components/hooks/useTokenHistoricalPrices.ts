import { useQuery } from '@tanstack/react-query';
import type { Hex } from '@metamask/utils';
import type { TokenI } from '../UI/Tokens/types';
import {
  HISTORICAL_PRICE_PLACEHOLDER,
  historicalPricesQueryOptions,
  type TimePeriod,
  type TokenPrice,
} from './historicalPricesQuery';

export {
  hasInsufficientTimeCoverage,
  DEFAULT_HISTORICAL_TIME_PERIOD,
  type TimePeriod,
  type TokenPrice,
} from './historicalPricesQuery';

const useTokenHistoricalPrices = ({
  asset,
  address,
  chainId,
  timePeriod,
  from,
  to,
  vsCurrency,
}: {
  asset: TokenI;
  address: string;
  chainId: Hex;
  timePeriod: TimePeriod;
  from?: number | undefined;
  to?: number | undefined;
  vsCurrency: string;
}): {
  data: TokenPrice[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  hasInsufficientCoverage: boolean;
  apiDurationMs: number | undefined;
} => {
  const query = useQuery(
    historicalPricesQueryOptions({
      assetChainId: String(asset.chainId ?? ''),
      assetAddress: asset.address,
      address,
      chainId,
      timePeriod,
      vsCurrency,
      from,
      to,
    }),
  );

  const payload = query.data;

  return {
    data: payload?.prices ?? HISTORICAL_PRICE_PLACEHOLDER,
    isLoading: query.isPending,
    error: payload?.error,
    hasInsufficientCoverage: payload?.hasInsufficientCoverage ?? false,
    apiDurationMs: payload?.apiDurationMs,
  };
};

export default useTokenHistoricalPrices;
