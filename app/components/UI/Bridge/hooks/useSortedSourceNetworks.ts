import { useCallback, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  selectEnabledSourceChains,
} from '../../../../core/redux/slices/bridge';
import { useGetFormattedTokensPerChain } from '../../../hooks/useGetFormattedTokensPerChain';
import { useGetTotalFiatBalanceCrossChains } from '../../../hooks/useGetTotalFiatBalanceCrossChains';
import { selectLastSelectedEvmAccount, selectLastSelectedSolanaAccount } from '../../../../selectors/accountsController';
import { InternalAccount } from '@metamask/keyring-internal-api';
import { isSolanaChainId } from '@metamask/bridge-controller';
import { useTokensWithBalance } from './useTokensWithBalance';
import { SolScope } from '@metamask/keyring-api';

export const useSortedSourceNetworks = () => {
  const enabledSourceChains = useSelector(selectEnabledSourceChains);

  // Calculate total fiat value per EVM chain (native + tokens)
  const enabledEvmSourceChainIds = enabledSourceChains
    .map((chain) => chain.chainId)
    .filter((chainId) => !isSolanaChainId(chainId));

  const lastSelectedEvmAccount = useSelector(selectLastSelectedEvmAccount);

  const evmFormattedTokensWithBalancesPerChain = useGetFormattedTokensPerChain(
    [lastSelectedEvmAccount as InternalAccount],
    true,
    enabledEvmSourceChainIds,
  );
  const evmTotalFiatBalancesCrossChain = useGetTotalFiatBalanceCrossChains(
    [lastSelectedEvmAccount as InternalAccount],
    evmFormattedTokensWithBalancesPerChain,
  );

  const evmAddress = lastSelectedEvmAccount?.address;

  const getEvmChainTotalFiatValue = useCallback((chainId: string) => {
    if (!evmAddress || !evmTotalFiatBalancesCrossChain[evmAddress]) return 0;

    const chainData = evmTotalFiatBalancesCrossChain[evmAddress].tokenFiatBalancesCrossChains.find(
      (chain) => chain.chainId === chainId
    );

    if (!chainData) return 0;

    // Sum native value and all token values
    const tokenFiatSum = chainData.tokenFiatBalances.reduce((sum, value) => sum + value, 0);
    return chainData.nativeFiatValue + tokenFiatSum;
  }, [evmAddress, evmTotalFiatBalancesCrossChain]);
  
  // Calculate total fiat value per Solana chain (native + tokens)
  const solTokensWithBalance = useTokensWithBalance({
    chainIds: [SolScope.Mainnet],
  });
  const solFiatTotal = solTokensWithBalance.reduce(
    (sum, token) => sum + (token.tokenFiatAmount ?? 0)
  , 0);

  // Sort networks by total fiat value in descending order
  const sortedSourceNetworks = useMemo(() =>
    enabledSourceChains.map(chain => {
      const totalFiatValue = chain.chainId === SolScope.Mainnet 
        ? solFiatTotal 
        : getEvmChainTotalFiatValue(chain.chainId);

      return {
        ...chain,
        totalFiatValue,
      };
    }).sort((a, b) => b.totalFiatValue - a.totalFiatValue)
  , [enabledSourceChains, getEvmChainTotalFiatValue]);

  return {
    sortedSourceNetworks,
  };
};
