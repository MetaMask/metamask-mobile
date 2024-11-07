import { SDK } from '@metamask/profile-sync-controller';
import {
  NOTIFICATIONS_TEAM_PASSWORD,
  NOTIFICATIONS_TEAM_SEED_PHRASE,
  NOTIFICATIONS_TEAM_STORAGE_KEY,
} from '../utils/constants';
import {
  startMockServer,
  stopMockServer,
} from '../../../api-mocking/mock-server';
import { accountsSyncMockResponse } from './mockData';
import { importWalletWithRecoveryPhrase } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListView from '../../../pages/AccountListView';
import Assertions from '../../../utils/Assertions';
import AddAccountModal from '../../../pages/modals/AddAccountModal';
import AccountActionsModal from '../../../pages/modals/AccountActionsModal';
import { mockNotificationServices } from '../utils/mocks';
import { SmokeNotifications } from '../../../tags';

describe(SmokeNotifications('Account syncing'), () => {
  const NEW_ACCOUNT_NAME = 'My third account';

  it('syncs newly added accounts with custom names and retrieves them after importing the same SRP', async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    const mockServer = await startMockServer();

    const { userStorageMockttpControllerInstance } =
      await mockNotificationServices(mockServer);

    userStorageMockttpControllerInstance.setupPath('accounts', mockServer, {
      getResponse: accountsSyncMockResponse,
    });

    const decryptedAccountNames = await Promise.all(
      accountsSyncMockResponse.map(async (response) => {
        const decryptedAccountName = await SDK.Encryption.decryptString(
          response.Data,
          NOTIFICATIONS_TEAM_STORAGE_KEY,
        );
        return JSON.parse(decryptedAccountName).n;
      }),
    );

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
        await AccountListView.getAccountElementByAccountName(accountName),
      );
    }

    await AccountListView.tapAddAccountButton();
    await AddAccountModal.tapCreateAccount();
    await AccountListView.swipeToDismissAccountsModal();

    await WalletView.tapMainWalletAccountActions();
    await AccountActionsModal.renameActiveAccount(NEW_ACCOUNT_NAME);

    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_ACCOUNT_NAME,
    );

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

    await Assertions.checkIfVisible(
      await AccountListView.getAccountElementByAccountName(NEW_ACCOUNT_NAME),
    );

    await stopMockServer();
  });
});
