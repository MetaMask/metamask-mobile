import { useSelector } from 'react-redux';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { Hex } from '@metamask/utils';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import { useMemo } from 'react';
import { useDeepMemo } from '../useDeepMemo';
import { toChecksumAddress } from '../../../../../util/address';
import { ARBITRUM_USDC_ADDRESS } from '../../external/perps-temp/hooks/usePerpsDepositInit';
import { CHAIN_IDS } from '@metamask/transaction-controller';

export interface TokenFiatRateRequest {
  address: Hex;
  chainId: Hex;
}

export function useTokenFiatRates(requests: TokenFiatRateRequest[]) {
  const currency = useSelector(selectCurrentCurrency);
  const tokenMarketDataByAddressByChainId = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const networkConfigurations = useSelector(selectNetworkConfigurations);
  const safeRequests = useDeepMemo(() => requests, [requests]);

  const result = useMemo(
    () =>
      safeRequests.map(({ address, chainId }) => {
        if (
          currency.toLowerCase() === 'usd' &&
          address.toLowerCase() === ARBITRUM_USDC_ADDRESS.toLowerCase() &&
          chainId === CHAIN_IDS.ARBITRUM
        ) {
          return 1;
        }

        const chainTokens = tokenMarketDataByAddressByChainId[chainId] ?? {};
        const token = chainTokens[toChecksumAddress(address)];
        const networkConfiguration = networkConfigurations[chainId];

        const conversionRate =
          currencyRates?.[networkConfiguration?.nativeCurrency]?.conversionRate;

        if (!conversionRate || !networkConfiguration) {
          return undefined;
        }

        return (token?.price ?? 1) * conversionRate;
      }),
    [
      currency,
      currencyRates,
      networkConfigurations,
      safeRequests,
      tokenMarketDataByAddressByChainId,
    ],
  );

  return useDeepMemo(() => result, [result]);
}

export function useTokenFiatRate(tokenAddress: Hex, chainId: Hex) {
  const rates = useTokenFiatRates([{ address: tokenAddress, chainId }]);
  return rates[0];
}
