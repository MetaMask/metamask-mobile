import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import { selectAssetsMemecoinTdpV1Enabled } from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../util/address';
import type { RootState } from '../../../../reducers';
import { isNonEvmChainId } from '../../../../core/Multichain/utils';
import {
  ohlcvChartQueryOptions,
  type UseOHLCVChartOptions,
} from '../../Charts/AdvancedChart/useOHLCVChart';
import {
  DEFAULT_HISTORICAL_TIME_PERIOD,
  historicalPricesQueryOptions,
  type HistoricalPricesRequest,
} from '../../../hooks/useTokenHistoricalPrices';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import {
  PERFORMANCE_CANDLE_INTERVAL,
  PERFORMANCE_CANDLE_TIME_PERIOD,
} from '../hooks/useTokenPerformance';
import {
  spotPriceQueryOptions,
  type SpotPriceQueryRequest,
} from '../hooks/useTokenPrice';
import type { TokenI } from '../../Tokens/types';
import { tokenAssetQueryOptions } from './tokenAssetQuery';

export interface TokenDetailsPrefetchInput {
  assetId: string | null;
  historical: HistoricalPricesRequest;
  ohlcv: UseOHLCVChartOptions | null;
  spot: SpotPriceQueryRequest | null;
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
          timePeriod: PERFORMANCE_CANDLE_TIME_PERIOD,
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
  queryClient
    .query(historicalPricesQueryOptions(input.historical))
    .catch(() => undefined);
  if (input.ohlcv?.assetId) {
    queryClient
      .query(ohlcvChartQueryOptions(input.ohlcv))
      .catch(() => undefined);
  }
  if (input.spot) {
    queryClient.query(spotPriceQueryOptions(input.spot)).catch(() => undefined);
  }
};

export const usePrefetchTokenDetails = (
  token: TokenDetailsRouteParams,
): void => {
  const queryClient = useQueryClient();
  const assetId = useTokenCaipAssetId(token);
  const isMemecoinTdpEnabled = useSelector(selectAssetsMemecoinTdpV1Enabled);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const conversionRateByTicker = useSelector(selectCurrencyRates);
  const allTokenMarketData = useSelector(selectTokenMarketData);
  const chainId = token.chainId as Hex;
  const nativeCurrency = useSelector((state: RootState) =>
    selectNativeCurrencyByChainId(state, chainId),
  );

  const isNonEvmToken = formatChainIdToCaip(chainId) === token.chainId;
  const itemAddress = !isNonEvmToken
    ? safeToChecksumAddress(token.address)
    : token.address;
  const marketDataRate =
    allTokenMarketData?.[chainId]?.[itemAddress as Hex]?.price;
  const rawNativeConversionRate =
    nativeCurrency && conversionRateByTicker?.[nativeCurrency]?.conversionRate;
  const nativeConversionRate =
    typeof rawNativeConversionRate === 'number'
      ? rawNativeConversionRate
      : undefined;
  const marketDataMissing = marketDataRate === undefined;
  const hasNativeConversionRate = Boolean(nativeConversionRate);

  // The prefetch only warms the cache for the memecoin Token Details page.
  // With the flag off the legacy page fetches through its own hooks, so
  // skipping the prefetch avoids firing the /v2/assets request for every
  // token the user opens. Eligibility is boolean so a price tick does not
  // refetch queries whose keys do not include the rate.
  useEffect(() => {
    if (!isMemecoinTdpEnabled) {
      return;
    }

    prefetchTokenDetailsQueries(
      queryClient,
      buildTokenDetailsPrefetchInput({
        token,
        assetId,
        currentCurrency,
        marketDataRate: marketDataMissing ? undefined : 1,
        nativeConversionRate: hasNativeConversionRate ? 1 : undefined,
      }),
    );
  }, [
    queryClient,
    isMemecoinTdpEnabled,
    token,
    assetId,
    currentCurrency,
    marketDataMissing,
    hasNativeConversionRate,
  ]);
};
