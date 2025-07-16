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
import { arrangeTestUtils } from '../utils/helpers';
import {
  UserStorageMockttpController,
  UserStorageMockttpControllerEvents,
} from '../utils/user-storage/userStorageMockttpController';
import { Mockttp } from 'mockttp';

describe(
  SmokeIdentity(
    'Account syncing - syncs and retrieves accounts after adding a custom name account',
  ),
  () => {
    const NEW_ACCOUNT_NAME = 'My third account';
    let decryptedAccountNames: string[] = [];
    let mockServer: Mockttp;
    let userStorageMockttpController: UserStorageMockttpController;

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer({});

      const accountsSyncMockResponse = await getAccountsSyncMockResponse();

      const { userStorageMockttpControllerInstance } =
        await mockIdentityServices(mockServer);

      userStorageMockttpController = userStorageMockttpControllerInstance;

      await userStorageMockttpController.setupPath(
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
        launchArgs: { mockServerPort: mockServer.port },
      });
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('syncs newly added accounts with custom names and retrieves same accounts after importing the same SRP', async () => {
      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      for (const accountName of decryptedAccountNames) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      const { prepareEventsEmittedCounter } = arrangeTestUtils(
        userStorageMockttpController,
      );
      const { waitUntilEventsEmittedNumberEquals } =
        prepareEventsEmittedCounter(
          UserStorageMockttpControllerEvents.PUT_SINGLE,
        );

      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();
      await TestHelpers.delay(2000);

      await AccountListBottomSheet.tapEditAccountActionsAtIndex(2);
      await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);

      await waitUntilEventsEmittedNumberEquals(2);

      await Assertions.checkIfElementToHaveText(
        WalletView.accountName,
        NEW_ACCOUNT_NAME,
      );

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: mockServer.port },
      });

      await importWalletWithRecoveryPhrase({
        seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
        password: IDENTITY_TEAM_PASSWORD,
      });

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      await Assertions.checkIfVisible(
        AccountListBottomSheet.getAccountElementByAccountName(NEW_ACCOUNT_NAME),
      );
    });
  },
);
