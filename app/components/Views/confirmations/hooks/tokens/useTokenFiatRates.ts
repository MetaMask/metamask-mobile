import { useSelector } from 'react-redux';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Hex } from '@metamask/utils';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { selectStablecoins } from '../../../../../selectors/featureFlagController/stableTokens';
import { useMemo } from 'react';
import { useDeepMemo } from '../useDeepMemo';
import { toChecksumAddress } from '../../../../../util/address';

export interface TokenFiatRateRequest {
  address: Hex;
  chainId: Hex;
  currency?: string;
}

export function useTokenFiatRates(requests: TokenFiatRateRequest[]) {
  const selectedCurrency = useSelector(selectCurrentCurrency);
  const tokenMarketDataByAddressByChainId = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const stablecoins = useSelector(selectStablecoins);
  const safeRequests = useDeepMemo(() => requests, [requests]);

  const result = useMemo(
    () =>
      safeRequests.map(({ address, chainId, currency: currencyOverride }) => {
        const currency = currencyOverride ?? selectedCurrency;
        const isUsd = currency.toLowerCase() === 'usd';

        const isStablecoin = stablecoins[chainId]?.includes(
          address.toLowerCase() as Hex,
        );

        if (isUsd && isStablecoin) {
          return 1;
        }

        const chainTokens = tokenMarketDataByAddressByChainId[chainId] ?? {};
        const token = chainTokens[toChecksumAddress(address)];
        const networkConfiguration = networkConfigurations[chainId];

        const conversionRates =
          currencyRates?.[networkConfiguration?.nativeCurrency];

        const conversionRate =
          currency === 'usd'
            ? conversionRates?.usdConversionRate
            : conversionRates?.conversionRate;

        if (!conversionRate || !networkConfiguration) {
          return undefined;
        }

        return (token?.price ?? 1) * conversionRate;
      }),
    [
      currencyRates,
      networkConfigurations,
      safeRequests,
      selectedCurrency,
      stablecoins,
      tokenMarketDataByAddressByChainId,
    ],
  );

  return useDeepMemo(() => result, [result]);
}

export function useTokenFiatRate(
  tokenAddress: Hex,
  chainId: Hex,
  currency?: string,
) {
  const rates = useTokenFiatRates([
    { address: tokenAddress, chainId, currency },
  ]);
  return rates[0];
}
