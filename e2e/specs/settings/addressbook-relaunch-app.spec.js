'use strict';
import { SmokeCore } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';

import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';

import TestHelpers from '../../helpers';
import { getFixturesServerPort } from '../../fixtures/utils';
import Assertions from '../../utils/Assertions';
import { withFixtures } from '../../fixtures/fixture-helper';

const MEMO = 'Address for testing 123123123';

describe(SmokeCore('Relaunch App after Adding Address to Contact Book'), () => {
  beforeAll(async () => {
    jest.setTimeout(150000);
    await TestHelpers.reverseServerPort();
  });

  it('should terminate and relaunch the app after adding a contact', async () => {
    await withFixtures(
      {
        dapp: true,
        fixture: new FixtureBuilder().withPermissionController().build(),
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
        await Assertions.checkIfVisible(ContactsView.container);
        await ContactsView.isContactAliasVisible('Curtis');
        await TabBarComponent.tapWallet();
        await TabBarComponent.tapActions();
        await WalletActionsBottomSheet.tapSendButton();
        await Assertions.checkIfTextIsDisplayed('Curtis');
      },
    );
  });
});
