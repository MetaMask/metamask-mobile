'use strict';
import { SmokeCore } from '../../tags';
import SendView from '../../pages/Send/SendView';
import SettingsView from '../../pages/Settings/SettingsView';
import ContactsView from '../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../pages/Settings/Contacts/AddContactView';
import AddAddressModal from '../../pages/Send/AddAddressModal';
import TabBarComponent from '../../pages/wallet/TabBarComponent';
import WalletActionsBottomSheet from '../../pages/wallet/WalletActionsBottomSheet';
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
import CommonView from '../../pages/CommonView';
import enContent from '../../../locales/languages/en.json';
import DeleteContactBottomSheet from '../../pages/Settings/Contacts/DeleteContactBottomSheet';
import Assertions from '../../utils/Assertions';

const INVALID_ADDRESS = '0xB8B4EE5B1b693971eB60bDa15211570df2dB221L';
const TETHER_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7';
const MYTH_ADDRESS = '0x1FDb169Ef12954F20A15852980e1F0C122BfC1D6';
const MEMO = 'Test adding ENS';
const fixtureServer = new FixtureServer();

describe(SmokeCore('Addressbook Tests'), () => {
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
        await AddContactView.typeInName('Ibrahim');
    
    await AddContactView.typeInAddress('ibrahim.team.mask.eth');
    await AddContactView.tapAddContactButton();
    // await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book
  
  });

  it('should add an address via the contacts view', async () => {   
    await device.terminateApp()
    await TestHelpers.launchApp({
        launchArgs: { fixtureServerPort: `${getFixturesServerPort()}` },
      });  
      await loginToApp();
    await TabBarComponent.tapSettings();
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible('Ibrahim'); // Check that Ibrahim address is saved in the address book

});

 
});
