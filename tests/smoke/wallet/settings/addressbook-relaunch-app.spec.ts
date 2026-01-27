import { RegressionWalletPlatform } from '../../../../e2e/tags';
import SettingsView from '../../../../e2e/pages/Settings/SettingsView.ts';
import ContactsView from '../../../../e2e/pages/Settings/Contacts/ContactsView.ts';
import AddContactView from '../../../../e2e/pages/Settings/Contacts/AddContactView.ts';
import TabBarComponent from '../../../../e2e/pages/wallet/TabBarComponent.ts';
import { loginToApp } from '../../../../e2e/viewHelper.ts';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder.ts';
import TestHelpers from '../../../../e2e/helpers';
import { getFixturesServerPort } from '../../../framework/fixtures/FixtureUtils.ts';
import Assertions from '../../../framework/Assertions.ts';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper.ts';

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
