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
import { SmokeWalletPlatform } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import CommonView from '../../../pages/CommonView';

describe(
  SmokeWalletPlatform(
    'Sync and Backup settings - Account Sync toggle',
  ),
  () => {
    const ADDED_ACCOUNT = 'Account 3';
    const TEST_SPECIFIC_MOCK_SERVER_PORT = 8000;
    let decryptedAccountNames = '';
    let mockServer;

    beforeAll(async () => {
      await TestHelpers.reverseServerPort();

      mockServer = await startMockServer({}, TEST_SPECIFIC_MOCK_SERVER_PORT);

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
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
      });
    });

    afterAll(async () => {
      if (mockServer) {
        await stopMockServer(mockServer);
      }
    });

    it('should not sync new accounts when accounts sync toggle is off ', async () => {
      await importWalletWithRecoveryPhrase(
        {
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        }
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(4000);

      for (const accountName of decryptedAccountNames) {
        await Assertions.checkIfVisible(
          AccountListBottomSheet.getAccountElementByAccountName(accountName),
        );
      }

      await AccountListBottomSheet.swipeToDismissAccountsModal();
      await Assertions.checkIfNotVisible(
        AccountListBottomSheet.accountList,
      );

      await TabBarComponent.tapSettings();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton);
      await SettingsView.tapBackupAndSync();

      await Assertions.checkIfVisible(BackupAndSyncView.backupAndSyncToggle);
      await BackupAndSyncView.toggleAccountSync();
      await TestHelpers.delay(2000);

      await CommonView.tapBackButton();
      await Assertions.checkIfVisible(SettingsView.backupAndSyncSectionButton);
      await TabBarComponent.tapWallet();
      await Assertions.checkIfVisible(WalletView.container);

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(2000);

      await AccountListBottomSheet.tapAddAccountButton();
      await AddAccountBottomSheet.tapCreateAccount();

      await Assertions.checkIfElementToHaveText(
        WalletView.accountName,
        ADDED_ACCOUNT,
      );

      await TestHelpers.launchApp({
        newInstance: true,
        delete: true,
        launchArgs: { mockServerPort: String(TEST_SPECIFIC_MOCK_SERVER_PORT) },
      });


      await importWalletWithRecoveryPhrase(
        {
          seedPhrase: IDENTITY_TEAM_SEED_PHRASE,
          password: IDENTITY_TEAM_PASSWORD,
        }
      );

      await WalletView.tapIdenticon();
      await Assertions.checkIfVisible(AccountListBottomSheet.accountList);
      await TestHelpers.delay(2000);

      await Assertions.checkIfNotVisible(
        AccountListBottomSheet.getAccountElementByAccountName(ADDED_ACCOUNT),
      );
    });
  },
);
