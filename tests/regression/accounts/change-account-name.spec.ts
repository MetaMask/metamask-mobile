import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import { RegressionAccounts } from '../../tags.js';
import WalletView from '../../page-objects/wallet/WalletView';
import EditAccountName from '../../page-objects/MultichainAccounts/EditAccountName';
import Assertions from '../../framework/Assertions';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import SettingsView from '../../page-objects/Settings/SettingsView';
import LoginView from '../../page-objects/wallet/LoginView';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet';
import AccountDetails from '../../page-objects/MultichainAccounts/AccountDetails';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import { Mockttp } from 'mockttp';
import { setupRemoteFeatureFlagsMock } from '../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../api-mocking/mock-responses/feature-flags-mocks';

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

        // Tap the V2 ellipsis button (3-dot menu) for the main account
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(
          MAIN_ACCOUNT_INDEX,
        );
        // V2 flow: Now goes directly to AccountDetails sheet
        await AccountDetails.tapEditAccountName();

        await EditAccountName.updateAccountName(NEW_ACCOUNT_NAME);
        await EditAccountName.tapSave();

        // Navigate back to wallet view
        await AccountDetails.tapBackButton();
        // In the new flow, tapping back might already dismiss the modal
        // Try to dismiss only if the modal is still visible
        try {
          await AccountListBottomSheet.dismissAccountListModalV2();
        } catch (error) {
          // Modal might already be dismissed, continue with test
          console.log('Modal already dismissed or not found, continuing...');
        }

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

        // Tap the V2 ellipsis button (3-dot menu) for the main account
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(
          IMPORTED_ACCOUNT_INDEX,
        );

        // V2 flow: Now goes directly to AccountDetails sheet
        await AccountDetails.tapEditAccountName();

        await EditAccountName.updateAccountName(NEW_IMPORTED_ACCOUNT_NAME);
        await EditAccountName.tapSave();

        // Navigate back to wallet view
        await AccountDetails.tapBackButton();
        await AccountListBottomSheet.tapAccountByNameV2(
          NEW_IMPORTED_ACCOUNT_NAME,
        );

        // In the new flow, tapping back might already dismiss the modal
        // Try to dismiss only if the modal is still visible
        try {
          await AccountListBottomSheet.dismissAccountListModalV2();
        } catch (error) {
          // Modal might already be dismissed, continue with test
          console.log('Modal already dismissed or not found, continuing...');
        }

        // Verify updated name
        await Assertions.expectElementToHaveText(
          WalletView.accountName,
          NEW_IMPORTED_ACCOUNT_NAME,
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
          NEW_IMPORTED_ACCOUNT_NAME,
        );
      },
    );
  });
});
