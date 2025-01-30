'use strict';
import { SmokeMultiChainPermissions } from '../../tags';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import { loginToApp } from '../../viewHelper';
import FixtureBuilder from '../../fixtures/fixture-builder';
import {
  loadFixture,
  startFixtureServer,
  stopFixtureServer,
} from '../../fixtures/fixture-helper';
import TestHelpers from '../../helpers';
import FixtureServer from '../../fixtures/fixture-server';
import { getFixturesServerPort } from '../../fixtures/utils';
import Assertions from '../../utils/Assertions';


const fixtureServer = new FixtureServer();

describe(SmokeMultiChainPermissions('Addressbook Relaunch'), () => {
  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    const fixture = new FixtureBuilder().build();
    await startFixtureServer(fixtureServer);
    await loadFixture(fixtureServer, { fixture });
    await TestHelpers.launchApp({
      launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
    });
    await loginToApp();
  });

  beforeEach(() => {
    jest.setTimeout(150000);
  });

  afterAll(async () => {
    await stopFixtureServer(fixtureServer);
  });


  it('should go to settings then select contacts', async () => {
    await device.disableSynchronization()
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();
    await device.enableSynchronization()

        await ContactsView.tapAddContactButton();
    // await Assertions.checkIfVisible(ContactsView.container);
        await AddContactView.typeInName('Curtis');
    
    await AddContactView.typeInAddress('curtis.eth');
    await AddContactView.tapAddContactButton();
    // await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Curtis'); // Check that Ibrahim address is saved in the address book
  

    await device.terminateApp()
    await TestHelpers.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });  
      await loginToApp();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Curtis'); 

});

 
});
