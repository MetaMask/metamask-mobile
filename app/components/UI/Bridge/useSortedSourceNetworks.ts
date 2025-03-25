import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectEnabledSourceChains,
} from '../../../core/redux/slices/bridge';
import { useGetFormattedTokensPerChain } from '../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../hooks/useGetTotalFiatBalanceCrossChains';
import { selectSelectedInternalAccount } from '../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';

export const useSortedSourceNetworks = () => {
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = enabledSourceChains.map((chain) => chain.chainId);
  const selectedInternalAccount = useSelector(selectSelectedInternalAccount);

  const formattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [selectedInternalAccount as InternalAccount],
    true,
    enabledSourceChainIds,
  );
  const totalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    [selectedInternalAccount as InternalAccount],
    formattedTokensWithBalancesPerChain,
  );

  const address = selectedInternalAccount?.address;
  // Calculate total fiat value per chain (native + tokens)
  const getChainTotalFiatValue = useCallback((chainId: string) => {
    if (!address || !totalFiatBalancesCrossChain[address]) return 0;

    const chainData = totalFiatBalancesCrossChain[address].tokenFiatBalancesCrossChains.find(
      (chain) => chain.chainId === chainId
    );

    if (!chainData) return 0;

    // Sum native value and all token values
    const tokenFiatSum = chainData.tokenFiatBalances.reduce((sum, value) => sum + value, 0);
    return chainData.nativeFiatValue + tokenFiatSum;
  }, [address, totalFiatBalancesCrossChain]);

  // Sort networks by total fiat value in descending order
  const sortedSourceNetworks = useMemo(() =>
    [...enabledSourceChains].sort((a, b) => {
      const valueA = getChainTotalFiatValue(a.chainId);
      const valueB = getChainTotalFiatValue(b.chainId);
      return valueB - valueA; // Descending order
    })
  , [enabledSourceChains, getChainTotalFiatValue]);

  return {
    sortedSourceNetworks,
  };
};
