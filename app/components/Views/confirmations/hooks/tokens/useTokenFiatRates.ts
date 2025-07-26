import { useSelector } from 'react-redux';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Hex } from '@metamask/utils';
import { selectCurrencyRates } from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useMemo } from 'react';

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
        const tokenMarketData =
          tokenMarketDataByAddressByChainId[chainId]?.[address];

        const networkConfiguration = networkConfigurations[chainId];

        const conversionRate =
          currencyRates?.[networkConfiguration?.nativeCurrency]?.conversionRate;

        if (!conversionRate || !networkConfiguration) {
          return undefined;
        }

        return (tokenMarketData?.price ?? 1) * conversionRate;
      }),
    [
      requests,
      tokenMarketDataByAddressByChainId,
      currencyRates,
      networkConfigurations,
    ],
  );

  // Temporarily using deep equality as selector data is unstable and result is likely very small.
  // eslint-disable-next-line react-compiler/react-compiler
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => result, [JSON.stringify(result)]);
}
