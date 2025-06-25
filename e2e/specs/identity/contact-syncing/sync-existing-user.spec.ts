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
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { MockttpServer } from 'mockttp';
import ContactsView from '../../../pages/Settings/Contacts/ContactsView';
import SettingsView from '../../../pages/Settings/SettingsView';

describe(
  SmokeWalletPlatform('Contact syncing - syncs previously synced contacts'),
  () => {
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8005;
    let mockServer: MockttpServer;

    beforeAll(async () => {
      const segmentMock = {
        POST: [mockEvents.POST.segmentTrack],
      };

      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer(
        segmentMock,
        TEST_SPECIFIC_MOCK_SERVER_PORT,
      );

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
        launchArgs: {
          mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT),
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
      await Assertions.checkIfVisible(ContactsView.container);
      await TestHelpers.delay(4000);

      for (const contactName of decryptedContactNames) {
        await ContactsView.isContactAliasVisible(contactName);
      }
    });
  },
);
