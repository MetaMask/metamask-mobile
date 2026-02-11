import { RegressionWalletPlatform } from '../../../tags';
import ContactsView from '../../../page-objects/Settings/Contacts/ContactsView';
import AddContactView from '../../../page-objects/Settings/Contacts/AddContactView';
import { loginToApp } from '../../../flows/wallet.flow';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import TestHelpers from '../../../helpers';
import { getFixturesServerPort } from '../../../framework/fixtures/FixtureUtils';
import Assertions from '../../../framework/Assertions';
import { withFixtures } from '../../../framework/fixtures/FixtureHelper';
import AccountMenu from '../../../page-objects/AccountMenu/AccountMenu';
import WalletView from '../../../page-objects/wallet/WalletView';

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
          await WalletView.tapHamburgerMenu();
          await AccountMenu.tapContacts();
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
          await WalletView.tapHamburgerMenu();
          await AccountMenu.tapContacts();
          await Assertions.expectElementToBeVisible(ContactsView.container);
          await ContactsView.expectContactIsVisible('Curtis');
        },
      );
    });
  },
);
