/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import { useMemo, useCallback } from 'react';
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
  selectSelectedInternalAccount,
  selectInternalAccounts,
} from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import {
  UseMultichainBalancesHook,
  MultichainBalancesData,
} from './useMultichainBalances.types';
import { formatWithThreshold } from '../../../util/assets';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainDefaultToken,
  selectMultichainShouldShowFiat,
  selectMultichainConversionRate,
  selectMultichainNetworkAggregatedBalanceForAllAccounts,
  selectSelectedAccountMultichainNetworkAggregatedBalance,
} from '../../../selectors/multichain';
import { selectIsEvmNetworkSelected } from '../../../selectors/multichainNetworkController';
///: END:ONLY_INCLUDE_IF
import I18n from '../../../../locales/i18n';

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  // Production selectors (EVM)
  const internalAccounts = useSelector(selectInternalAccounts);
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
    internalAccounts,
    !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
    allChainIDs,
  );

  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    internalAccounts,
    formattedTokensWithBalancesPerChain,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const isEvmSelected = useSelector(selectIsEvmNetworkSelected);
  const { symbol } = useSelector(selectMultichainDefaultToken);
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const multichainConversionRate = useSelector(selectMultichainConversionRate);
  const multichainBalancesForAllAccounts = useSelector(
    selectMultichainNetworkAggregatedBalanceForAllAccounts,
  );
  ///: END:ONLY_INCLUDE_IF

  console.log(
    'multichainBalancesForAllAccounts',
    JSON.stringify(multichainBalancesForAllAccounts, null, 2),
  );

  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  // Memoize the EVM display balance calculation
  const getEvmDisplayBalance = useCallback(
    (account: InternalAccount) => {
      const balance = Engine.getTotalFiatAccountBalance();
      let total;

      if (isOriginalNativeTokenSymbol) {
        if (isPortfolioViewEnabled()) {
          total =
            totalFiatBalancesCrossChain[account.address]?.totalFiatBalance ?? 0;
        } else {
          const tokenFiatTotal = balance?.tokenFiat ?? 0;
          const ethFiatTotal = balance?.ethFiat ?? 0;
          total = tokenFiatTotal + ethFiatTotal;
        }
      } else if (isPortfolioViewEnabled()) {
        total =
          totalFiatBalancesCrossChain[account.address]?.totalTokenFiat ?? 0;
      } else {
        total = balance?.tokenFiat ?? 0;
      }

      return formatWithThreshold(total, 0, I18n.locale, {
        style: 'currency',
        currency: currentCurrency.toUpperCase(),
      });
    },
    [isOriginalNativeTokenSymbol, totalFiatBalancesCrossChain, currentCurrency],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  // Memoize the non-EVM display balance calculation
  const getNonEvmDisplayBalance = useCallback(
    (account: InternalAccount) => {
      const accountBalance = multichainBalancesForAllAccounts?.[account.id];
      if (!shouldShowFiat) {
        return `${accountBalance?.totalNativeTokenBalance} ${symbol}`;
      }
      if (accountBalance?.totalBalanceFiat && multichainConversionRate) {
        return formatWithThreshold(
          parseFloat(accountBalance.totalBalanceFiat),
          0,
          I18n.locale,
          {
            style: 'currency',
            currency: currentCurrency.toUpperCase(),
          },
        );
      }

      if (!accountBalance?.totalNativeTokenBalance) {
        return undefined;
      }

      return `${accountBalance.totalNativeTokenBalance} ${symbol}`;
    },
    [
      multichainBalancesForAllAccounts,
      shouldShowFiat,
      multichainConversionRate,
      symbol,
      currentCurrency,
    ],
  );
  ///: END:ONLY_INCLUDE_IF

  // Memoize the should show aggregated percentage calculation
  const getShouldShowAggregatedPercentage = useCallback(() => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    return !isTestNet(chainId) && isEvmSelected;
    ///: END:ONLY_INCLUDE_IF

    // Note: This code marked as unreachable however when the above block gets removed after code fencing this return becomes necessary
    return !isTestNet(chainId);
  }, [chainId, isEvmSelected]);

  // Memoize the display balance calculation
  const getDisplayBalance = useCallback(
    (account: InternalAccount) => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (!isEvmSelected) {
        return getNonEvmDisplayBalance(account);
      }
      ///: END:ONLY_INCLUDE_IF
      return getEvmDisplayBalance(account);
    },
    [isEvmSelected, getNonEvmDisplayBalance, getEvmDisplayBalance],
  );

  // Memoize the aggregated balance calculation
  const getAggregatedBalance = useCallback(() => {
    const balance = Engine.getTotalFiatAccountBalance();
    return {
      ethFiat: balance?.ethFiat ?? 0,
      tokenFiat: balance?.tokenFiat ?? 0,
      tokenFiat1dAgo: balance?.tokenFiat1dAgo ?? 0,
      ethFiat1dAgo: balance?.ethFiat1dAgo ?? 0,
    };
  }, []);

  // Memoize portfolio view enabled check
  const isPortfolioEnabled = useMemo(() => isPortfolioViewEnabled(), []);

  // Memoize the balance calculations
  const allAccountBalances = useMemo(
    () =>
      internalAccounts.reduce(
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
            shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(),
            isPortfolioVieEnabled: isPortfolioEnabled,
            aggregatedBalance: getAggregatedBalance(),
            conversionRate: multichainConversionRate ?? 1,
          },
        }),
        {} as Record<string, MultichainBalancesData>,
      ),
    [
      internalAccounts,
      currentCurrency,
      totalFiatBalancesCrossChain,
      getDisplayBalance,
      getShouldShowAggregatedPercentage,
      getAggregatedBalance,
      isPortfolioEnabled,
      multichainConversionRate,
    ],
  );

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
            shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(),
            isPortfolioVieEnabled: isPortfolioEnabled,
            aggregatedBalance: getAggregatedBalance(),
          }
        : {
            displayBalance: undefined,
            displayCurrency: currentCurrency,
            tokenFiatBalancesCrossChains: [],
            totalFiatBalance: 0,
            totalTokenFiat: 0,
            shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(),
            isPortfolioVieEnabled: isPortfolioEnabled,
            aggregatedBalance: getAggregatedBalance(),
          },
    [
      selectedInternalAccount,
      currentCurrency,
      totalFiatBalancesCrossChain,
      getDisplayBalance,
      getShouldShowAggregatedPercentage,
      getAggregatedBalance,
      isPortfolioEnabled,
    ],
  );

  return {
    multichainBalancesForAllAccounts: allAccountBalances,
    selectedAccountMultichainBalance,
  };
};

export default useMultichainBalances;
