import { useSelector } from 'react-redux';
import {
  selectChainId,
  selectProviderConfig,
  selectEvmTicker,
  selectEvmChainId,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { UseSelectedAccountMultichainBalancesHook } from './useMultichainBalances.types';
import {
  selectMultichainShouldShowFiat,
  selectMultichainBalances,
  selectMultichainAssets,
  selectMultichainAssetsRates,
} from '../../../selectors/multichain';
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

    const enabledChains = useSelector(selectEVMEnabledNetworks);

    const { type } = useSelector(selectProviderConfig);
    const ticker = useSelector(selectEvmTicker);

    const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
      [selectedInternalAccount as InternalAccount],
      true,
      enabledChains,
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

    const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
    const multichainBalances = useSelector(selectMultichainBalances);
    const multichainAssets = useSelector(selectMultichainAssets);
    const multichainAssetsRates = useSelector(selectMultichainAssetsRates);

    const selectedAccountMultichainBalance = useMemo(() => {
      if (selectedInternalAccount && isOriginalNativeEvmTokenSymbol !== null) {
        const accountBalanceData = getAccountBalanceData(
          selectedInternalAccount,
          currentCurrency,
          totalFiatBalancesCrossEvmChain,
          isOriginalNativeEvmTokenSymbol,
          multichainBalances,
          multichainAssets,
          multichainAssetsRates,
          shouldShowFiat,
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
          isPortfolioViewEnabled: true,
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
      totalFiatBalancesCrossEvmChain,
      multichainAssets,
      multichainAssetsRates,
      multichainBalances,
      shouldShowFiat,
    ]);
    return {
      selectedAccountMultichainBalance,
    };
  };

export default useSelectedAccountMultichainBalances;
