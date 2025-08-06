import { useSelector } from 'react-redux';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Hex } from '@metamask/utils';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useMemo } from 'react';
import { useDeepMemo } from '../useDeepMemo';

export interface TokenFiatRateRequest {
  address: Hex;
  chainId: Hex;
}

export function useTokenFiatRates(requests: TokenFiatRateRequest[]) {
  const tokenMarketDataByAddressByChainId = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const result = useMemo(
    () =>
      requests.map(({ address, chainId }) => {
        const chainTokens = Object.values(
          tokenMarketDataByAddressByChainId[chainId] ?? {},
        );

        const token = chainTokens.find(
          (t) => t.tokenAddress.toLowerCase() === address.toLowerCase(),
        );

        const networkConfiguration = networkConfigurations[chainId];

        const conversionRate =
          currencyRates?.[networkConfiguration?.nativeCurrency]?.conversionRate;

        if (!conversionRate || !networkConfiguration) {
          return undefined;
        }

        return (token?.price ?? 1) * conversionRate;
      }),
    [
      requests,
      tokenMarketDataByAddressByChainId,
      currencyRates,
      networkConfigurations,
    ],
  );

  return useDeepMemo(() => result, [result]);
}
