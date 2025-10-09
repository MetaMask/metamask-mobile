import Engine from '../../core/Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';

export class AccountTreeInitService {
  initializeAccountTree = async (): Promise<void> => {
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

    // Forward initial selected accounts.
    await forwardSelectedAccountGroupToSnapKeyring(
      AccountTreeController.getSelectedAccountGroup(),
    );
  };

  clearState = async (): Promise<void> => {
    const { AccountTreeController } = Engine.context;

    AccountTreeController.clearState();
  };
}

export default new AccountTreeInitService();
