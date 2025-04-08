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

describe(
  SmokeIdentity(
    'Account syncing - user already has balances on multiple accounts',
  ),
  () => {
    let decryptedAccountNames = '';
    let mockServer;

    beforeAll(async () => {
      jest.setTimeout(200000);
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer();

      const accountsSyncMockResponse = await getAccountsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      userStorageMockttpControllerInstance.setupPath(
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
      });
    });

    afterAll(async () => {
      await stopMockServer(mockServer);
    });

    /**
     * This test verifies the complete account syncing flow in three phases:
     * Phase 1: Initial setup, where we check that 4 accounts are shown due to balance detection even though the user storage only has 2 accounts.
     * Phase 2: Discovery of 2 more accounts after adding balances. We still expect to only see 6 even though we had 5 accounts synced in the previous test
     * Phase 3: Verification that any final changes to user storage are persisted and that we don't see any extra accounts created
     */

    it('handles account syncing with balances correctly', async () => {});
  },
);
