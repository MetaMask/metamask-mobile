import { AccountGroupId } from '@metamask/account-api';
import Engine from '../../Engine';

/**
 * Forward currently selected account group to the Snap keyring.
 *
 * @param groupId - Currently selected account group.
 */
export async function forwardSelectedAccountGroupToSnapKeyring(
  groupId: AccountGroupId | '',
) {
  const { AccountTreeController } = Engine.context;

  if (groupId) {
    const group = AccountTreeController.getAccountGroupObject(groupId);
    if (group) {
      const snapKeyring = await Engine.getSnapKeyring();
      snapKeyring.setSelectedAccounts(group.accounts);
    }
  }
}
