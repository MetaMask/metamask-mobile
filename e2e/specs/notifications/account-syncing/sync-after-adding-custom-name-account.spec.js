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
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../utils/Assertions';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import { mockNotificationServices } from '../utils/mocks';
import { SmokeNotifications } from '../../../tags';

describe(SmokeNotifications('Account syncing'), () => {
  const NEW_ACCOUNT_NAME = 'My third account';
  let decryptedAccountNames = '';

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    const mockServer = await startMockServer();

    const { userStorageMockttpControllerInstance } =
      await mockNotificationServices(mockServer);

    userStorageMockttpControllerInstance.setupPath('accounts', mockServer, {
      getResponse: accountsSyncMockResponse,
    });

    decryptedAccountNames = await Promise.all(
      accountsSyncMockResponse.map(async (response) => {
        const decryptedAccountName = await SDK.Encryption.decryptString(
          response.Data,
          NOTIFICATIONS_TEAM_STORAGE_KEY,
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
    await stopMockServer();
  });

  it('syncs newly added accounts with custom names', async () => {
    await importWalletWithRecoveryPhrase(
      NOTIFICATIONS_TEAM_SEED_PHRASE,
      NOTIFICATIONS_TEAM_PASSWORD,
    );

    await WalletView.tapIdenticon();

    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

    for (const accountName of decryptedAccountNames) {
      await Assertions.checkIfVisible(
        AccountListBottomSheet.getAccountElementByAccountName(accountName),
      );
    }

    await AccountListBottomSheet.tapAddAccountButton();
    await AddAccountBottomSheet.tapCreateAccount();
    await AccountListBottomSheet.swipeToDismissAccountsModal();
    await TestHelpers.delay(2000);
    await WalletView.tapCurrentMainWalletAccountActions();

    await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
    await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);

    await Assertions.checkIfElementToHaveText(
      WalletView.accountName,
      NEW_ACCOUNT_NAME,
    );
  });

  it('retrieves same accounts after importing the same SRP', async () => {
    await TestHelpers.launchApp({
      newInstance: true,
      delete: true,
    });

    await importWalletWithRecoveryPhrase(
      NOTIFICATIONS_TEAM_SEED_PHRASE,
      NOTIFICATIONS_TEAM_PASSWORD,
    );

    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

    await Assertions.checkIfVisible(
      AccountListBottomSheet.getAccountElementByAccountName(NEW_ACCOUNT_NAME),
    );
  });
});
