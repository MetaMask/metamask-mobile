import { useSelector } from 'react-redux';
import {
  isPortfolioViewEnabled,
  isRemoveGlobalNetworkSelectorEnabled,
} from '../../../util/networks';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectEvmTicker,
  selectEvmChainId,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../../../selectors/preferencesController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { UseSelectedAccountMultichainBalancesHook } from './useMultichainBalances.types';
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
import { selectEVMEnabledNetworks } from '../../../selectors/networkEnablementController';
import { SupportedCaipChainId } from '@metamask/multichain-network-controller';
/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useSelectedAccountMultichainBalances =
  (): UseSelectedAccountMultichainBalancesHook => {
    const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
    const chainId = useSelector(selectChainId);
    const evmChainId = useSelector(selectEvmChainId);
    const currentCurrency = useSelector(selectCurrentCurrency);
    const allChainIDs = useSelector(getChainIdsToPoll);

    const enabledChains = useSelector(selectEVMEnabledNetworks);
    const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
      selectIsTokenNetworkFilterEqualCurrentNetwork,
    );
    const isPopularNetwork = useSelector(selectIsPopularNetwork);
    const { type } = useSelector(selectProviderConfig);
    const ticker = useSelector(selectEvmTicker);

    const shouldAggregateAcrossChains = isRemoveGlobalNetworkSelectorEnabled()
      ? true
      : !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork;

    const chainsToAggregateAcross = isRemoveGlobalNetworkSelectorEnabled()
      ? enabledChains
      : allChainIDs;

    const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
      [selectedInternalAccount as InternalAccount],
      shouldAggregateAcrossChains,
      chainsToAggregateAcross,
    );

    const totalFiatBalancesCrossEvmChain = useGetTotalFiatBalanceCrossChains(
      [selectedInternalAccount as InternalAccount],
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

    const selectedAccountMultichainBalance = useMemo(() => {
      if (selectedInternalAccount) {
        const accountBalanceData = getAccountBalanceData(
          selectedInternalAccount,
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
            chainId as SupportedCaipChainId,
          ),
          isPortfolioVieEnabled: isPortfolioEnabled,
          aggregatedBalance: getAggregatedBalance(selectedInternalAccount),
          isLoadingAccount:
            accountBalanceData.totalNativeTokenBalance === undefined,
        };
      }
      return undefined;
    }, [
      selectedInternalAccount,
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
      selectedAccountMultichainBalance,
    };
  };

export default useSelectedAccountMultichainBalances;
