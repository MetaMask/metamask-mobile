import { SDK } from '@metamask/profile-sync-controller';
import {
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
  NOTIFICATIONS_TEAM_STORAGE_KEY,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../mockServer/mockServer';
import { accountsSyncMockResponse } from './mockData';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListView from '../../../pages/AccountListView';
import Assertions from '../../../utils/Assertions';
import { mockNotificationServices } from '../utils/mocks';

describe('Account syncing', () => {
  it('retrieves all previously synced accounts', async () => {
    const decryptedAccountNames = await Promise.all(
      accountsSyncMockResponse.map(async (response) => {
        const decryptedAccountName = await SDK.Encryption.decryptString(
          response.Data,
          NOTIFICATIONS_TEAM_STORAGE_KEY,
        );
        return JSON.parse(decryptedAccountName).n;
      }),
    );

    const mockServer = await startMockServer({
      mockUrl: 'https://user-storage.api.cx.metamask.io/api/v1/userstorage',
    });

    const { userStorageMockttpControllerInstance } =
      await mockNotificationServices(mockServer);

    userStorageMockttpControllerInstance.setupPath('accounts', mockServer, {
      getResponse: accountsSyncMockResponse,
    });

    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    await device.launchApp({
      newInstance: true,
      delete: true,
    });

    await importWalletWithRecoveryPhrase(
      NOTIFICATIONS_TEAM_SEED_PHRASE,
      NOTIFICATIONS_TEAM_PASSWORD,
    );

    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListView.accountList);

    for (const accountName of decryptedAccountNames) {
      await Assertions.checkIfVisible(
        element(by.text(accountName).and(by.id('cellbase-avatar-title'))),
      );
    }

    await stopMockServer();
  });
});
