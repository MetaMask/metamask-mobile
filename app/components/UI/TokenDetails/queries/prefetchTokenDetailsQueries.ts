import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { Hex } from '@metamask/utils';
import {
  selectAssetsMemecoinTdpV1Enabled,
  selectMemecoinTdpV1PriceApiBaseUrl,
} from '../../../../selectors/featureFlagController/assetsMemecoinTdpV1';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../util/address';
import type { RootState } from '../../../../reducers';
import { resolveOhlcvChartAssetId } from '../../AssetOverview/Price/resolveOhlcvChartAssetId';
import { prefetchOhlcvChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import { prefetchHistoricalPrices } from '../../../hooks/useTokenHistoricalPrices';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { prefetchSpotPrice } from '../hooks/useTokenPrice';
import {
  resolveTokenCaipAssetId,
  type TokenCaipAssetIdInput,
} from '../hooks/useTokenCaipAssetId';
import { prefetchTokenSecurity } from '../../Tokens/queries/prefetchTokenSecurity';
export const prefetchTokenDetailsQueries = (
  queryClient: QueryClient,
  token: TokenCaipAssetIdInput,
  assetId: string | null,
  currentCurrency: string,
  marketDataMissing: boolean,
  hasNativeConversionRate: boolean,
  priceApiBaseUrl?: string,
): void => {
  prefetchHistoricalPrices(
    queryClient,
    token,
    currentCurrency,
    priceApiBaseUrl,
  );
  prefetchOhlcvChart(queryClient, assetId, currentCurrency, priceApiBaseUrl);
  // Not given the host: the spot price goes through a utility Bridge and swaps
  // share, and is deliberately left on prod.
  prefetchSpotPrice(
    queryClient,
    token,
    currentCurrency,
    marketDataMissing,
    hasNativeConversionRate,
  );
  // Resolved through the same helper the page uses rather than reusing
  // `assetId` above, which is the chart's asset id and not always the same.
  const caipAssetId = resolveTokenCaipAssetId(token);
  prefetchTokenSecurity(queryClient, caipAssetId);
};

export const usePrefetchTokenDetails = (
  token: TokenDetailsRouteParams,
): void => {
  const queryClient = useQueryClient();
  const assetId = resolveOhlcvChartAssetId(token);
  const isMemecoinTdpEnabled = useSelector(selectAssetsMemecoinTdpV1Enabled);
  // Read from the store rather than `usePriceApiHost`, because this runs in
  // the route wrapper — above the provider, and before the variant that
  // decides whether the provider renders at all is known.
  const priceApiBaseUrl = useSelector(selectMemecoinTdpV1PriceApiBaseUrl);
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
  const marketDataMissing =
    allTokenMarketData?.[chainId]?.[itemAddress as Hex]?.price === undefined;
  const rawNativeConversionRate =
    nativeCurrency && conversionRateByTicker?.[nativeCurrency]?.conversionRate;
  const hasNativeConversionRate = Boolean(
    typeof rawNativeConversionRate === 'number'
      ? rawNativeConversionRate
      : undefined,
  );

  // The prefetch only warms price and chart caches for the memecoin Token
  // Details page. With the flag off the legacy page fetches through its own
  // hooks. Eligibility is boolean so a price tick does not refetch queries
  // whose keys do not include the rate.
  useEffect(() => {
    if (!isMemecoinTdpEnabled) {
      return;
    }

    prefetchTokenDetailsQueries(
      queryClient,
      token,
      assetId,
      currentCurrency,
      marketDataMissing,
      hasNativeConversionRate,
      priceApiBaseUrl,
    );
  }, [
    queryClient,
    isMemecoinTdpEnabled,
    token,
    assetId,
    currentCurrency,
    marketDataMissing,
    hasNativeConversionRate,
    priceApiBaseUrl,
  ]);
};
