import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import EditAccountNameView from '../../pages/wallet/EditAccountNameView';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { mockEvents } from '../../api-mocking/mock-config/mock-events.js';
import { setupMockRequest } from '../../api-mocking/mockHelpers';
import { Mockttp } from 'mockttp';

const NEW_ACCOUNT_NAME = 'Edited Name';
const NEW_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
const MAIN_ACCOUNT_INDEX = 0;
const IMPORTED_ACCOUNT_INDEX = 1;

const testSpecificMock = async (mockServer: Mockttp) => {
  const { urlEndpoint, response } =
    mockEvents.GET.remoteFeatureMultichainAccountsAccountDetails(false);
  await setupMockRequest(mockServer, {
    requestMethod: 'GET',
    url: urlEndpoint,
    response,
    responseCode: 200,
  });
};

// TODO: With this migration we also removed the need for ganache options and everything is simplified.
describe(RegressionAccounts('Change Account Name'), () => {
  it('renames an account and verifies the new name persists after locking and unlocking the wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        // Open account actions and edit account name
        await TabBarComponent.tapWallet();
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(
          MAIN_ACCOUNT_INDEX,
        );
        await AccountActionsBottomSheet.tapEditAccount();
        await EditAccountNameView.updateAccountName(NEW_ACCOUNT_NAME);
        await EditAccountNameView.tapSave();

        // Verify updated name
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          NEW_ACCOUNT_NAME,
        );

        // Lock wallet
        await Assertions.expectElementToBeVisible(
          TabBarComponent.tabBarSettingButton,
        );
        await TabBarComponent.tapSettings();
        await SettingsView.scrollToLockButton();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Unlock wallet and verify updated name persists
        await loginToApp();
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          NEW_ACCOUNT_NAME,
        );
      },
    );
  });

  it('import an account, edits the name, and verifies the new name persists after locking and unlocking the wallet', async () => {
    await withFixtures(
      {
        fixture: new FixtureBuilder()
          .withImportedAccountKeyringController()
          .build(),
        restartDevice: true,
        testSpecificMock,
      },
      async () => {
        await loginToApp();
        // Open account actions bottom sheet and choose imported account
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapToSelectActiveAccountAtIndex(
          IMPORTED_ACCOUNT_INDEX,
        );

        // Edit imported account name
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapEditAccountActionsAtIndex(
          IMPORTED_ACCOUNT_INDEX,
        );
        await AccountActionsBottomSheet.tapEditAccount();

        await EditAccountNameView.updateAccountName(NEW_IMPORTED_ACCOUNT_NAME);
        await EditAccountNameView.tapSave();

        // Verify updated name
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          NEW_IMPORTED_ACCOUNT_NAME,
        );

        // Lock wallet
        await Assertions.expectElementToBeVisible(
          TabBarComponent.tabBarSettingButton,
        );
        await TabBarComponent.tapSettings();
        await SettingsView.scrollToLockButton();
        await SettingsView.tapLock();
        await SettingsView.tapYesAlertButton();
        await Assertions.expectElementToBeVisible(LoginView.container);

        // Unlock wallet and verify updated name persists
        await loginToApp();
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          NEW_IMPORTED_ACCOUNT_NAME,
        );
      },
    );
  });
});
