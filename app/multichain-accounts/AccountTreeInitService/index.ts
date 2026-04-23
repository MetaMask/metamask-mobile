import Engine from '../../core/Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { isMoneyAccountEnabled } from '../../lib/Money/feature-flags';

export class AccountTreeInitService {
  #moneyAccountInitSubscribed = false;

  initializeAccountTree = async (): Promise<void> => {
    const {
      AccountTreeController,
      AccountsController,
      MoneyAccountController,
      RemoteFeatureFlagController,
    } = Engine.context;
    const { remoteFeatureFlags } = RemoteFeatureFlagController.state;

    await AccountsController.updateAccounts();

    AccountTreeController.init();

    // Money accounts are not part of the account-tree nor the accounts controller, so
    // we need to initialize them separately.
    if (isMoneyAccountEnabled(remoteFeatureFlags)) {
      await MoneyAccountController.init();
    }

    // Remote flags may be empty on first init and populate once fetched;
    // re-check so MoneyAccountController.init() runs when the flag becomes enabled.
    if (!this.#moneyAccountInitSubscribed) {
      this.#moneyAccountInitSubscribed = true;

      Engine.controllerMessenger.subscribe(
        'RemoteFeatureFlagController:stateChange',
        ({ remoteFeatureFlags: newRemoteFeatureFlags }) => {
          if (isMoneyAccountEnabled(newRemoteFeatureFlags)) {
            // This call is idempotent, so it will not cause issues if the controller is
            // already initialized.
            MoneyAccountController.init();
          }
        },
      );
    }

    // Forward initial selected accounts.
    await forwardSelectedAccountGroupToSnapKeyring(
      AccountTreeController.getSelectedAccountGroup(),
    );
  };

  clearState = async (): Promise<void> => {
    const { AccountTreeController, MoneyAccountController } = Engine.context;

    AccountTreeController.clearState();
    MoneyAccountController.clearState();
  };
}

export default new AccountTreeInitService();
