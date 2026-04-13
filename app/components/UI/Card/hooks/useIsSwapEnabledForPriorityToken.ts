import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectIsAuthenticatedCard } from '../../../../core/redux/slices/card';
import { cardNetworkInfos } from '../constants';

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
  const solanaAccount = selectSelectedInternalAccount(
    cardNetworkInfos.solana.caipChainId,
  );
  const isAuthenticated = useSelector(selectIsAuthenticatedCard);

  if (!isAuthenticated) {
    // If the user is not authenticated reflects on-chain fetch logic, so we return true to allow swaps
    return true;
  }

  if (!priorityTokenAddress) {
    return false;
  }

  return (
    priorityTokenAddress.toLowerCase() === evmAccount?.address?.toLowerCase() ||
    priorityTokenAddress === solanaAccount?.address
  );
};
