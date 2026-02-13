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
import { CHAIN_IDS } from '@metamask/transaction-controller';

// Pending conversion to a remote feature flag
const STABLECOINS: Record<Hex, Hex[]> = {
  [CHAIN_IDS.MAINNET]: [
    '0xaca92e438df0b2401ff60da7e4337b687a2435da', // MUSD
    '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
    '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  ],
  [CHAIN_IDS.ARBITRUM]: [
    '0xaf88d065e77c8cc2239327c5edb3a432268e5831', // USDC
  ],
  [CHAIN_IDS.LINEA_MAINNET]: [
    '0xaca92e438df0b2401ff60da7e4337b687a2435da', // MUSD
    '0x176211869ca2b568f2a7d4ee941e073a821ee1ff', // USDC
    '0xa219439258ca9da29e9cc4ce5596924745e12b93', // USDT
  ],
  [CHAIN_IDS.POLYGON]: [
    '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC.e
  ],
};

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
  const safeRequests = useDeepMemo(() => requests, [requests]);

  const result = useMemo(
    () =>
      safeRequests.map(({ address, chainId, currency: currencyOverride }) => {
        const currency = currencyOverride ?? selectedCurrency;
        const isUsd = currency.toLowerCase() === 'usd';

        const isStablecoin = STABLECOINS[chainId]?.includes(
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
