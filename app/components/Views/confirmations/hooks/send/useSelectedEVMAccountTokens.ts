import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectEvmTokens } from '../../../../../selectors/multichain/evm';
import { selectSingleTokenBalance , selectTokensBalances } from '../../../../../selectors/tokenBalancesController';
import { selectSelectedInternalAccountAddress } from '../../../../../selectors/accountsController';
import { selectTokenMarketData } from '../../../../../selectors/tokenRatesController';
import { selectNetworkConfigurations } from '../../../../../selectors/networkController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../selectors/currencyRateController';
import { deriveBalanceFromAssetMarketDetails } from '../../../../../components/UI/Tokens/util';
import { RootState } from '../../../../UI/BasicFunctionality/BasicFunctionalityModal/BasicFunctionalityModal.test';
import { getNetworkBadgeSource } from '../../utils/network';
import { convertHexBalanceToDecimal } from '../../utils/conversion';
import { AssetType } from '../../types/token';

// This selector is a temporary solution to get the tokens for the selected account
// Once we have a proper selector from account group, we will replace this with that
const selectSelectedEVMAccountTokens = createSelector(
  [
    (state: RootState) => selectEvmTokens(state, true),
    selectSelectedInternalAccountAddress,
    selectTokenMarketData,
    selectTokensBalances,
    selectNetworkConfigurations,
    selectCurrencyRates,
    selectCurrentCurrency,
    (state: RootState) => state,
  ],
  (
    evmTokens,
    selectedAccountAddress: string | undefined,
    multiChainMarketData,
    multiChainTokenBalance,
    networkConfigurationsByChainId,
    multiChainCurrencyRates,
    currentCurrency,
    state: RootState,
  ): AssetType[] => {
    if (!selectedAccountAddress) {
      return [];
    }

    return evmTokens
      .filter((token) => token.address && token.chainId)
      .map((token) => {
        const tokenBalance = selectSingleTokenBalance(
          state,
          selectedAccountAddress as Hex,
          token.chainId as Hex,
          token.address as Hex,
        );

        const hexBalance = tokenBalance[token.address as Hex];
        let balance = token.balance;
        if (!balance && hexBalance) {
          balance = convertHexBalanceToDecimal(
            hexBalance,
            token.decimals || 18,
          );
        }

        // Calculate fiat balance for the token
        const chainId = token.chainId as Hex;
        const multiChainExchangeRates = multiChainMarketData?.[chainId];
        const multiChainTokenBalances =
          multiChainTokenBalance?.[selectedAccountAddress as Hex]?.[chainId];
        const nativeCurrency =
          networkConfigurationsByChainId[chainId]?.nativeCurrency;
        const multiChainConversionRate =
          multiChainCurrencyRates?.[nativeCurrency]?.conversionRate || 0;

        const balanceFiat =
          token.isETH || token.isNative
            ? parseFloat(balance || '0') * multiChainConversionRate
            : deriveBalanceFromAssetMarketDetails(
                token,
                multiChainExchangeRates || {},
                multiChainTokenBalances || {},
                multiChainConversionRate || 0,
                currentCurrency || '',
              ).balanceFiatCalculation;

        return {
          ...token,
          balance: balance || '0',
          balanceFiat: balanceFiat?.toString() || '0',
          networkBadgeSource: getNetworkBadgeSource(token.chainId as Hex),
        };
      })
      .filter((token) => !token.isStaked)
      .filter((token) => token.balance !== '0');
  },
);

export function useSelectedEVMAccountTokens(): AssetType[] {
  return useSelector(selectSelectedEVMAccountTokens);
}
