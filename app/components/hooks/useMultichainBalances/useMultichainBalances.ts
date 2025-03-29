/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectEvmTicker,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../../../selectors/preferencesController';
import {
  selectInternalAccounts,
  selectSelectedInternalAccount,
} from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import {
  MultichainBalancesData,
  UseMultichainBalancesHook,
} from './useMultichainBalances.types';
import { formatWithThreshold } from '../../../util/assets';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainShouldShowFiat,
  getMultichainNetworkAggregatedBalance,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
///: END:ONLY_INCLUDE_IF
import I18n from '../../../../locales/i18n';
import { useCallback, useMemo } from 'react';
import { isEvmAccountType } from '@metamask/keyring-api';

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  // Production selectors (EVM)
  const accountsList = useSelector(selectInternalAccounts);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const chainId = useSelector(selectChainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const { type } = useSelector(selectProviderConfig);
  const ticker = useSelector(selectEvmTicker);

  // Production hooks (EVM)
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    accountsList,
    !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
    allChainIDs,
  );

  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    accountsList,
    formattedTokensWithBalancesPerChain,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const multichainBalances = useSelector(selectMultichainBalances);
  const multichainAssets = useSelector(selectMultichainAssets);
  const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
  const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
  ///: END:ONLY_INCLUDE_IF

  // Production balance calculartion (EVM)
  const getEvmDisplayBalance = useCallback(
    (account: InternalAccount) => {
      const balance = Engine.getTotalFiatAccountBalance(account);
      let total;

      // console.log(
      //   'balance',
      //   JSON.stringify(totalFiatBalancesCrossChain, null, 2),
      // );

      if (isOriginalNativeTokenSymbol) {
        if (isPortfolioViewEnabled()) {
          total =
            totalFiatBalancesCrossChain[account?.address as string]
              ?.totalFiatBalance ?? 0;
        } else {
          const tokenFiatTotal = balance?.tokenFiat ?? 0;
          const ethFiatTotal = balance?.ethFiat ?? 0;
          total = tokenFiatTotal + ethFiatTotal;
        }
      } else if (isPortfolioViewEnabled()) {
        total =
          totalFiatBalancesCrossChain[account?.address as string]
            ?.totalTokenFiat ?? 0;
      } else {
        total = balance?.tokenFiat ?? 0;
      }

      return formatWithThreshold(total, 0, I18n.locale, {
        style: 'currency',
        currency: currentCurrency.toUpperCase(),
      });
    },
    [currentCurrency, isOriginalNativeTokenSymbol, totalFiatBalancesCrossChain],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const getMultiChainFiatBalance = useCallback(
    (balance: string, currency: string) => {
      return formatWithThreshold(parseFloat(balance), 0, I18n.locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      });
    },
    [],
  );

  const getNonEvmDisplayBalance = useCallback(
    (account: InternalAccount) => {
      const accountBalance = getMultichainNetworkAggregatedBalance(
        account,
        multichainBalances,
        multichainAssets,
        multichainAssetsRates,
        nonEvmChainId,
      );

      if (!shouldShowFiat) {
        return `${accountBalance.totalNativeTokenBalance.amount} ${accountBalance.totalNativeTokenBalance.unit}`;
      }

      return getMultiChainFiatBalance(
        accountBalance.totalBalanceFiat,
        currentCurrency,
      );
    },
    [
      currentCurrency,
      getMultiChainFiatBalance,
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      nonEvmChainId,
      shouldShowFiat,
    ],
  );
  ///: END:ONLY_INCLUDE_IF

  const getDisplayBalance = useCallback(
    (account: InternalAccount) => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (!isEvmAccountType(account.type)) {
        return getNonEvmDisplayBalance(account);
      }
      ///: END:ONLY_INCLUDE_IF
      return getEvmDisplayBalance(account);
    },
    [getEvmDisplayBalance, getNonEvmDisplayBalance],
  );

  const getAggregatedBalance = (account: InternalAccount) => {
    const balance = Engine.getTotalFiatAccountBalance(account);
    return {
      ethFiat: balance?.ethFiat ?? 0,
      tokenFiat: balance?.tokenFiat ?? 0,
      tokenFiat1dAgo: balance?.tokenFiat1dAgo ?? 0,
      ethFiat1dAgo: balance?.ethFiat1dAgo ?? 0,
    };
  };

  const getShouldShowAggregatedPercentage = useCallback(
    (account: InternalAccount) => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      return !isTestNet(chainId) && isEvmAccountType(account.type);
      ///: END:ONLY_INCLUDE_IF

      // Note: This code marked as unreachable however when the above block gets removed after code fencing this return becomes necessary
      return !isTestNet(chainId);
    },
    [chainId],
  );

  const isPortfolioEnabled = isPortfolioViewEnabled();

  const allAccountBalances = useMemo(
    () =>
      accountsList.reduce(
        (acc, account) => ({
          ...acc,
          [account.id]: {
            displayBalance: getDisplayBalance(account),
            displayCurrency: currentCurrency,
            tokenFiatBalancesCrossChains:
              totalFiatBalancesCrossChain[account.address]
                ?.tokenFiatBalancesCrossChains ?? [],
            totalFiatBalance:
              totalFiatBalancesCrossChain[account.address]?.totalFiatBalance ??
              0,
            totalTokenFiat:
              totalFiatBalancesCrossChain[account.address]?.totalTokenFiat ?? 0,
            shouldShowAggregatedPercentage:
              getShouldShowAggregatedPercentage(account),
            isPortfolioVieEnabled: isPortfolioEnabled,
            aggregatedBalance: getAggregatedBalance(account),
          },
        }),
        {} as Record<string, MultichainBalancesData>,
      ),
    [
      accountsList,
      currentCurrency,
      getDisplayBalance,
      getShouldShowAggregatedPercentage,
      isPortfolioEnabled,
      totalFiatBalancesCrossChain,
    ],
  );

  // console.log(
  //   'totalFiatBalancesCrossChain',
  //   JSON.stringify(totalFiatBalancesCrossChain, null, 2),
  // );

  const selectedAccountMultichainBalance = useMemo(
    () =>
      selectedInternalAccount
        ? {
            displayBalance: getDisplayBalance(selectedInternalAccount),
            displayCurrency: currentCurrency,
            tokenFiatBalancesCrossChains:
              totalFiatBalancesCrossChain[selectedInternalAccount.address]
                ?.tokenFiatBalancesCrossChains ?? [],
            totalFiatBalance:
              totalFiatBalancesCrossChain[selectedInternalAccount.address]
                ?.totalFiatBalance ?? 0,
            totalTokenFiat:
              totalFiatBalancesCrossChain[selectedInternalAccount.address]
                ?.totalTokenFiat ?? 0,
            shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(
              selectedInternalAccount,
            ),
            isPortfolioVieEnabled: isPortfolioEnabled,
            aggregatedBalance: getAggregatedBalance(selectedInternalAccount),
          }
        : undefined,
    [
      currentCurrency,
      getDisplayBalance,
      getShouldShowAggregatedPercentage,
      isPortfolioEnabled,
      selectedInternalAccount,
      totalFiatBalancesCrossChain,
    ],
  );

  return {
    multichainBalancesForAllAccounts: allAccountBalances,
    selectedAccountMultichainBalance,
  };
};

export default useMultichainBalances;
