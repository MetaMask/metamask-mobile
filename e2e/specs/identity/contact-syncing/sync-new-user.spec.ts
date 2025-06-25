import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import { startMockServer, stopMockServer } from '../../../api-mocking/mock-server';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';

import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import SettingsView from '../../../pages/Settings/SettingsView';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';

describe(SmokeWalletPlatform('Contact syncing - syncs new contacts'), () => {
  const NEW_CONTACT_NAME = 'New Test Contact';
  const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  let mockServer: MockttpServer;

  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    await TestHelpers.reverseServerPort();

    mockServer = await startMockServer(segmentMock);

    await mockIdentityServices(mockServer);

    // Don't setup addressBook path with empty array - let it be naturally empty
    // This avoids creating an unexpected state that the codebase doesn't handle

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(mockServer.port) },
    });
  });

  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  it('syncs new contacts and retrieves them after importing the same SRP', async () => {
    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapSettings();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(SettingsView.contactsSettingsButton);
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await ContactsView.tapAddContactButton();
    await Assertions.checkIfVisible(AddContactView.container);

    await AddContactView.typeInName(NEW_CONTACT_NAME);
    await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
    await AddContactView.tapAddContactButton();

    // Give extra time for contact save and sync operations
    await TestHelpers.delay(10000);
    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(mockServer.port) },
    });

    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapSettings();
    await TestHelpers.delay(2000);
    await Assertions.checkIfVisible(SettingsView.contactsSettingsButton);
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await TestHelpers.delay(4000);

    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);
  });
});
