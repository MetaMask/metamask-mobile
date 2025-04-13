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
import { getAccountsSyncMockResponse } from './mock-data';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { mockEvents } from '../../../api-mocking/mock-config/mock-events';
import { getEventsPayloads } from '../../analytics/helpers';
import { MetaMetricsEvents } from '../../../../app/core/Analytics/MetaMetrics.events';

describe(
  SmokeIdentity('Account syncing - syncs previously synced accounts'),
  () => {
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8001;
    let mockServer;

    beforeAll(async () => {
        const segmentMock = {
          POST: [mockEvents.POST.segmentTrack],
        };


      mockServer = await startMockServer(segmentMock, TEST_SPECIFIC_MOCK_SERVER_PORT);

      const accountsSyncMockResponse = await getAccountsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      await userStorageMockttpControllerInstance.setupPath(
        USER_STORAGE_FEATURE_NAMES.accounts,
        mockServer,
        {
          getResponse: accountsSyncMockResponse,
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

    it('retrieves all previously synced accounts', async () => {
      const accountsSyncMockResponse = await getAccountsSyncMockResponse();

      const decryptedAccountNames = await Promise.all(
        accountsSyncMockResponse.map(async (response) => {
          const decryptedAccountName = await SDK.Encryption.decryptString(
            response.Data,
            IDENTITY_TEAM_STORAGE_KEY,
          );
          return JSON.parse(decryptedAccountName).n;
        }),
      );

      await importWalletWithRecoveryPhrase(
        {
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        },
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      for (const accountName of decryptedAccountNames) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      /**
       * TEST SEGMENT/METAMETRICS EVENTS
       */
      const events = await getEventsPayloads(
        mockServer,
        [
          MetaMetricsEvents.ACCOUNTS_SYNC_ADDED.category,
          MetaMetricsEvents.ACCOUNTS_SYNC_NAME_UPDATED.category,
        ],
      );

      // There should be 3 events:
      // 1 for adding the account (Since every wallet always adds the first account) and 2 for updating the names (from user storage)
      const addedAccountEvent = events.find(
        (event) => event.event === MetaMetricsEvents.ACCOUNTS_SYNC_ADDED.category,
      );
      const updatedAccountEvents = events.filter(
        (event) => event.event === MetaMetricsEvents.ACCOUNTS_SYNC_NAME_UPDATED.category,
      );
      await Assertions.checkIfArrayHasLength(
        addedAccountEvent,
        1,
      );
      await Assertions.checkIfArrayHasLength(
        updatedAccountEvents,
        2,
      );

      for (const event of events) {
        await Assertions.checkIfValueIsPresent(
          event.properties,
          'profile_id',
        );
      }

    });
  },
);
