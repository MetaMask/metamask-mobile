import { useSelector } from 'react-redux';
import { selectSelectedInternalAccountByScope } from '../../../../selectors/multichainAccounts/accounts';
import { selectIsCardAuthenticated } from '../../../../selectors/cardController';
import { getMemoizedInternalAccountByAddress } from '../../../../selectors/accountsController';
import { cardNetworkInfos } from '../constants';
import type { RootState } from '../../../../reducers';

/**
 * Checks whether the "Add funds" swap flow should be enabled for the
 * card's priority token address.
 *
 * Enabled when:
 * - The user is not card-authenticated (on-chain flow), OR
 * - The priority token address matches the currently selected account, OR
 * - The priority token address belongs to another account owned by the user
 * (the caller is responsible for switching before navigating).
 *
 * @param priorityTokenAddress - The wallet address linked to the card's priority funding asset.
 * @returns True if swaps should be enabled, false otherwise.
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
  const isAuthenticated = useSelector(selectIsCardAuthenticated);
  const ownedAccount = useSelector((state: RootState) =>
    priorityTokenAddress
      ? getMemoizedInternalAccountByAddress(state, priorityTokenAddress)
      : undefined,
  );

  if (!isAuthenticated) {
    return true;
  }

  if (!priorityTokenAddress) {
    return false;
  }

  const isSelectedAccount =
    priorityTokenAddress.toLowerCase() === evmAccount?.address?.toLowerCase() ||
    priorityTokenAddress === solanaAccount?.address;

  return isSelectedAccount || !!ownedAccount;
};
