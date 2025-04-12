/* eslint-disable no-console */
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
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import SegmentTracker from '../../analytics/utils/SegmentTracker';
import { of } from 'rxjs';
import { withFixtures } from '../../../fixtures/fixture-helper';
import FixtureBuilder from '../../../fixtures/fixture-builder';

describe(
  SmokeIdentity(
    'Account syncing - syncs and retrieves accounts after adding a custom name account',
  ),
  () => {
    const NEW_ACCOUNT_NAME = 'My third account';
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
    let decryptedAccountNames = '';
    let mockServer;
    let segmentTracker;
    const detoxTestId = 'account-syncing-custom-name';

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);

      // SEGMENT
      segmentTracker = new SegmentTracker(detoxTestId, mockServer);
      await segmentTracker.start();

      // ACCOUNT SYNCING
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

      decryptedAccountNames = await Promise.all(
        accountsSyncMockResponse.map(async (response) => {
          const decryptedAccountName = await SDK.Encryption.decryptString(
            response.Data,
            IDENTITY_TEAM_STORAGE_KEY,
          );
          return JSON.parse(decryptedAccountName).n;
        }),
      );

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT), detoxTestId, enableSegment: true },
      });
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('syncs newly added accounts with custom names and retrieves same accounts after importing the same SRP', async () => {

     await withFixtures({fixture: new FixtureBuilder().withDefaultFixture().build(), restartDevice: true}, async () => {
       /* *
      * Phase 1: User onboards by importing a wallet with 2 accounts already in user storage. After onboarding, the user adds a new account and renames it. 
      */

       await importWalletWithRecoveryPhrase(
        IDENTITY_TEAM_SEED_PHRASE,
        IDENTITY_TEAM_PASSWORD,
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      for (const accountName of decryptedAccountNames) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();
      await TestHelpers.delay(2000);

      await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
      await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);

      await Assertions.checkIfElementToHaveText(
        WalletView.accountName,
        NEW_ACCOUNT_NAME,
      );

      /**
       * Phase 1.5: Check segment tracker events
       * Accounts Sync Name Updated - from the 2 accounts in user storage
       * Account Renamed - from the new account created
       */

      const accountsSyncNameUpdatedEvent = await segmentTracker.getEventsByName(
        'Accounts Sync Name Updated',
      );
      await Assertions.checkIfArrayHasLength(accountsSyncNameUpdatedEvent, 2);
      for  (const nameUpdatedEvent of accountsSyncNameUpdatedEvent) {
        Assertions.checkIfValueIsPresent(nameUpdatedEvent.properties.profile_id);
      }

      const accountRenamedEvent = await segmentTracker.getEventsByName(
        'Account Renamed',
      );
      await Assertions.checkIfArrayHasLength(accountRenamedEvent, 1);
      await Assertions.checkIfObjectsMatch(accountRenamedEvent[0].properties, { account_type: 'MetaMask', chain_id: '1' });
      
      /**
       * Phase 2: User logs out and logs back in. The app should sync the accounts from user storage and retrieve the same accounts with the same names.
       */
      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT), detoxTestId, enableSegment: true },
      });
      
      await importWalletWithRecoveryPhrase(
        IDENTITY_TEAM_SEED_PHRASE,
        IDENTITY_TEAM_PASSWORD,
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      await Assertions.checkIfVisible(
        AccountListBottomSheet.getAccountElementByAccountName(NEW_ACCOUNT_NAME),
      );
     })
    });
  },
);
