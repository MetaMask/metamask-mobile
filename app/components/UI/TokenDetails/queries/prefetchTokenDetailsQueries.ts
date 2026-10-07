import type { QueryClient } from '@tanstack/react-query';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { DEFAULT_HISTORICAL_TIME_PERIOD } from '../../../hooks/useTokenHistoricalPrices';
import { historicalPricesQueryOptions } from '../../../hooks/historicalPricesQuery';
import { ohlcvChartQueryOptions } from '../../Charts/AdvancedChart/ohlcvChartQuery';
import type { OHLCVTimePeriod } from '../../Charts/AdvancedChart/TimeRangeSelector';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import { safeToChecksumAddress } from '../../../../util/address';
import type { TokenI } from '../../Tokens/types';
import {
  PERFORMANCE_CANDLE_INTERVAL,
  PERFORMANCE_CANDLE_TIME_PERIOD,
} from '../hooks/useTokenPerformance';
import { spotPriceQueryOptions } from './spotPriceQuery';
import { tokenAssetQueryOptions } from './tokenAssetQuery';

export interface TokenDetailsPrefetchInput {
  assetId: string | null;
  historical: Parameters<typeof historicalPricesQueryOptions>[0] | null;
  ohlcv: Parameters<typeof ohlcvChartQueryOptions>[0] | null;
  spot: Parameters<typeof spotPriceQueryOptions>[0] | null;
}

export const buildTokenDetailsPrefetchInput = ({
  token,
  assetId,
  currentCurrency,
  marketDataRate,
  nativeConversionRate,
}: {
  token: Pick<TokenI, 'address' | 'chainId'>;
  assetId: string | null;
  currentCurrency: string;
  marketDataRate: number | undefined;
  nativeConversionRate: number | null | undefined;
}): TokenDetailsPrefetchInput => {
  const chainId = token.chainId as Hex;
  const isNonEvmToken = formatChainIdToCaip(chainId) === token.chainId;
  const itemAddress = !isNonEvmToken
    ? safeToChecksumAddress(token.address)
    : token.address;
  const shouldFetchSpot =
    marketDataRate === undefined &&
    Boolean(itemAddress) &&
    (isNonEvmChainId(chainId) || Boolean(nativeConversionRate));

  return {
    assetId,
    historical: {
      assetChainId: String(token.chainId ?? ''),
      assetAddress: String(token.address ?? ''),
      address: String(token.address ?? ''),
      chainId,
      timePeriod: DEFAULT_HISTORICAL_TIME_PERIOD,
      vsCurrency: currentCurrency,
    },
    ohlcv: assetId
      ? {
          assetId,
          timePeriod: PERFORMANCE_CANDLE_TIME_PERIOD as OHLCVTimePeriod,
          interval: PERFORMANCE_CANDLE_INTERVAL,
          vsCurrency: currentCurrency,
        }
      : null,
    spot:
      shouldFetchSpot && itemAddress
        ? {
            chainId,
            tokenAddress: itemAddress,
            currency: currentCurrency,
          }
        : null,
  };
};

export const prefetchTokenDetailsQueries = (
  queryClient: QueryClient,
  input: TokenDetailsPrefetchInput,
): void => {
  if (input.assetId) {
    queryClient
      .query(tokenAssetQueryOptions(input.assetId))
      .catch(() => undefined);
  }
  if (input.historical) {
    queryClient
      .query(historicalPricesQueryOptions(input.historical))
      .catch(() => undefined);
  }
  if (input.ohlcv?.assetId) {
    queryClient
      .query(ohlcvChartQueryOptions(input.ohlcv))
      .catch(() => undefined);
  }
  if (input.spot) {
    queryClient.query(spotPriceQueryOptions(input.spot)).catch(() => undefined);
  }
};
