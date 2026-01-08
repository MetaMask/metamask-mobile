import { useSelector } from 'react-redux';
import { useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { selectContractBalancesPerChainId } from '../../../../selectors/tokenBalancesController';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { toChecksumAddress } from '../../../../util/address';

/**
 * Hook to check if the user has any MUSD token balance across supported chains.
 * @returns Object containing hasAnyMusdBalance boolean and balancesByChain for detailed balance info
 */
export const useMusdBalance = () => {
  const balancesPerChainId = useSelector(selectContractBalancesPerChainId);

  const { hasMusdBalanceOnAnyChain, balancesByChain } = useMemo(() => {
    const result: Record<Hex, string> = {};
    let hasBalance = false;

    for (const [chainId, tokenAddress] of Object.entries(
      MUSD_TOKEN_ADDRESS_BY_CHAIN,
    )) {
      const chainBalances = balancesPerChainId[chainId as Hex];

      if (!chainBalances) continue;

      // MUSD token addresses are lowercase in the constant, but balances might be checksummed
      const normalizedTokenAddress = toChecksumAddress(tokenAddress as Hex);
      const balance =
        chainBalances[normalizedTokenAddress] ||
        chainBalances[tokenAddress as Hex];

      if (balance && balance !== '0x0') {
        result[chainId as Hex] = balance;
        hasBalance = true;
      }
    }

    return {
      hasMusdBalanceOnAnyChain: hasBalance,
      balancesByChain: result,
    };
  }, [balancesPerChainId]);

  const hasMusdBalanceOnChain = (chainId: Hex) =>
    Boolean(balancesByChain[chainId]);

  return {
    hasMusdBalanceOnAnyChain,
    balancesByChain,
    hasMusdBalanceOnChain,
  };
};
