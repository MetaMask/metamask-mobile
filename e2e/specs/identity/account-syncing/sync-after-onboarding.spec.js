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

describe(
  SmokeIdentity('Account syncing - syncs previously synced accounts'),
  () => {
    let mockServer;
    beforeAll(async () => {
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

      await TestHelpers.reverseServerPort();

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
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
    });
  },
);
