import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { SOLANA_MAINNET } from '../../Ramp/Deposit/constants/networks';

/**
 * Checks if the priority token address is the same as the selected internal account address.
 * This is a solution for the edge case where the user it's on a different account than the priority token address.
 * Swap currently doesn't support swapping between different accounts.
 * @param priorityTokenAddress - The priority token address to check.
 * @returns True if the priority token address is the same as the selected internal account address, false otherwise.
 */
export const useIsSwapEnabledForPriorityToken = (
  priorityTokenAddress: string | undefined,
) => {
  const selectSelectedInternalAccount = useSelector(
    selectSelectedInternalAccountByScope,
  );
  const evmAccount = selectSelectedInternalAccount('eip155:0');
  const solanaAccount = selectSelectedInternalAccount(SOLANA_MAINNET.chainId);

  return (
    priorityTokenAddress?.toLowerCase() ===
      evmAccount?.address?.toLowerCase() ||
    priorityTokenAddress === solanaAccount?.address
  );
};
