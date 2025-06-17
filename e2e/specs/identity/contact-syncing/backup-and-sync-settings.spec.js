import { SDK } from '@metamask/profile-sync-controller';
import {
  IDENTITY_TEAM_PASSWORD,
  IDENTITY_TEAM_SEED_PHRASE,
  IDENTITY_TEAM_STORAGE_KEY,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import { getContactsSyncMockResponse } from './mock-data';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import CommonView from '../../../pages/CommonView';
import ContactsView from '../../../pages/contacts/ContactsView';
import AddContactView from '../../../pages/contacts/AddContactView';

describe(
  SmokeWalletPlatform('Contact syncing - backup and sync settings'),
  () => {
    const NEW_CONTACT_NAME = 'New Test Contact';
    const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8007;
    let mockServer;

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);

      const contactsSyncMockResponse = await getContactsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      await userStorageMockttpControllerInstance.setupPath(
        USER_STORAGE_FEATURE_NAMES.contacts,
        mockServer,
        {
          getResponse: contactsSyncMockResponse,
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

    it('should not sync new contacts when contacts sync toggle is off', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(4000);

      await TabBarComponent.tapSettings();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton, 'Backup and sync section should be visible');
      await SettingsView.tapBackupAndSync();
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(BackupAndSyncView.backupAndSyncToggle, 'Backup and sync toggle should be visible');
      await BackupAndSyncView.toggleContactSync();
      await TestHelpers.delay(2000);

      await CommonView.tapBackButton();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton, 'Backup and sync section should be visible after going back');
      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(2000);

      await ContactsView.tapAddContactButton();
      await Assertions.checkIfVisible(AddContactView.container, 'Add contact view should be visible');
      await AddContactView.typeContactName(NEW_CONTACT_NAME);
      await AddContactView.typeContactAddress(NEW_CONTACT_ADDRESS);
      await AddContactView.tapSaveButton();
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(
        ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
        `Contact "${NEW_CONTACT_NAME}" should be visible in the list`,
      );

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
      });

      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(4000);

      await Assertions.checkIfNotVisible(
        ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
        `Contact "${NEW_CONTACT_NAME}" should not be visible in the list when sync is off`,
      );
    });

    it('should sync new contacts when contacts sync toggle is on', async () => {
      await TabBarComponent.tapSettings();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton, 'Backup and sync section should be visible');
      await SettingsView.tapBackupAndSync();
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(BackupAndSyncView.backupAndSyncToggle, 'Backup and sync toggle should be visible');
      await BackupAndSyncView.toggleContactSync();
      await TestHelpers.delay(2000);

      await CommonView.tapBackButton();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton, 'Backup and sync section should be visible after going back');
      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(2000);

      await ContactsView.tapAddContactButton();
      await Assertions.checkIfVisible(AddContactView.container, 'Add contact view should be visible');
      await AddContactView.typeContactName(NEW_CONTACT_NAME);
      await AddContactView.typeContactAddress(NEW_CONTACT_ADDRESS);
      await AddContactView.tapSaveButton();
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(
        ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
        `Contact "${NEW_CONTACT_NAME}" should be visible in the list`,
      );

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
      });

      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(4000);

      await Assertions.checkIfVisible(
        ContactsView.getContactElementByContactName(NEW_CONTACT_NAME),
        `Contact "${NEW_CONTACT_NAME}" should be visible in the list when sync is on`,
      );
    });
  },
); 