import FixtureBuilder from '../../../tests/framework/fixtures/FixtureBuilder';
import { RegressionAccounts } from '../../tags.js';
import WalletView from '../../pages/wallet/WalletView';
import Assertions from '../../../tests/framework/Assertions';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import SettingsView from '../../pages/Settings/SettingsView';
import LoginView from '../../pages/wallet/LoginView';
import AccountListBottomSheet from '../../pages/wallet/AccountListBottomSheet';
import Matchers from '../../../tests/framework/Matchers';
import EditAccountName from '../../pages/MultichainAccounts/EditAccountName';
import AccountDetails from '../../pages/MultichainAccounts/AccountDetails';
import { withFixtures } from '../../../tests/framework/fixtures/FixtureHelper';
import { loginToApp } from '../../viewHelper';
import Gestures from '../../../tests/framework/Gestures';

const NEW_ACCOUNT_NAME = 'Edited Name';
const NEW_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
const MAIN_ACCOUNT_INDEX = 0;
const IMPORTED_ACCOUNT_INDEX = 1;

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
        },
        async () => {
          await loginToApp();
          // V2 approach: Use correct ellipsis button selector
          await WalletView.tapIdenticon();

          // Tap the V2 ellipsis button (3-dot menu) for the main account
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(
            MAIN_ACCOUNT_INDEX,
          );

          // V2 flow: Now goes directly to AccountDetails sheet
          await AccountDetails.tapEditAccountName();

          // Now use the EditAccountName screen
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

    it.skip('import an account, edits the name, and verifies the new name persists after locking and unlocking the wallet with multichain account details V2 enabled', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedAccountKeyringController()
            .build(),
          restartDevice: true,
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

          // V2 flow: Now goes directly to AccountDetails sheet
          await AccountDetails.tapEditAccountName();

          // Now use the EditAccountName screen
          await EditAccountName.updateAccountName(NEW_IMPORTED_ACCOUNT_NAME);
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
