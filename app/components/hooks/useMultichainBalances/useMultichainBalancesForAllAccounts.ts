import { useSelector } from 'react-redux';
import { isPortfolioViewEnabled } from '../../../util/networks';
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
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import {
  MultichainBalancesData,
  UseAllAccountsMultichainBalancesHook,
} from './useMultichainBalances.types';
///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainShouldShowFiat,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF
import { useMemo } from 'react';
import {
  getAccountBalanceData,
  getAggregatedBalance,
  getShouldShowAggregatedPercentage,
} from './utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalancesForAllAccounts =
  (): UseAllAccountsMultichainBalancesHook => {
    const accountsList = useSelector(selectInternalAccounts);
    const chainId = useSelector(selectChainId);
    const evmChainId = useSelector(selectEvmChainId);
    const currentCurrency = useSelector(selectCurrentCurrency);
    const allChainIDs = useSelector(getChainIdsToPoll);
    const { type } = useSelector(selectProviderConfig);
    const ticker = useSelector(selectEvmTicker);

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

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
    const multichainBalances = useSelector(selectMultichainBalances);
    const multichainAssets = useSelector(selectMultichainAssets);
    const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
    ///: END:ONLY_INCLUDE_IF

    const isPortfolioEnabled = isPortfolioViewEnabled();

    // Create a stable reference for each account's balance data
    const allAccountBalances = useMemo(() => {
      const result: Record<string, MultichainBalancesData> = {};

      for (const account of accountsList) {
        const accountBalanceData = getAccountBalanceData(
          account,
          currentCurrency,
          totalFiatBalancesCrossEvmChain,
          isOriginalNativeEvmTokenSymbol,
          ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
          multichainBalances,
          multichainAssets,
          multichainAssetsRates,
          shouldShowFiat,
          ///: END:ONLY_INCLUDE_IF
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
          // if the totalNativeTokenBalance is undefined, it means that the account is loading
          isLoadingAccount:
            accountBalanceData.totalNativeTokenBalance === undefined,
        };
      }

      return result;
    }, [
      accountsList,
      chainId,
      currentCurrency,
      isOriginalNativeEvmTokenSymbol,
      isPortfolioEnabled,
      totalFiatBalancesCrossEvmChain,
      ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      shouldShowFiat,
      ///: END:ONLY_INCLUDE_IF
    ]);
    return {
      multichainBalancesForAllAccounts: allAccountBalances,
    };
  };

export default useMultichainBalancesForAllAccounts;
