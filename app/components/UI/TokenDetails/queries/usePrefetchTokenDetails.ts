import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import type { Hex } from '@metamask/utils';
import { selectNativeCurrencyByChainId } from '../../../../selectors/networkController';
import {
  selectCurrentCurrency,
  selectCurrencyRates,
} from '../../../../selectors/currencyRateController';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import { safeToChecksumAddress } from '../../../../util/address';
import { formatChainIdToCaip } from '@metamask/bridge-controller';
import type { RootState } from '../../../../reducers';
import type { TokenDetailsRouteParams } from '../constants/constants';
import { useTokenCaipAssetId } from '../hooks/useTokenCaipAssetId';
import {
  buildTokenDetailsPrefetchInput,
  prefetchTokenDetailsQueries,
} from './prefetchTokenDetailsQueries';

export const usePrefetchTokenDetails = (
  token: TokenDetailsRouteParams,
): void => {
  const queryClient = useQueryClient();
  const assetId = useTokenCaipAssetId(token);
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

  useEffect(() => {
    prefetchTokenDetailsQueries(
      queryClient,
      buildTokenDetailsPrefetchInput({
        token,
        assetId,
        currentCurrency,
        marketDataRate,
        nativeConversionRate,
      }),
    );
  }, [
    queryClient,
    token,
    assetId,
    currentCurrency,
    marketDataRate,
    nativeConversionRate,
  ]);
};
