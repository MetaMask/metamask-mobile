import { useSelector } from 'react-redux';
import { useCallback, useMemo } from 'react';
import { Hex } from '@metamask/utils';
import { selectTokensBalances } from '../../../../selectors/tokenBalancesController';
import { MUSD_TOKEN_ADDRESS_BY_CHAIN } from '../constants/musd';
import { toChecksumAddress } from '../../../../util/address';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { EVM_SCOPE } from '../constants/networks';
import { RootState } from '../../../../reducers';

/**
 * Hook to check if the user has any MUSD token balance across supported chains.
 * @returns Object containing hasAnyMusdBalance boolean and balancesByChain for detailed balance info
 */
export const useMusdBalance = () => {
  const selectedEvmAddress = useSelector(
    (state: RootState) =>
      selectSelectedInternalAccountByScope(state)(EVM_SCOPE)?.address,
  );

  const tokenBalances = useSelector(selectTokensBalances);

  const balancesPerChainId = useMemo(
    () =>
      selectedEvmAddress
        ? (tokenBalances?.[selectedEvmAddress as Hex] ?? {})
        : {},
    [selectedEvmAddress, tokenBalances],
  );

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

  const hasMusdBalanceOnChain = useCallback(
    (chainId: Hex) => Boolean(balancesByChain[chainId]),
    [balancesByChain],
  );

  return {
    hasMusdBalanceOnAnyChain,
    balancesByChain,
    hasMusdBalanceOnChain,
  };
};
