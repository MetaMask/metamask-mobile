import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import { getContactsSyncMockResponse } from './mock-data';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../framework/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import CommonView from '../../../pages/CommonView';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';
import { arrangeTestUtils } from '../utils/helpers';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';

describe(SmokeIdentity('Contact syncing - backup and sync settings'), () => {
  const NEW_CONTACT_NAME = 'New Test Contact';
  const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
  let mockServer: MockttpServer;
  let userStorageMockttpController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();

    mockServer = await startMockServer({});

    const contactsSyncMockResponse = await getContactsSyncMockResponse();

    const { userStorageMockttpControllerInstance } = await mockIdentityServices(
      mockServer,
    );

    userStorageMockttpController = userStorageMockttpControllerInstance;

    await userStorageMockttpController.setupPath(
      USER_STORAGE_FEATURE_NAMES.addressBook,
      mockServer,
      {
        getResponse: contactsSyncMockResponse,
      },
    );

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: mockServer.port },
    });
  });

  afterAll(async () => {
    if (mockServer) {
      await stopMockServer(mockServer);
    }
  });

  it('does not sync new contacts when contacts sync toggle is off', async () => {
    const { waitUntilSyncedElementsNumberEquals } = arrangeTestUtils(
      userStorageMockttpController,
    );

    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapSettings();
    await TestHelpers.delay(1000);
    await Assertions.expectElementToBeVisible(
      SettingsView.backupAndSyncSectionButton,
    );
    await SettingsView.tapBackupAndSync();
    await TestHelpers.delay(2000);

    await Assertions.expectElementToBeVisible(
      BackupAndSyncView.backupAndSyncToggle,
    );
    await BackupAndSyncView.toggleBackupAndSync();
    await TestHelpers.delay(2000);

    await CommonView.tapBackButton();
    await SettingsView.tapContacts();
    await Assertions.expectElementToBeVisible(ContactsView.container);
    await ContactsView.tapAddContactButton();
    await Assertions.expectElementToBeVisible(AddContactView.container);

    await AddContactView.typeInName(NEW_CONTACT_NAME);
    await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
    await AddContactView.tapAddContactButton();
    await TestHelpers.delay(2000);
    await Assertions.expectElementToBeVisible(ContactsView.container);
    await ContactsView.isContactAliasVisible(NEW_CONTACT_NAME);

    // Verify contact was NOT synced (since sync is off)
    await waitUntilSyncedElementsNumberEquals(
      USER_STORAGE_FEATURE_NAMES.addressBook,
      2, // Should still be 2 (original contacts), not 3
    );

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
      launchArgs: { mockServerPort: mockServer.port },
    });

    await importWalletWithRecoveryPhrase({
      seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
      password: IDENTITY_TEAM_PASSWORD,
    });

    await TabBarComponent.tapSettings();
    await TestHelpers.delay(2000);
    await SettingsView.tapContacts();
    await Assertions.expectElementToBeVisible(ContactsView.container);
    await TestHelpers.delay(4000);

    await ContactsView.isContactAliasNotVisible(NEW_CONTACT_NAME);
  });
});
