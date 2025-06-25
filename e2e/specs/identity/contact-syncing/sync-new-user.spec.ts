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
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import SettingsView from '../../../pages/Settings/SettingsView';
import Assertions from '../../../utils/Assertions';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import CommonView from '../../../pages/CommonView';

describe(SmokeWalletPlatform('Contact syncing - syncs new contacts'), () => {
  const NEW_CONTACT_NAME = 'New Test Contact';
  const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  const TEST_SPECIFIC_MOCK_SERVER_PORT = 8006;
  let mockServer: MockttpServer;
  let userStorageMockttpController: UserStorageMockttpController;

  beforeAll(async () => {
    const segmentMock = {
      POST: [mockEvents.POST.segmentTrack],
    };

    await TestHelpers.reverseServerPort();

    mockServer = await startMockServer(segmentMock, TEST_SPECIFIC_MOCK_SERVER_PORT);

    const { userStorageMockttpControllerInstance } = await mockIdentityServices(
      mockServer,
    );

    userStorageMockttpController = userStorageMockttpControllerInstance;

    await userStorageMockttpController.setupPath(
      USER_STORAGE_FEATURE_NAMES.addressBook,
      mockServer,
      {
        getResponse: [], // Start with empty contacts for new user
      },
    );

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
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

    await TestHelpers.delay(2000);
    await CommonView.tapBackButton();
    await TestHelpers.delay(1000);
    await SettingsView.tapContacts();
    await Assertions.checkIfVisible(ContactsView.container);
    await TestHelpers.delay(2000);
    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
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
