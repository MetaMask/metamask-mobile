import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectProviderConfig,
  selectEvmTicker,
  selectEvmChainId,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectInternalAccounts } from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import {
  useGetTotalFiatBalanceCrossChains,
  TotalFiatBalancesCrossChains,
} from '../useGetTotalFiatBalanceCrossChains';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import {
  MultichainBalancesData,
  UseAllAccountsMultichainBalancesHook,
} from './useMultichainBalances.types';
import {
  getAccountBalanceData,
  getAggregatedBalance,
  getShouldShowAggregatedPercentage,
} from './utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { isPortfolioViewEnabled } from '../../../util/networks';
import { InternalAccount } from '@metamask/keyring-internal-api';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainShouldShowFiat,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain';
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
import {
  MultichainAssetsControllerState,
  MultichainAssetsRatesControllerState,
  MultichainBalancesControllerState,
} from '@metamask/assets-controllers';
///: END:ONLY_INCLUDE_IF

/** Pure helper that does the heavy lifting. */
const computeBalances = async (
  accountsList: InternalAccount[],
  chainId: string,
  currentCurrency: string,
  totalFiatBalancesCrossEvmChain: TotalFiatBalancesCrossChains,
  isOriginalNativeEvmTokenSymbol: boolean,
  isPortfolioEnabled: boolean,
  /* snaps-only args ↓ */
  multichainBalances: MultichainBalancesControllerState['balances'],
  multichainAssets: MultichainAssetsControllerState['accountsAssets'],
  multichainAssetsRates: MultichainAssetsRatesControllerState['conversionRates'],
  nonEvmChainId: SupportedCaipChainId,
  shouldShowFiat: boolean,
) => {
  const result: Record<string, MultichainBalancesData> = {};

  for (const account of accountsList) {
    // Await here only if getAccountBalanceData becomes async.
    const accountBalanceData = await getAccountBalanceData(
      account,
      currentCurrency,
      totalFiatBalancesCrossEvmChain,
      isOriginalNativeEvmTokenSymbol,
      multichainBalances,
      multichainAssets,
      multichainAssetsRates,
      nonEvmChainId,
      shouldShowFiat,
    );

    result[account.id] = {
      displayBalance: accountBalanceData.displayBalance,
      displayCurrency: currentCurrency,
      totalFiatBalance: accountBalanceData.totalFiatBalance,
      totalNativeTokenBalance: accountBalanceData.totalNativeTokenBalance,
      nativeTokenUnit: accountBalanceData.nativeTokenUnit,
      tokenFiatBalancesCrossChains:
        totalFiatBalancesCrossEvmChain[account.address]
          ?.tokenFiatBalancesCrossChains ?? [],
      shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(
        chainId as SupportedCaipChainId,
      ),
      isPortfolioVieEnabled: isPortfolioEnabled,
      aggregatedBalance: getAggregatedBalance(account),
      isLoadingAccount:
        accountBalanceData.totalNativeTokenBalance === undefined,
    };
  }

  return result;
};

/** Async-ready version of the hook. */
const useMultichainBalancesForAllAccountsAsync =
  (): UseAllAccountsMultichainBalancesHook => {
    /* ══════════════ Redux selectors ══════════════ */
    const accountsList = useSelector(selectInternalAccounts);
    const chainId = useSelector(selectChainId);
    const evmChainId = useSelector(selectEvmChainId);
    const currentCurrency = useSelector(selectCurrentCurrency);
    const allChainIDs = useSelector(getChainIdsToPoll);
    const { type } = useSelector(selectProviderConfig);
    const ticker = useSelector(selectEvmTicker);

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
    const multichainBalances = useSelector(selectMultichainBalances);
    const multichainAssets = useSelector(selectMultichainAssets);
    const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
    const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
    ///: END:ONLY_INCLUDE_IF

    /* ══════════════ Derived hooks ══════════════ */
    const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
      accountsList,
      true,
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

    const isPortfolioEnabled = isPortfolioViewEnabled();

    /* ══════════════ Async state ══════════════ */
    const [balancesByAccount, setBalancesByAccount] = useState<
      Record<string, MultichainBalancesData>
    >({});

    /* ══════════════ Main effect ══════════════ */
    const refresh = useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const balances = await computeBalances(
            accountsList,
            chainId,
            currentCurrency,
            totalFiatBalancesCrossEvmChain,
            isOriginalNativeEvmTokenSymbol,
            isPortfolioEnabled,
            multichainBalances,
            multichainAssets,
            multichainAssetsRates,
            nonEvmChainId,
            shouldShowFiat,
          );
          if (!cancelled) setBalancesByAccount(balances);
        } catch (error) {
          // Handle error if needed
          console.error('Error computing balances:', error);
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [
      accountsList,
      chainId,
      currentCurrency,
      totalFiatBalancesCrossEvmChain,
      isOriginalNativeEvmTokenSymbol,
      isPortfolioEnabled,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      multichainBalances,
      multichainAssets,
      multichainAssetsRates,
      nonEvmChainId,
      shouldShowFiat,
      ///: END:ONLY_INCLUDE_IF
    ]);

    /* Run once on mount & whenever dependencies change */
    useEffect(() => {
      const cancel = refresh();
      return cancel;
    }, [refresh]);

    /* ══════════════ Hook return ══════════════ */
    return {
      multichainBalancesForAllAccounts: balancesByAccount,
    };
  };

export default useMultichainBalancesForAllAccountsAsync;
