import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { MUSD_DECIMALS, MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { toChecksumAddress } from '../../../../util/address';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../constants/networks';
import { RootState } from '../../../../reducers';
import { selectTokenMarketData } from '../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../selectors/currencyRateController';
import { selectNetworkConfigurations } from '../../../../selectors/networkController';
import { fromTokenMinimalUnitString } from '../../../../util/number';
import BigNumber from 'bignumber.js';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import I18n from '../../../../../locales/i18n';
import { formatWithThreshold } from '../../../../util/assets';

const SUPPORTED_MUSD_CHAIN_IDS = [
  CHAIN_IDS.MAINNET,
  CHAIN_IDS.LINEA_MAINNET,
] as const;

/**
 * Hook to get MUSD token balance across supported chains (Mainnet, Linea).
 * @returns Object containing:
 * - hasMusdBalanceOnAnyChain: true if the user has MUSD on any supported chain
 * - hasMusdBalanceOnChain: (chainId) => true if the user has MUSD on that chain
 * - tokenBalanceByChain: per-chain token balance decimal strings
 * - fiatBalanceByChain: per-chain fiat balance decimal strings
 * - fiatBalanceFormattedByChain: per-chain fiat balance locale-formatted currency strings
 * - tokenBalanceAggregated: sum of token balance across chains (string)
 * - fiatBalanceAggregated: sum of fiat value across chains (string, or undefined if no rates)
 * - fiatBalanceAggregatedFormatted: aggregated fiat value as locale-formatted currency string
 */
export const useMusdBalance = () => {
  const selectedEvmAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );

  const tokenBalances = useSelector(selectTokensBalances);
  const tokenMarketDataByAddressByChainId = useSelector(selectTokenMarketData);
  const currencyRates = useSelector(selectCurrencyRates);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const networkConfigurations = useSelector(selectNetworkConfigurations);

  const balancesPerChainId = useMemo(
    () =>
      selectedEvmAddress
        ? (tokenBalances?.[selectedEvmAddress as Hex] ?? {})
        : {},
    [selectedEvmAddress, tokenBalances],
  );

  const {
    hasMusdBalanceOnAnyChain,
    hasMusdBalanceOnChain,
    tokenBalanceByChain,
    fiatBalanceByChain,
    fiatBalanceFormattedByChain,
    tokenBalanceAggregated,
    fiatBalanceAggregated,
    fiatBalanceAggregatedFormatted,
  } = useMemo(() => {
    const tokenBalanceResult: Partial<Record<Hex, string>> = {};
    const fiatBalanceResult: Partial<Record<Hex, string>> = {};
    const fiatBalanceFormattedResult: Partial<Record<Hex, string>> = {};

    let hasAnyBalance = false;
    let tokenBalanceTotal = new BigNumber(0);
    let fiatBalanceTotal: BigNumber | undefined;

    for (const chainId of SUPPORTED_MUSD_CHAIN_IDS) {
      const tokenAddress = MUSD_TOKEN_ADDRESS_BY_CHAIN[chainId];
      const chainBalances = balancesPerChainId[chainId];
      if (!chainBalances || !tokenAddress) {
        continue;
      }

      // mUSD token addresses are lowercase in the constant, but balances might be checksummed
      const normalizedTokenAddress = toChecksumAddress(tokenAddress);
      const balanceHex =
        chainBalances[normalizedTokenAddress] || chainBalances[tokenAddress];

      if (!balanceHex || balanceHex === '0x0') {
        continue;
      }

      hasAnyBalance = true;

      const tokenBalance = fromTokenMinimalUnitString(
        balanceHex,
        MUSD_DECIMALS,
      );
      tokenBalanceResult[chainId] = tokenBalance;
      tokenBalanceTotal = tokenBalanceTotal.plus(tokenBalance);

      const chainConfig = networkConfigurations?.[chainId];
      const nativeCurrency = chainConfig?.nativeCurrency;
      const conversionRate = nativeCurrency
        ? currencyRates?.[nativeCurrency]?.conversionRate
        : undefined;

      const tokenMarketDataForChain =
        tokenMarketDataByAddressByChainId?.[chainId] ?? {};
      const tokenPriceInNativeCurrency =
        tokenMarketDataForChain[normalizedTokenAddress]?.price;

      if (
        !conversionRate ||
        !currentCurrency ||
        tokenPriceInNativeCurrency === undefined
      ) {
        continue;
      }

      const tokenFiatRate = new BigNumber(tokenPriceInNativeCurrency).times(
        conversionRate,
      );
      const fiatValue = new BigNumber(tokenBalance).times(tokenFiatRate);

      fiatBalanceResult[chainId] = fiatValue.toFixed();
      fiatBalanceFormattedResult[chainId] = formatWithThreshold(
        fiatValue.toNumber(),
        0.01,
        I18n.locale,
        {
          style: 'currency',
          currency: currentCurrency,
        },
      );

      fiatBalanceTotal = fiatBalanceTotal
        ? fiatBalanceTotal.plus(fiatValue)
        : fiatValue;
    }

    const fiatBalanceAggregatedString = fiatBalanceTotal?.toFixed();
    const fiatBalanceAggregatedFormattedString =
      fiatBalanceTotal && currentCurrency
        ? formatWithThreshold(fiatBalanceTotal.toNumber(), 0.01, I18n.locale, {
            style: 'currency',
            currency: currentCurrency,
          })
        : formatWithThreshold(0, 0.01, I18n.locale, {
            style: 'currency',
            currency: currentCurrency,
          });

    const hasBalanceOnChain = (chainId: Hex) =>
      Boolean(tokenBalanceResult[chainId]);

    return {
      hasMusdBalanceOnAnyChain: hasAnyBalance,
      hasMusdBalanceOnChain: hasBalanceOnChain,
      tokenBalanceByChain: tokenBalanceResult as Record<Hex, string>,
      fiatBalanceByChain: fiatBalanceResult as Record<Hex, string>,
      fiatBalanceFormattedByChain: fiatBalanceFormattedResult as Record<
        Hex,
        string
      >,
      tokenBalanceAggregated: tokenBalanceTotal.toFixed(),
      fiatBalanceAggregated: fiatBalanceAggregatedString,
      fiatBalanceAggregatedFormatted: fiatBalanceAggregatedFormattedString,
    };
  }, [
    balancesPerChainId,
    currencyRates,
    currentCurrency,
    networkConfigurations,
    tokenMarketDataByAddressByChainId,
  ]);

  return useMemo(
    () => ({
      hasMusdBalanceOnAnyChain,
      hasMusdBalanceOnChain,
      tokenBalanceByChain,
      fiatBalanceByChain,
      fiatBalanceFormattedByChain,
      tokenBalanceAggregated,
      fiatBalanceAggregated,
      fiatBalanceAggregatedFormatted,
    }),
    [
      fiatBalanceAggregated,
      fiatBalanceAggregatedFormatted,
      fiatBalanceByChain,
      fiatBalanceFormattedByChain,
      hasMusdBalanceOnAnyChain,
      hasMusdBalanceOnChain,
      tokenBalanceAggregated,
      tokenBalanceByChain,
    ],
  );
};
