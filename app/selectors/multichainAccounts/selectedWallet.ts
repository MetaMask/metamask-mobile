import type { AccountWalletId } from '@metamask/account-api';
import type { RootState } from '../../reducers';

/**
 * Returns the wallet ID shared by the currently selected account group.
 *
 * Account groups for different chains can contain different selected
 * accounts, but the wallet ID before the slash remains stable across them.
 */
export const selectSelectedAccountWalletId = (
  state: RootState,
): AccountWalletId | null => {
  const selectedAccountGroup =
    state?.engine?.backgroundState?.AccountTreeController?.selectedAccountGroup;

  if (!selectedAccountGroup) {
    return null;
  }

  return selectedAccountGroup.split('/')[0] as AccountWalletId;
};
