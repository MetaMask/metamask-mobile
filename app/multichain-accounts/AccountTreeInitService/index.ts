import { Json } from '@metamask/utils';
import {
  assertMultichainAccountsFeatureFlagType,
  isMultichainAccountsFeatureEnabled,
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1,
  MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
  MultichainAccountsFeatureFlag,
} from '../../selectors/featureFlagController/multichainAccounts/enabledMultichainAccounts';
import Engine from '../../core/Engine';

export class AccountTreeInitService {
  initializeAccountTree = async (): Promise<void> => {
    const { AccountTreeController, AccountsController } = Engine.context;
    const enableMultichainAccounts = {
      enabled: true,
      featureVersion: MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
      minimumVersion: '0.0.0',
    };

    if (!assertMultichainAccountsFeatureFlagType(enableMultichainAccounts)) {
      return;
    }
    const isMultichainAccountsEnabled =
      this.isMultichainAccountsEnabledForState1(enableMultichainAccounts);

    if (isMultichainAccountsEnabled) {
      await AccountsController.updateAccounts();
      AccountTreeController.init();
    }
  };

  private isMultichainAccountsEnabledForState1 = (
    remoteFeatureFlags: Json & MultichainAccountsFeatureFlag,
  ) =>
    [
      MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_1,
      MULTI_CHAIN_ACCOUNTS_FEATURE_VERSION_2,
    ].some((featureVersion) =>
      isMultichainAccountsFeatureEnabled(remoteFeatureFlags, featureVersion),
    );
}

export default new AccountTreeInitService();
