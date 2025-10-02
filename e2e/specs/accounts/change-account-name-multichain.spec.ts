import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import AccountActionsBottomSheet from '../../pages/wallet/AccountActionsBottomSheet';
import Matchers from '../../framework/Matchers';
import EditAccountName from '../../pages/MultichainAccounts/EditAccountName';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';
import Gestures from '../../framework/Gestures';

const NEW_ACCOUNT_NAME = 'Edited Name';
const NEW_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
const MAIN_ACCOUNT_INDEX = 0;
const IMPORTED_ACCOUNT_INDEX = 1;

const testSpecificMock = async (mockServer: Mockttp) => {
  await setupRemoteFeatureFlagsMock(
    mockServer,
    remoteFeatureMultichainAccountsAccountDetailsV2(true),
  );
};

// TODO: With this migration we also removed the need for ganache options and everything is simplified.
describe(
  RegressionAccounts('Change Account Name - Multichain Account Details V2'),
  () => {
    it('renames an account and verifies the new name persists after locking and unlocking the wallet with multichain account details V2 enabled', async () => {
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
          // V2 approach: Use correct ellipsis button selector
          await WalletView.tapIdenticon();

          // Tap the V2 ellipsis button (3-dot menu) for the main account
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(
            MAIN_ACCOUNT_INDEX,
          );

          // V2 flow: Navigate through MultichainAccountActions modal
          await AccountActionsBottomSheet.tapRenameAccount();

          // Now use the EditAccountName screen
          await EditAccountName.updateAccountName(NEW_ACCOUNT_NAME);
          await EditAccountName.tapSave();

          // EditAccountName screen auto-dismisses after save in V2
          // Only need to dismiss the AccountList bottom sheet
          await AccountListBottomSheet.dismissAccountListModalV2();

          // Verify updated name appears in wallet view
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            NEW_ACCOUNT_NAME,
            {
              description: 'verify account name was updated in wallet view',
            },
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

    it('import an account, edits the name, and verifies the new name persists after locking and unlocking the wallet with multichain account details V2 enabled', async () => {
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
          // V2 approach: Select imported account using V2 selectors
          await WalletView.tapIdenticon();

          // Use V2 account cell selector for imported account selection
          const importedAccountCell = Matchers.getElementByID(
            'multichain-account-cell-container',
          );
          await Gestures.tapAtIndex(
            importedAccountCell,
            IMPORTED_ACCOUNT_INDEX,
            {
              elemDescription: 'select imported account using V2 account cell',
            },
          );

          // Navigate to imported account details using V2 ellipsis button
          await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(
            IMPORTED_ACCOUNT_INDEX,
          );

          // V2 flow: Navigate through MultichainAccountActions modal
          await AccountActionsBottomSheet.tapRenameAccount();

          // Now use the EditAccountName screen
          await EditAccountName.updateAccountName(NEW_IMPORTED_ACCOUNT_NAME);
          await EditAccountName.tapSave();

          // EditAccountName screen auto-dismisses after save in V2
          // Only need to dismiss the AccountList bottom sheet
          await AccountListBottomSheet.dismissAccountListModalV2();

          // Verify updated name appears in wallet view
          await Assertions.expectElementToHaveText(
            WalletView.accountName,
            NEW_IMPORTED_ACCOUNT_NAME,
            {
              description:
                'verify imported account name was updated in wallet view',
            },
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
  },
);
