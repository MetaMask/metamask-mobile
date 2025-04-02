import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectEnabledSourceChains,
} from '../../../../core/redux/slices/bridge';
import { useGetFormattedTokensPerChain } from '../../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../../hooks/useGetTotalFiatBalanceCrossChains';
import { selectLastSelectedEvmAccount } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';

export const useSortedSourceNetworks = () => {
  const enabledSourceChains = useSelector(selectEnabledSourceChains);
  const enabledSourceChainIds = enabledSourceChains.map((chain) => chain.chainId);

  const lastSelectedEvmAccount = useSelector(selectLastSelectedEvmAccount);

  const evmFormattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [lastSelectedEvmAccount as InternalAccount],
    true,
    enabledSourceChainIds,
  );
  const evmTotalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    [lastSelectedEvmAccount as InternalAccount],
    evmFormattedTokensWithBalancesPerChain,
  );

  const address = lastSelectedEvmAccount?.address;
  // Calculate total fiat value per chain (native + tokens)
  const getEvmChainTotalFiatValue = useCallback((chainId: string) => {
    if (!address || !evmTotalFiatBalancesCrossChain[address]) return 0;

    const chainData = evmTotalFiatBalancesCrossChain[address].tokenFiatBalancesCrossChains.find(
      (chain) => chain.chainId === chainId
    );

    if (!chainData) return 0;

    // Sum native value and all token values
    const tokenFiatSum = chainData.tokenFiatBalances.reduce((sum, value) => sum + value, 0);
    return chainData.nativeFiatValue + tokenFiatSum;
  }, [address, evmTotalFiatBalancesCrossChain]);

  // Sort networks by total fiat value in descending order
  const sortedSourceNetworks = useMemo(() =>
    enabledSourceChains.map(chain => ({
      ...chain,
      totalFiatValue: getEvmChainTotalFiatValue(chain.chainId)
    })).sort((a, b) => b.totalFiatValue - a.totalFiatValue)
  , [enabledSourceChains, getEvmChainTotalFiatValue]);

  return {
    sortedSourceNetworks,
  };
};
