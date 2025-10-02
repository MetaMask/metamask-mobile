import { loginToApp } from '../../../viewHelper';
import TestHelpers from '../../../helpers.js';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions.ts';
import { SmokeIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../utils/withIdentityFixtures.ts';
import { arrangeTestUtils } from '../utils/helpers.ts';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import TabBarComponent from '../../../pages/wallet/TabBarComponent';
import SettingsView from '../../../pages/Settings/SettingsView';
import BackupAndSyncView from '../../../pages/Settings/BackupAndSyncView';
import CommonView from '../../../pages/CommonView';
import { createUserStorageController } from '../utils/mocks.ts';

describe(SmokeIdentity('Account syncing - Setting'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const THIRD_ACCOUNT_NAME = 'Account 3';

  /**
   * This test verifies the account syncing flow for adding accounts with sync toggle functionality:
   * Phase 1: From a loaded state with account syncing enabled, Add a new account with sync enabled and verify it syncs to user storage
   * Phase 2: Disable account sync, add another account, and verify it doesn't sync
   * Phase 3: Login to a fresh app instance and verify only synced accounts persist
   */

  it('should sync new accounts when account sync is enabled and exclude accounts created when sync is disabled', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        sharedUserStorageController,
      },
      async ({ userStorageMockttpController }) => {
        // Phase 1: Initial setup and verification of default account
        await loginToApp();

        // Open account list to verify initial state
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account List Bottom Sheet should be visible',
          },
        );

        // Verify the default account exists
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            DEFAULT_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
          },
        );

        // Set up event listener to track sync operations
        const { prepareEventsEmittedCounter } = arrangeTestUtils(
          userStorageMockttpController,
        );
        const { waitUntilEventsEmittedNumberEquals } =
          prepareEventsEmittedCounter(
            UserStorageMockttpControllerEvents.PUT_SINGLE,
          );

        // Create second account with sync enabled - this should sync to user storage
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();

        // Wait for sync operation to complete
        await waitUntilEventsEmittedNumberEquals(1);

        // Verify second account was created successfully
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            SECOND_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${SECOND_ACCOUNT_NAME}" should be visible`,
          },
        );

        // Phase 2: Disable account sync and create third account
        await AccountListBottomSheet.swipeToDismissAccountsModal();
        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.accountList,
        );

        // Navigate to Settings to toggle account sync
        await TabBarComponent.tapSettings();
        await Assertions.expectElementToBeVisible(
          SettingsView.backupAndSyncSectionButton,
        );
        await SettingsView.tapBackupAndSync();

        // Disable account synchroniz
        await Assertions.expectElementToBeVisible(
          BackupAndSyncView.backupAndSyncToggle,
        );
        await BackupAndSyncView.toggleAccountSync();

        // Navigate back to wallet to create third account
        await CommonView.tapBackButton();
        await Assertions.expectElementToBeVisible(
          SettingsView.backupAndSyncSectionButton,
        );
        await TabBarComponent.tapWallet();
        await Assertions.expectElementToBeVisible(WalletView.container);

        // Create third account with sync disabled - this should NOT sync to user storage
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapCreateEthereumAccount();

        // Verify third account was created locally
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            THIRD_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${THIRD_ACCOUNT_NAME}" should be visible`,
          },
        );
      },
    );

    // Phase 3: Fresh app instance to verify sync persistence
    await withIdentityFixtures(
      {
        userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
        sharedUserStorageController,
      },
      async () => {
        // Login to fresh app instance to test sync restoration
        await loginToApp();
        await WalletView.tapIdenticon();

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
          {
            description: 'Account List Bottom Sheet should be visible',
          },
        );

        // Verify only accounts created with sync enabled are restored
        const visibleAccounts = [DEFAULT_ACCOUNT_NAME, SECOND_ACCOUNT_NAME];

        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(accountName),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }

        // Verify third account (created with sync disabled) is NOT restored
        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.getAccountElementByAccountName(
            THIRD_ACCOUNT_NAME,
          ),
        );
      },
    );
  });
});
