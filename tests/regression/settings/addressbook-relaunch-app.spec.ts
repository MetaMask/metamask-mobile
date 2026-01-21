import { RegressionWalletPlatform } from '../../tags';
import SettingsView from '../../page-objects/Settings/SettingsView';
import ContactsView from '../../page-objects/Settings/Contacts/ContactsView';
import AddContactView from '../../page-objects/Settings/Contacts/AddContactView';
import TabBarComponent from '../../page-objects/wallet/TabBarComponent';
import { loginToApp } from '../../page-objects/viewHelper.ts';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../helpers';
import { getFixturesServerPort } from '../../framework/fixtures/FixtureUtils';
import Assertions from '../../framework/Assertions';
import { withFixtures } from '../../framework/fixtures/FixtureHelper';

const MEMO = 'Address for testing 123123123';

describe.skip(
  RegressionWalletPlatform('Relaunch App after Adding Address to Contact Book'),
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
          await ContactsView.expectContactIsVisible('Curtis');
          await device.terminateApp();
          await TestHelpers.launchApp({
            launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
          });
          await device.disableSynchronization();
          await loginToApp();
          await device.enableSynchronization();
          await TabBarComponent.tapSettings();
          await SettingsView.tapContacts();
          await Assertions.expectElementToBeVisible(ContactsView.container);
          await ContactsView.expectContactIsVisible('Curtis');
        },
      );
    });
  },
);
