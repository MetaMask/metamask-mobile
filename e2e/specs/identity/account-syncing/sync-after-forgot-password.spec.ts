import {
  CreateNewWallet,
  importWalletWithRecoveryPhrase,
  loginToApp,
} from '../../../viewHelper';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { RegressionIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../utils/withIdentityFixtures.ts';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import { defaultGanacheOptions } from '../../../framework/Constants';
import SettingsView from '../../../pages/Settings/SettingsView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import LoginView from '../../../pages/wallet/LoginView';
import ForgotPasswordModalView from '../../../pages/Common/ForgotPasswordModalView';
import { createUserStorageController } from '../utils/mocks.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';

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
