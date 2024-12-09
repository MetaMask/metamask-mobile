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
import { accountsSyncMockResponse } from './mockData';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';

describe(SmokeIdentity('Account syncing'), () => {
  beforeAll(async () => {
    const mockServer = await startMockServer({
      mockUrl: 'https://user-storage.api.cx.metamask.io/api/v1/userstorage',
    });

    const { userStorageMockttpControllerInstance } = await mockIdentityServices(
      mockServer,
    );

    userStorageMockttpControllerInstance.setupPath('accounts', mockServer, {
      getResponse: accountsSyncMockResponse,
    });

    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
    });
  });

  afterAll(async () => {
    await stopMockServer();
  });

  it('retrieves all previously synced accounts', async () => {
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

    for (const accountName of decryptedAccountNames) {
      await Assertions.checkIfVisible(
        AccountListBottomSheet.getAccountElementByAccountName(accountName),
      );
    }
  });
});
