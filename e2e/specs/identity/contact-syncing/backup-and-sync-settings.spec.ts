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
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import CommonView from '../../../pages/CommonView';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import AddContactView from '../../../pages/Settings/Contacts/AddContactView';

describe(
  SmokeWalletPlatform('Contact syncing - backup and sync settings'),
  () => {
    const NEW_CONTACT_NAME = 'New Test Contact';
    const NEW_CONTACT_ADDRESS = '0x1234567890123456789012345678901234567890';
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8007;
    let mockServer: MockttpServer;

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);

      const contactsSyncMockResponse = await getContactsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      await userStorageMockttpControllerInstance.setupPath(
        USER_STORAGE_FEATURE_NAMES.addressBook,
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

    it('does not sync new contacts when contacts sync toggle is off', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await TabBarComponent.tapSettings();
      await TestHelpers.delay(1000);
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton);
      await SettingsView.tapBackupAndSync();
      await TestHelpers.delay(2000);

      await Assertions.checkIfVisible(BackupAndSyncView.backupAndSyncToggle);
      await BackupAndSyncView.toggleBackupAndSync();
      await TestHelpers.delay(2000);

      await CommonView.tapBackButton();
      await SettingsView.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container);
      await ContactsView.tapAddContactButton();
      await Assertions.checkIfVisible(AddContactView.container);

      await AddContactView.typeInName(NEW_CONTACT_NAME);
      await AddContactView.typeInAddress(NEW_CONTACT_ADDRESS);
      await AddContactView.tapAddContactButton();
      await TestHelpers.delay(4000);

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
      await SettingsView.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container);
      await TestHelpers.delay(4000);

      await ContactsView.isContactAliasNotVisible(NEW_CONTACT_NAME);
    });
  },
);
