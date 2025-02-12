/* eslint-disable arrow-body-style */
import { useSelector } from 'react-redux';
import Engine from '../../../core/Engine';
import { isTestNet, isPortfolioViewEnabled } from '../../../util/networks';
import { renderFiat } from '../../../util/number';
import {
  selectChainId,
  selectIsPopularNetwork,
  selectProviderConfig,
  selectTicker,
} from '../../../selectors/networkController';
import { selectCurrentCurrency } from '../../../selectors/currencyRateController';
import { selectIsTokenNetworkFilterEqualCurrentNetwork } from '../../../selectors/preferencesController';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { getChainIdsToPoll } from '../../../selectors/tokensController';
import { useGetFormattedTokensPerChain } from '../useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../useGetTotalFiatBalanceCrossChains';
import { InternalAccount } from '@metamask/keyring-internal-api';
import useIsOriginalNativeTokenSymbol from '../useIsOriginalNativeTokenSymbol/useIsOriginalNativeTokenSymbol';
import { UseMultichainBalancesHook } from './useMultichainBalances.types';

///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
import {
  selectMultichainIsEvm,
  selectMultichainSelectedAccountCachedBalance,
  selectMultichainDefaultToken,
  selectMultichainShouldShowFiat,
  selectMultichainConversionRate,
} from '../../../selectors/multichain';
///: END:ONLY_INCLUDE_IF

/**
 * Hook to manage portfolio balance data across chains.
 *
 * @returns Portfolio balance data
 */
const useMultichainBalances = (): UseMultichainBalancesHook => {
  // Production selectors (EVM)
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);
  const chainId = useSelector(selectChainId);
  const currentCurrency = useSelector(selectCurrentCurrency);
  const allChainIDs = useSelector(getChainIdsToPoll);
  const isTokenNetworkFilterEqualCurrentNetwork = useSelector(
    selectIsTokenNetworkFilterEqualCurrentNetwork,
  );
  const isPopularNetwork = useSelector(selectIsPopularNetwork);
  const { type } = useSelector(selectProviderConfig);
  const ticker = useSelector(selectTicker);

  // Production hooks (EVM)
  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [selectedInternalAccount as InternalAccount],
    !isTokenNetworkFilterEqualCurrentNetwork && isPopularNetwork,
    allChainIDs,
  );

  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    [selectedInternalAccount as InternalAccount],
    formattedTokensWithBalancesPerChain,
  );

  const isOriginalNativeTokenSymbol = useIsOriginalNativeTokenSymbol(
    chainId,
    ticker,
    type,
  );

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const isEvm = useSelector(selectMultichainIsEvm);
  const multichainSelectedAccountCachedBalance = useSelector(
    selectMultichainSelectedAccountCachedBalance,
  );
  const { symbol } = useSelector(selectMultichainDefaultToken);
  const shouldShowFiat = useSelector(selectMultichainShouldShowFiat);
  const multichainConversionRate = useSelector(selectMultichainConversionRate);
  ///: END:ONLY_INCLUDE_IF

  // Production balance calculation (EVM)
  const getEvmDisplayBalance = () => {
    const balance = Engine.getTotalFiatAccountBalance();
    let total;

    if (isOriginalNativeTokenSymbol) {
      if (isPortfolioViewEnabled()) {
        total =
          totalFiatBalancesCrossChain[
            selectedInternalAccount?.address as string
          ]?.totalFiatBalance ?? 0;
      } else {
        const tokenFiatTotal = balance?.tokenFiat ?? 0;
        const ethFiatTotal = balance?.ethFiat ?? 0;
        total = tokenFiatTotal + ethFiatTotal;
      }
    } else if (isPortfolioViewEnabled()) {
      total =
        totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
          ?.totalTokenFiat ?? 0;
    } else {
      total = balance?.tokenFiat ?? 0;
    }

    return renderFiat(total, currentCurrency);
  };

  ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
  const getMultiChainFiatBalance = (
    nativeTokenBalance: string,
    conversionRate: number,
    currency: string,
  ) => {
    const multichainBalance = Number(nativeTokenBalance);
    const fiatBalance = multichainBalance * conversionRate;
    return renderFiat(fiatBalance, currency);
  };

  const getNonEvmDisplayBalance = () => {
    if (!shouldShowFiat) {
      return `${multichainSelectedAccountCachedBalance} ${symbol}`;
    }
    if (multichainSelectedAccountCachedBalance && multichainConversionRate) {
      return getMultiChainFiatBalance(
        multichainSelectedAccountCachedBalance,
        multichainConversionRate,
        currentCurrency,
      );
    }

    // default to native token symbol
    return `${multichainSelectedAccountCachedBalance} ${symbol}`;
  };
  ///: END:ONLY_INCLUDE_IF

  const getDisplayBalance = () => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    if (!isEvm) {
      return getNonEvmDisplayBalance();
    }
    ///: END:ONLY_INCLUDE_IF
    return getEvmDisplayBalance();
  };

  const getAggregatedBalance = () => {
    const balance = Engine.getTotalFiatAccountBalance();
    return {
      ethFiat: balance?.ethFiat ?? 0,
      tokenFiat: balance?.tokenFiat ?? 0,
      tokenFiat1dAgo: balance?.tokenFiat1dAgo ?? 0,
      ethFiat1dAgo: balance?.ethFiat1dAgo ?? 0,
    };
  };

  const getShouldShowAggregatedPercentage = () => {
    ///: BEGIN:ONLY_INCLUDE_IF(keyring-snaps)
    return !isTestNet(chainId) && isEvm;
    ///: END:ONLY_INCLUDE_IF

    // Note: This code marked as unreachable however when the above block gets removed after code fencing this return becomes necessary
    return !isTestNet(chainId);
  };

  return {
    multichainBalances: {
      displayBalance: getDisplayBalance(),
      tokenFiatBalancesCrossChains:
        totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
          ?.tokenFiatBalancesCrossChains ?? [],
      totalFiatBalance:
        totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
          ?.totalFiatBalance ?? 0,
      totalTokenFiat:
        totalFiatBalancesCrossChain[selectedInternalAccount?.address as string]
          ?.totalTokenFiat ?? 0,
      shouldShowAggregatedPercentage: getShouldShowAggregatedPercentage(),
      isPortfolioVieEnabled: isPortfolioViewEnabled(),
      aggregatedBalance: getAggregatedBalance(),
    },
  };
};

export default useMultichainBalances;
