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
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import { mockIdentityServices } from '../utils/mocks';
import { SmokeIdentity } from '../../../tags';

describe(SmokeIdentity('Account syncing'), () => {
  const NEW_ACCOUNT_NAME = 'My third account';
  let decryptedAccountNames = '';

  beforeAll(async () => {
    jest.setTimeout(200000);
    await TestHelpers.reverseServerPort();

    const mockServer = await startMockServer();

    const { userStorageMockttpControllerInstance } = await mockIdentityServices(
      mockServer,
    );

    userStorageMockttpControllerInstance.setupPath('accounts', mockServer, {
      getResponse: accountsSyncMockResponse,
    });

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
    await stopMockServer();
  });

  it('syncs newly added accounts with custom names', async () => {
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
      IDENTITY_TEAM_SEED_PHRASE,
      IDENTITY_TEAM_PASSWORD,
    );

    await WalletView.tapIdenticon();
    await Assertions.checkIfVisible(AccountListBottomSheet.accountList);

    await Assertions.checkIfVisible(
      AccountListBottomSheet.getAccountElementByAccountName(NEW_ACCOUNT_NAME),
    );
  });
});
