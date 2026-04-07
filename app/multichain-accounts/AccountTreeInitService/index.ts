import Engine from '../../core/Engine';
import { forwardSelectedAccountGroupToSnapKeyring } from '../../core/SnapKeyring/utils/forwardSelectedAccountGroupToSnapKeyring';
import { isMoneyAccountEnabled } from '../../lib/Money/feature-flags';

export class AccountTreeInitService {
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

    // Forward initial selected accounts.
    await forwardSelectedAccountGroupToSnapKeyring(
      AccountTreeController.getSelectedAccountGroup(),
    );
  };

  clearState = async (): Promise<void> => {
    const {
      AccountTreeController,
      MoneyAccountController,
      RemoteFeatureFlagController,
    } = Engine.context;
    const { remoteFeatureFlags } = RemoteFeatureFlagController.state;

    AccountTreeController.clearState();

    if (isMoneyAccountEnabled(remoteFeatureFlags)) {
      MoneyAccountController.clearState();
    }
  };
}

export default new AccountTreeInitService();
