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
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import Assertions from '../../../framework/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import SettingsView from '../../../pages/Settings/SettingsView';
import { arrangeTestUtils } from '../utils/helpers';
import { UserStorageMockttpController } from '../utils/user-storage/userStorageMockttpController';

describe(
  SmokeIdentity('Contact syncing - syncs previously synced contacts'),
  () => {
    let mockServer: MockttpServer;
    let userStorageMockttpController: UserStorageMockttpController;

    beforeAll(async () => {
      const segmentMock = {
        POST: [mockEvents.POST.segmentTrack],
      };

      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer(segmentMock);

      const contactsSyncMockResponse = await getContactsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

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
        launchArgs: {
          mockServerPort: mockServer.port,
          sendMetaMetricsinE2E: true,
        },
      });
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('retrieves all previously synced contacts', async () => {
      const { waitUntilSyncedElementsNumberEquals } = arrangeTestUtils(
        userStorageMockttpController,
      );

      const contactsSyncMockResponse = await getContactsSyncMockResponse();

      const decryptedContactNames = await Promise.all(
        contactsSyncMockResponse.map(async (response) => {
          const decryptedContactName = await SDK.Encryption.decryptString(
            response.Data,
            IDENTITY_TEAM_STORAGE_KEY,
          );
          return JSON.parse(decryptedContactName).n;
        }),
      );

      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await TabBarComponent.tapSettings();
      await TestHelpers.delay(1000);
      await SettingsView.tapContacts();
      await Assertions.expectElementToBeVisible(ContactsView.container);

      // Wait for contacts to be synced from remote storage
      await waitUntilSyncedElementsNumberEquals(
        USER_STORAGE_FEATURE_NAMES.addressBook,
        contactsSyncMockResponse.length,
      );

      for (const contactName of decryptedContactNames) {
        await ContactsView.isContactAliasVisible(contactName);
      }
    });
  },
);
