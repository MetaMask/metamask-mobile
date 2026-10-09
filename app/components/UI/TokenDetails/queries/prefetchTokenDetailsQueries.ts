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
import { resolveOhlcvChartAssetId } from '../../AssetOverview/Price/resolveOhlcvChartAssetId';
import { prefetchOhlcvChart } from '../../Charts/AdvancedChart/useOHLCVChart';
import { prefetchHistoricalPrices } from '../../../hooks/useTokenHistoricalPrices';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { prefetchSpotPrice } from '../hooks/useTokenPrice';
import type { TokenI } from '../../Tokens/types';

export const prefetchTokenDetailsQueries = (
  queryClient: QueryClient,
  token: Pick<TokenI, 'address' | 'chainId'>,
  assetId: string | null,
  currentCurrency: string,
  marketDataMissing: boolean,
  hasNativeConversionRate: boolean,
): void => {
  prefetchHistoricalPrices(queryClient, token, currentCurrency);
  prefetchOhlcvChart(queryClient, assetId, currentCurrency);
  prefetchSpotPrice(
    queryClient,
    token,
    currentCurrency,
    marketDataMissing,
    hasNativeConversionRate,
  );
};

export const usePrefetchTokenDetails = (
  token: TokenDetailsRouteParams,
): void => {
  const queryClient = useQueryClient();
  const assetId = resolveOhlcvChartAssetId(token);
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
