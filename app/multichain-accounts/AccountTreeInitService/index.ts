import Engine from '../../core/Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';

export class AccountTreeInitService {
  initializeAccountTree = async (): Promise<void> => {
    const {
      AccountTreeController,
      AccountsController,
      MoneyAccountController,
    } = Engine.context;

    await AccountsController.updateAccounts();

    AccountTreeController.init();

    // Money accounts are not part of the account-tree nor the accounts controller, so
    // we need to initialize them separately.
    await MoneyAccountController.init();

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
