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

  // This logic should be moved to the Snap keyring package and rely on the messaging
  // system to subscribe to events and use actions to get the currently selected
  // accounts from the tree.
  //
  // Though, we decided to do it at client-level for simplicity and because it's a
  // change that needed to be cherry-picked in the 7.57.
  //
  // This will be addressed in later releases.

  if (groupId) {
    const group = AccountTreeController.getAccountGroupObject(groupId);
    if (group) {
      const snapKeyring = await Engine.getSnapKeyring();
      snapKeyring.setSelectedAccounts(group.accounts);
    }
  }
}
