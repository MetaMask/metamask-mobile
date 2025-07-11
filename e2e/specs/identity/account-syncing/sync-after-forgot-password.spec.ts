import {
  importWalletWithRecoveryPhrase,
  loginToApp,
} from '../../../viewHelper.js';
import TestHelpers from '../../../helpers.js';
import WalletView from '../../../pages/wallet/WalletView.js';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet.js';
import Assertions from '../../../framework/Assertions.ts';
import { SmokeIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import {
  withIdentityFixtures,
  createSharedUserStorageController,
} from '../utils/withIdentityFixtures.ts';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet.js';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet.js';
import { defaultGanacheOptions } from '../../../fixtures/fixture-helper.js';
import SettingsView from '../../../pages/Settings/SettingsView.js';
import TabBarComponent from '../../../pages/wallet/TabBarComponent.js';
import LoginView from '../../../pages/wallet/LoginView.js';
import ForgotPasswordModalView from '../../../pages/Common/ForgotPasswordModalView.ts';
import { OnboardingSelectorText } from '../../../selectors/Onboarding/Onboarding.selectors.js';

describe(
  SmokeIdentity('Account syncing - Forgot Password Flow'),
  () => {
    let sharedUserStorageController: UserStorageMockttpController;

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();
      sharedUserStorageController = createSharedUserStorageController();
    });

    const NEW_ACCOUNT_NAME = 'Best name ever';
    const SECOND_ACCOUNT_NAME = 'Account 2';

    it('should sync correctly after going through forgot password/reset wallet flow', async () => {
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
          await AddAccountBottomSheet.tapCreateAccount();
          await AccountListBottomSheet.tapEditAccountActionsAtIndex(0);
          await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);
          await WalletView.tapIdenticon();
          const visibleAccounts = [NEW_ACCOUNT_NAME, SECOND_ACCOUNT_NAME];
          for (const accountName of visibleAccounts) {
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.getAccountElementByAccountName(
                accountName,
              ),
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
          sharedUserStorageController,
        },
        async () => {
          await loginToApp();
          await TabBarComponent.tapSettings();
          await SettingsView.tapLock();
          await SettingsView.tapYesAlertButton();
          await LoginView.tapForgotPassword();
          await ForgotPasswordModalView.tapResetWalletButton();
          await ForgotPasswordModalView.tapYesResetWalletButton();
          await Assertions.expectTextDisplayed(OnboardingSelectorText.SUCCESSFUL_WALLET_RESET); // Verify reset wallet success toast is displayed
          await Assertions.expectTextNotDisplayed(OnboardingSelectorText.SUCCESSFUL_WALLET_RESET); // Wait for the toast to disappear
          await importWalletWithRecoveryPhrase({
            seedPhrase: defaultGanacheOptions.mnemonic,
            fromResetWallet: true,
          });
          await WalletView.tapIdenticon();
          const visibleAccounts = [NEW_ACCOUNT_NAME, SECOND_ACCOUNT_NAME];

          for (const accountName of visibleAccounts) {
            await Assertions.expectElementToBeVisible(
              AccountListBottomSheet.getAccountElementByAccountName(
                accountName,
              ),
              {
                description: `Account with name "${accountName}" should be visible`,
              },
            );
          }
        },
      );
    });
  },
);
