import { useSelector } from 'react-redux';
import { isPortfolioViewEnabled } from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectEvmTicker,
  selectEvmChainId,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork, selectTokenNetworkFilter } from '../../../selectors/preferencesController';
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
import { selectSelectedNonEvmNetworkChainId } from '../../../selectors/multichainNetworkController';
///: END:ONLY_INCLUDE_IF
import { useMemo } from 'react';
import {
  getAccountBalanceData,
  getAggregatedBalance,
  getShouldShowAggregatedPercentage,
} from './utils';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
import { CHAIN_IDS } from '@metamask/transaction-controller';
import { PopularList } from '../../../util/networks/customNetworks';
/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalancesForAllAccounts =
  (_chainId): UseAllAccountsMultichainBalancesHook => {
    const accountsList = useSelector(selectInternalAccounts);
    const chainId = _chainId || useSelector(selectChainId);
    const evmChainId = _chainId || useSelector(selectEvmChainId);
    const currentCurrency = useSelector(selectCurrentCurrency);
    const allChainIDs = useSelector(getChainIdsToPoll);
    const tokenNetworkFilter = useSelector(
      selectTokenNetworkFilter,
    );
    const isTokenNetworkFilterEqualCurrentNetwork =
      Object.keys(tokenNetworkFilter).length === 1 &&
      Object.keys(tokenNetworkFilter)[0] === chainId

    const isPopularNetwork =
      chainId === CHAIN_IDS.MAINNET ||
      chainId === CHAIN_IDS.LINEA_MAINNET ||
      PopularList.some((network) => network.chainId === chainId)

    console.log({isTokenNetworkFilterEqualCurrentNetwork, isPopularNetwork})

    const { type } = useSelector(selectProviderConfig);
    const ticker = useSelector(selectEvmTicker);

    const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
      accountsList,
      !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
      allChainIDs,
      chainId
    );

    console.log({formattedTokensWithBalancesPerChain})

    const totalFiatBalancesCrossEvmChain = useGetTotalFiatBalanceCrossChains(
      accountsList,
      formattedTokensWithBalancesPerChain,
    );

    const isOriginalNativeEvmTokenSymbol = useIsOriginalNativeTokenSymbol(
      evmChainId,
      ticker,
      type,
    );

    console.log('useMultichainBalancesForAllAccounts', {chainId, evmChainId})

    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
    const multichainBalances = useSelector(selectMultichainBalances);
    const multichainAssets = useSelector(selectMultichainAssets);
    const multichainAssetsRates = useSelector(selectMultichainAssetsRates);
    const nonEvmChainId = useSelector(selectSelectedNonEvmNetworkChainId);
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
          nonEvmChainId,
          shouldShowFiat,
          ///: END:ONLY_INCLUDE_IF
          chainId,
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
      nonEvmChainId,
      shouldShowFiat,
      ///: END:ONLY_INCLUDE_IF
    ]);
    return {
      multichainBalancesForAllAccounts: allAccountBalances,
    };
  };

export default useMultichainBalancesForAllAccounts;
