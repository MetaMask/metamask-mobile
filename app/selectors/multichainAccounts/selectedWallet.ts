import {
  parseAccountGroupId,
  type AccountWalletId,
} from '@metamask/account-api';
import type { RootState } from '../../reducers';

/**
 * Returns the wallet ID shared by the currently selected account group.
 *
 * Account groups for different chains can contain different selected
 * accounts, and the parser preserves wallet IDs that contain slashes.
 */
export const selectSelectedAccountWalletId = (
  state: RootState,
): AccountWalletId | null => {
  const selectedAccountGroup =
    state?.engine?.backgroundState?.AccountTreeController?.selectedAccountGroup;

  if (!selectedAccountGroup) {
    return null;
  }

  const {
    wallet: { id: walletId },
  } = parseAccountGroupId(selectedAccountGroup);

  return walletId as AccountWalletId;
};
