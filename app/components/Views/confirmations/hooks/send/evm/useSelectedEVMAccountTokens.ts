import { createSelector } from 'reselect';
import { useSelector } from 'react-redux';
import { Hex } from '@metamask/utils';

import { selectEvmTokensWithZeroBalanceFilter } from '../../../../../../selectors/multichain/evm';
import { selectIsEvmNetworkSelected } from '../../../../../../selectors/multichainNetworkController';
import {
  // eslint-disable-next-line no-restricted-syntax
  selectChainId,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectNetworkConfigurations,
} from '../../../../../../selectors/networkController';
import { TokenI } from '../../../../../../components/UI/Tokens/types';
import {
  selectSingleTokenBalance,
  selectTokensBalances,
} from '../../../../../../selectors/tokenBalancesController';
import { isTestNet } from '../../../../../../util/networks';
import { createDeepEqualSelector } from '../../../../../../selectors/util';
import { selectSelectedInternalAccountAddress } from '../../../../../../selectors/accountsController';
import { selectTokenMarketData } from '../../../../../../selectors/tokenRatesController';
import {
  selectCurrencyRates,
  selectCurrentCurrency,
} from '../../../../../../selectors/currencyRateController';
import { deriveBalanceFromAssetMarketDetails } from '../../../../../../components/UI/Tokens/util';
import { RootState } from '../../../../../../reducers';
import { getNetworkBadgeSource } from '../../../utils/network';
import { AssetType } from '../../../types/token';
import { useSendContext } from '../../../context/send-context';
import { renderFromTokenMinimalUnit } from '../../../../../../util/number';

const selectEvmTokens = createDeepEqualSelector(
  selectEvmTokensWithZeroBalanceFilter,
  selectIsAllNetworks,
  selectIsPopularNetwork,
  selectIsEvmNetworkSelected,
  selectChainId,
  // forceSelectAllTokens is used for temporary purpose and it will be removed
  // https://github.com/MetaMask/metamask-mobile/issues/18071
  (_: RootState, forceSelectAllTokens?: boolean) => forceSelectAllTokens,
  (
    tokensToDisplay,
    isAllNetworks,
    isPopularNetwork,
    isEvmSelected,
    currentChainId,
    forceSelectAllTokens,
  ) => {
    // Apply network filtering
    const filteredTokens =
      forceSelectAllTokens ||
      (isAllNetworks && isPopularNetwork && isEvmSelected)
        ? tokensToDisplay
        : tokensToDisplay.filter((token) => token.chainId === currentChainId);

    // Categorize tokens as native or non-native, filtering out testnet tokens if applicable
    const nativeTokens: TokenI[] = [];
    const nonNativeTokens: TokenI[] = [];

    for (const currToken of filteredTokens) {
      const token = currToken as TokenI & { chainId: string };

      // Skip tokens if they are on a test network and the current chain is not a test network
      if (isTestNet(token.chainId) && !isTestNet(currentChainId)) {
        continue;
      }

      // Categorize tokens as native or non-native
      if (token.isNative) {
        nativeTokens.push(token);
      } else {
        nonNativeTokens.push(token);
      }
    }

    return [...nativeTokens, ...nonNativeTokens];
  },
);

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
    (_: RootState, asset?: AssetType) => asset,
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
    selectedAsset?: AssetType,
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
          balance = renderFromTokenMinimalUnit(
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

        const isSelected =
          token.address?.toLowerCase() ===
            selectedAsset?.address?.toLowerCase() &&
          token.chainId === selectedAsset?.chainId;

        return {
          ...token,
          balance: balance || '0',
          balanceFiat: balanceFiat?.toString() || '0',
          isSelected,
          networkBadgeSource: getNetworkBadgeSource(token.chainId as Hex),
        };
      })
      .filter((token) => !token.isStaked)
      .filter((token) => token.balance !== '0');
  },
);

export function useSelectedEVMAccountTokens() {
  const { asset } = useSendContext();

  return useSelector((state: RootState) =>
    selectSelectedEVMAccountTokens(state, asset),
  );
}
