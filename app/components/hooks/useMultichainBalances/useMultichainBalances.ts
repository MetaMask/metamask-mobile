/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectEvmTicker,
  selectEvmChainId,
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
  MultichainNetworkAggregatedBalance,
} from '../../../selectors/multichain';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
import { isEvmAccountType } from '@metamask/keyring-api';
///: END:ONLY_INCLUDE_IF
import I18n from '../../../../locales/i18n';
import { useCallback, useMemo } from 'react';

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
  const evmChainId = useSelector(selectEvmChainId);
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

  const totalFiatBalancesCrossEvmChain = useGetTotalFiatBalanceCrossChains(
    accountsList,
    formattedTokensWithBalancesPerChain,
  );

  const isOriginalNativeEvmTokenSymbol = useIsOriginalNativeTokenSymbol(
    evmChainId,
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

  const isPortfolioEnabled = isPortfolioViewEnabled();

  // Production balance calculartion (EVM)
  const getEvmBalance = useCallback(
    (account: InternalAccount) => {
      const balance = Engine.getTotalEvmFiatAccountBalance(account);
      let total;

      if (isOriginalNativeEvmTokenSymbol) {
        if (isPortfolioEnabled) {
          total =
            totalFiatBalancesCrossEvmChain[account?.address as string]
              ?.totalFiatBalance ?? 0;
        } else {
          const tokenFiatTotal = balance?.tokenFiat ?? 0;
          const ethFiatTotal = balance?.ethFiat ?? 0;
          total = tokenFiatTotal + ethFiatTotal;
        }
      } else if (isPortfolioEnabled) {
        total =
          totalFiatBalancesCrossEvmChain[account?.address as string]
            ?.totalTokenFiat ?? 0;
      } else {
        total = balance?.tokenFiat ?? 0;
      }

      const displayBalance = formatWithThreshold(total, 0, I18n.locale, {
        style: 'currency',
        currency: currentCurrency.toUpperCase(),
      });

      return {
        displayBalance,
        totalFiatBalance: total,
        totalNativeTokenBalance: balance?.totalNativeTokenBalance,
        nativeTokenUnit: balance?.ticker,
      };
    },
    [
      currentCurrency,
      isOriginalNativeEvmTokenSymbol,
      isPortfolioEnabled,
      totalFiatBalancesCrossEvmChain,
    ],
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const getMultiChainFiatBalance = useCallback(
    (balance: number | undefined, currency: string) => {
      if (balance === undefined) return '0';
      return formatWithThreshold(balance, 0, I18n.locale, {
        style: 'currency',
        currency: currency.toUpperCase(),
      });
    },
    [],
  );

  const getNonEvmDisplayBalance = useCallback(
    (nonEvmAccountBalance: MultichainNetworkAggregatedBalance) => {
      if (!shouldShowFiat || !nonEvmAccountBalance.totalBalanceFiat) {
        if (!nonEvmAccountBalance.totalNativeTokenBalance) {
          return '0';
        }
        return `${nonEvmAccountBalance.totalNativeTokenBalance.amount} ${nonEvmAccountBalance.totalNativeTokenBalance.unit}`;
      }

      return getMultiChainFiatBalance(
        nonEvmAccountBalance.totalBalanceFiat,
        currentCurrency,
      );
    },
    [currentCurrency, getMultiChainFiatBalance, shouldShowFiat],
  );
  ///: END:ONLY_INCLUDE_IF

  const getAggregatedBalance = useMemo(
    () => (account: InternalAccount) => {
      const balance = Engine.getTotalEvmFiatAccountBalance(account);
      return {
        ethFiat: balance?.ethFiat ?? 0,
        tokenFiat: balance?.tokenFiat ?? 0,
        tokenFiat1dAgo: balance?.tokenFiat1dAgo ?? 0,
        ethFiat1dAgo: balance?.ethFiat1dAgo ?? 0,
      };
    },
    [],
  );

  const getAccountBalanceData = useCallback(
    (
      account: InternalAccount,
    ): {
      displayBalance: string;
      totalFiatBalance: number | undefined;
      totalNativeTokenBalance: string | undefined;
      nativeTokenUnit: string;
    } => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      if (!isEvmAccountType(account.type)) {
        const nonEvmAccountBalance = getMultichainNetworkAggregatedBalance(
          account,
          multichainBalances,
          multichainAssets,
          multichainAssetsRates,
          nonEvmChainId,
        );
        return {
          displayBalance: getNonEvmDisplayBalance(nonEvmAccountBalance),
          totalFiatBalance: nonEvmAccountBalance.totalBalanceFiat,
          totalNativeTokenBalance:
            nonEvmAccountBalance.totalNativeTokenBalance?.amount,
          nativeTokenUnit:
            nonEvmAccountBalance.totalNativeTokenBalance?.unit || '',
        };
      }
      ///: END:ONLY_INCLUDE_IF
      const evmAccountBalance = getEvmBalance(account);
      return {
        displayBalance: evmAccountBalance.displayBalance,
        totalFiatBalance: evmAccountBalance.totalFiatBalance,
        totalNativeTokenBalance:
          evmAccountBalance.totalNativeTokenBalance?.toString() || '0',
        nativeTokenUnit: evmAccountBalance.nativeTokenUnit || '',
      };
    },
    [
      getEvmBalance,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      getNonEvmDisplayBalance,
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      nonEvmChainId,
      ///: END:ONLY_INCLUDE_IF
    ],
  );

  const getShouldShowAggregatedPercentage = useMemo(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    () => (account: InternalAccount) => {
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      return !isTestNet(chainId) && isEvmAccountType(account.type);
      ///: END:ONLY_INCLUDE_IF

      // Note: This code marked as unreachable however when the above block gets removed after code fencing this return becomes necessary
      return !isTestNet(chainId);
    },
    [chainId],
  );

  // Create a stable reference for each account's balance data
  const allAccountBalances = useMemo(() => {
    const result: Record<string, MultichainBalancesData> = {};

    for (const account of accountsList) {
      const accountBalanceData = getAccountBalanceData(account);
      result[account.id] = {
        displayBalance: accountBalanceData.displayBalance,
        displayCurrency: currentCurrency,
        totalFiatBalance: accountBalanceData.totalFiatBalance,
        totalNativeTokenBalance: accountBalanceData.totalNativeTokenBalance,
        nativeTokenUnit: accountBalanceData.nativeTokenUnit,
        tokenFiatBalancesCrossChains:
          totalFiatBalancesCrossEvmChain[account.address]
            ?.tokenFiatBalancesCrossChains ?? [],
        shouldShowAggregatedPercentage:
          getShouldShowAggregatedPercentage(account),
        isPortfolioVieEnabled: isPortfolioEnabled,
        aggregatedBalance: getAggregatedBalance(account),
      };
    }

    return result;
  }, [
    accountsList,
    currentCurrency,
    getAccountBalanceData,
    getAggregatedBalance,
    getShouldShowAggregatedPercentage,
    isPortfolioEnabled,
    totalFiatBalancesCrossEvmChain,
  ]);

  const selectedAccountMultichainBalance = useMemo(() => {
    if (selectedInternalAccount) {
      const accountBalanceData = getAccountBalanceData(selectedInternalAccount);
      return {
        displayBalance: accountBalanceData.displayBalance,
        displayCurrency: currentCurrency,
        totalFiatBalance: accountBalanceData.totalFiatBalance,
        totalNativeTokenBalance: accountBalanceData.totalNativeTokenBalance,
        nativeTokenUnit: accountBalanceData.nativeTokenUnit,
        tokenFiatBalancesCrossChains:
          totalFiatBalancesCrossEvmChain[selectedInternalAccount.address]
            ?.tokenFiatBalancesCrossChains ?? [],
        shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(
          selectedInternalAccount,
        ),
        isPortfolioVieEnabled: isPortfolioEnabled,
        aggregatedBalance: getAggregatedBalance(selectedInternalAccount),
      };
    }
    return undefined;
  }, [
    currentCurrency,
    getAccountBalanceData,
    getAggregatedBalance,
    getShouldShowAggregatedPercentage,
    isPortfolioEnabled,
    selectedInternalAccount,
    totalFiatBalancesCrossEvmChain,
  ]);

  return {
    multichainBalancesForAllAccounts: allAccountBalances,
    selectedAccountMultichainBalance,
  };
};

export default useMultichainBalances;
