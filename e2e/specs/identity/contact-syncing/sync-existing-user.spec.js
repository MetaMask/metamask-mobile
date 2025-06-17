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
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../../analytics/helpers';
import { EVENT_NAME } from '../../../../app/core/Analytics/MetaMetrics.events';
import ContactsView from '../../../pages/contacts/ContactsView';

describe(
  SmokeWalletPlatform('Contact syncing - syncs previously synced contacts'),
  () => {
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8005;
    let mockServer;

    beforeAll(async () => {
      const segmentMock = {
        POST: [mockEvents.POST.segmentTrack],
      };

      mockServer = await startMockServer(segmentMock, TEST_SPECIFIC_MOCK_SERVER_PORT);

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

      await TestHelpers.reverseServerPort();

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT), sendMetaMetricsinE2E: true },
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

      await importWalletWithRecoveryPhrase(
        {
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        },
      );

      await TabBarComponent.tapContacts();
      await Assertions.checkIfVisible(ContactsView.container, 'Contacts view should be visible');
      await TestHelpers.delay(4000);

      for (const contactName of decryptedContactNames) {
        await Assertions.checkIfVisible(
          ContactsView.getContactElementByContactName(contactName),
          `Contact "${contactName}" should be visible in the list`,
        );
      }

      /**
       * TEST SEGMENT/METAMETRICS EVENTS
       */
      const events = await getEventsPayloads(
        mockServer,
        [
          EVENT_NAME.CONTACTS_SYNC_ADDED,
          EVENT_NAME.CONTACTS_SYNC_NAME_UPDATED,
        ],
      );

      // There should be 2 events for updating the names (from user storage)
      const updatedContactEvents = events.filter(
        (event) => event.event === EVENT_NAME.CONTACTS_SYNC_NAME_UPDATED,
      );

      await Assertions.checkIfArrayHasLength(
        updatedContactEvents,
        2,
        'Should have exactly 2 contact name update events',
      );

      for (const event of events) {
        await Assertions.checkIfValueIsPresent(
          event.properties,
          'profile_id',
          'Event should have a profile_id property',
        );
        await Assertions.checkIfValueIsPresent(
          event.properties,
          'contact_address',
          'Event should have a contact_address property',
        );
        await Assertions.checkIfValueIsPresent(
          event.properties,
          'contact_name',
          'Event should have a contact_name property',
        );
      }
    });
  },
); 