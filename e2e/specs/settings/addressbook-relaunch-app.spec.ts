import { SmokeWalletPlatform } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

const MEMO = 'Address for testing 123123123';

describe(
  SmokeWalletPlatform('Relaunch App after Adding Address to Contact Book'),
  () => {
    beforeAll(async () => {
      jest.setTimeout(150000);
    });

    it('should terminate and relaunch the app after adding a contact', async () => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().withProfileSyncingDisabled().build(),
          restartDevice: true,
        },
        async () => {
          await loginToApp();
          await device.disableSynchronization();
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await device.enableSynchronization();

          await ContactsView.tapAddContactButton();
          await AddContactView.typeInName('Curtis');

          await AddContactView.typeInAddress('curtis.eth');
          await AddContactView.typeInMemo(MEMO);
          await AddContactView.tapAddContactButton();
          await ContactsView.isContactAliasVisible('Curtis');
          await device.terminateApp();
          await TestHelpers.launchApp({
            launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
          });
          await loginToApp();
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await Assertions.expectElementToBeVisible(ContactsView.container);
          await ContactsView.isContactAliasVisible('Curtis');
          await TabBarComponent.tapWallet();
          await TabBarComponent.tapActions();
          await WalletActionsBottomSheet.tapSendButton();
          await Assertions.expectTextDisplayed('Curtis');
        },
      );
    });
  },
);
