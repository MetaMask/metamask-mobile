import {
  CreateNewWallet,
  importWalletWithRecoveryPhrase,
  loginToApp,
} from '../../../viewHelper.ts';
import WalletView from '../../../pages/wallet/WalletView.ts';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet.ts';
import Assertions from '../../../framework/Assertions.ts';
import { RegressionIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../../identity/utils/withIdentityFixtures.ts';
import { UserStorageMockttpController } from '../../identity/utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet.ts';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet.ts';
import { defaultGanacheOptions } from '../../../framework/Constants.ts';
import SettingsView from '../../../pages/Settings/SettingsView.ts';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.ts';
import LoginView from '../../../pages/wallet/LoginView.ts';
import ForgotPasswordModalView from '../../../pages/Common/ForgotPasswordModalView.ts';
import { createUserStorageController } from '../../identity/utils/mocks.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';

describe(RegressionIdentity('Account syncing - Forgot Password Flow'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    sharedUserStorageController = createUserStorageController();
  });

  const NEW_ACCOUNT_NAME = 'Best name ever';
  const SECOND_ACCOUNT_NAME = 'Account 2';

  it('should sync accounts correctly after going through forgot password/reset wallet flow', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        sharedUserStorageController,
      },
      async () => {
        await loginToApp();

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account List Bottom Sheet should be visible',
          },
        );
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
        await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);
        const visibleAccounts = [NEW_ACCOUNT_NAME, SECOND_ACCOUNT_NAME];
        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(accountName),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }
      },
    );

    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        fixture: new FixtureBuilder().withOnboardingFixture().build(),
      },
      async ({ userStorageMockttpController, mockServer }) => {
        await CreateNewWallet();
        await TabBarComponent.tapSettings();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await LoginView.tapForgotPassword();
        await ForgotPasswordModalView.tapResetWalletButton();
        await ForgotPasswordModalView.tapYesResetWalletButton();
        const previousAccountsStorage = sharedUserStorageController.paths.get(
          USER_STORAGE_FEATURE_NAMES.accounts,
        )?.response;

        await userStorageMockttpController.setupPath(
          'accounts_v2',
          mockServer,
          {
            getResponse: previousAccountsStorage,
          },
        );

        await importWalletWithRecoveryPhrase({
          seedPhrase: defaultGanacheOptions.mnemonic,
          fromResetWallet: true,
        });
        await WalletView.tapIdenticon();
        const visibleAccounts = [NEW_ACCOUNT_NAME, SECOND_ACCOUNT_NAME];

        for (const accountName of visibleAccounts) {
          await Assertions.expectTextDisplayed(accountName, {
            description: `Account with name "${accountName}" should be visible`,
          });
        }
      },
    );
  });
});
