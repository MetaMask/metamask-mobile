import { AccountGroupId } from '@metamask/account-api';
import Engine from '../../core/Engine';

export class AccountTreeInitService {
  #initializedOnce: boolean = false;

  initializeAccountTree = async (): Promise<void> => {
    const messenger = Engine.controllerMessenger;
    const { AccountTreeController, AccountsController } = Engine.context;

    await AccountsController.updateAccounts();
    AccountTreeController.init();

    // READ THIS CAREFULLY:
    // ----------------------------------------------------------------------------------
    // Those events should be moved to the Snap keyring package and rely on the messaging
    // system to subsribe to events and use actions to get the currently selected
    // accounts from the tree.
    //
    // Though, we decided to do it at client-level for simplicity and because it's a
    // change that needed to be cherry-picked in the 7.57.
    //
    // This will be addresses in later releases.
    if (!this.#initializedOnce) {
      // We need the `#initializedOnce` to avoid registering the event subscriptions multiple
      // times.
      const snapKeyring = await Engine.getSnapKeyring();

      const forwardSelectedAccountsToSnapKeyring = (groupId: AccountGroupId | '') => {
        if (groupId) {
          const group = AccountTreeController.getAccountGroupObject(groupId);
          if (group) {
            console.log('-- SnapKeyring.setSelectedAccounts', group.accounts);
            //snapKeyring.setSelectedAccounts(group.accounts);
          }
        }
      };

      // Forward initial selected accounts.
      forwardSelectedAccountsToSnapKeyring(AccountTreeController.state.accountTree.selectedAccountGroup);

      // Forward selected accounts every time the selected account group changes.
      messenger.subscribe('AccountTreeController:selectedAccountGroupChange', forwardSelectedAccountsToSnapKeyring);
    }

    this.#initializedOnce = true;
  };

  clearState = async (): Promise<void> => {
    const { AccountTreeController } = Engine.context;

    AccountTreeController.clearState();
  };
}

export default new AccountTreeInitService();
