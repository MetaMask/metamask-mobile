import { loginToApp } from '../../../page-objects/viewHelper.ts';
import TestHelpers from '../../../helpers';
import WalletView from '../../../page-objects/wallet/WalletView';
import AccountListBottomSheet from '../../../page-objects/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { SmokeIdentity } from '../../../tags';
import { withIdentityFixtures } from '../utils/withIdentityFixtures';
import { arrangeTestUtils } from '../utils/helpers';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController';
import TabBarComponent from '../../../page-objects/wallet/TabBarComponent';
import SettingsView from '../../../page-objects/Settings/SettingsView';
import BackupAndSyncView from '../../../page-objects/Settings/BackupAndSyncView';
import CommonView from '../../../page-objects/CommonView.ts';
import { createUserStorageController } from '../utils/mocks';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../api-mocking/mock-responses/feature-flags-mocks';

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

  it('syncs new accounts when account sync is enabled and excludes accounts created when sync is disabled', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_GROUPS_FEATURE_KEY,
          USER_STORAGE_WALLETS_FEATURE_KEY,
        ],
        sharedUserStorageController,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(true),
          );
        },
      },
      async ({ userStorageMockttpController }) => {
        // Phase 1: Initial setup and verification of default account
        await loginToApp();
        // KDF Delay
        await TestHelpers.delay(3000);

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
          AccountListBottomSheet.getAccountElementByAccountNameV2(
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
        await AccountListBottomSheet.tapAddAccountButtonV2();

        // Wait for sync operation to complete
        await waitUntilEventsEmittedNumberEquals(1);

        // Verify second account was created successfully
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
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
        // Close settings drawer (opened from hamburger menu) to return to wallet view
        await SettingsView.tapCloseButton();
        await Assertions.expectElementToBeVisible(WalletView.container);
        // Wait for settings drawer to fully close and tab bar to be visible
        await Assertions.expectElementToBeVisible(
          TabBarComponent.tabBarWalletButton,
        );

        // Create third account with sync disabled - this should NOT sync to user storage
        await WalletView.tapIdenticon();
        await AccountListBottomSheet.tapAddAccountButtonV2();

        // Verify third account was created locally
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
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
        userStorageFeatures: [
          USER_STORAGE_GROUPS_FEATURE_KEY,
          USER_STORAGE_WALLETS_FEATURE_KEY,
        ],
        sharedUserStorageController,
        testSpecificMock: async (mockServer) => {
          await setupRemoteFeatureFlagsMock(
            mockServer,
            remoteFeatureMultichainAccountsAccountDetailsV2(true),
          );
        },
      },
      async () => {
        // Login to fresh app instance to test sync restoration
        await loginToApp();
        // KDF Delay
        await TestHelpers.delay(3000);

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
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account with name "${accountName}" should be visible`,
            },
          );
        }

        // Verify third account (created with sync disabled) is NOT restored
        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
            THIRD_ACCOUNT_NAME,
          ),
        );
      },
    );
  });
});
