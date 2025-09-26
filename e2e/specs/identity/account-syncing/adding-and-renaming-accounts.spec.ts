import { loginToApp } from '../../../viewHelper';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { SmokeIdentity } from '../../../tags';
import { withIdentityFixtures } from '../utils/withIdentityFixtures';
import { arrangeTestUtils } from '../utils/helpers';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController';
import { createUserStorageController } from '../utils/mocks';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import AccountDetails from '../../../pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../../pages/MultichainAccounts/EditAccountName';
import TestHelpers from '../../../helpers';

describe(
  SmokeIdentity('Account syncing - Adding and Renaming Accounts'),
  () => {
    let sharedUserStorageController: UserStorageMockttpController;

    beforeAll(async () => {
      sharedUserStorageController = createUserStorageController();
    });

    const DEFAULT_ACCOUNT_NAME = 'Account 1';
    const ADDED_ACCOUNT_NAME = 'Account 2';
    const NEW_ACCOUNT_NAME = 'RENAMED ACCOUNT';
    const LAST_ACCOUNT_NAME = 'Account 3';

    /**
     * This test verifies the complete account syncing flow for adding and renaming accounts across three phases:
     * Phase 1: From a loaded state with account syncing enabled, add a new account to the wallet and verify it syncs to user storage, checking that both the default account and newly added account are visible.
     * Phase 2: Login to a fresh app instance, verify the previously added account persists, rename the second account, and add a third account to test multi-operation syncing.
     * Phase 3: Complete onboarding flow from scratch to verify all account changes (additions and renames) are properly synced and persisted across app reinstallation.
     */

    it('adds a new account and syncs it', async () => {
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

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            },
          );

          const { prepareEventsEmittedCounter } = arrangeTestUtils(
            userStorageMockttpController,
          );
          const { waitUntilEventsEmittedNumberEquals } =
            prepareEventsEmittedCounter(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
            );

          await AccountListBottomSheet.tapAddAccountButtonV2();
          await waitUntilEventsEmittedNumberEquals(1);

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              ADDED_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${ADDED_ACCOUNT_NAME}" should be visible`,
            },
          );
        },
      );

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
        async ({ mockServer: _mockServer, userStorageMockttpController }) => {
          const { prepareEventsEmittedCounter } = arrangeTestUtils(
            userStorageMockttpController,
          );
          const { waitUntilEventsEmittedNumberEquals } =
            prepareEventsEmittedCounter(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
            );

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

          // Should see default account
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            },
          );

          // Should ALSO see the account added in the previous test
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              ADDED_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${ADDED_ACCOUNT_NAME}" from previous test should still be visible`,
            },
          );

          // Rename the second account
          await AccountListBottomSheet.tapAccountEllipsisButtonV2(1);
          await AccountDetails.tapEditAccountName();
          await EditAccountName.updateAccountName(NEW_ACCOUNT_NAME);
          await EditAccountName.tapSave();

          // Bottom sheet remains open after renaming account
          await AccountDetails.tapBackButton();

          await AccountListBottomSheet.tapAddAccountButtonV2();

          await waitUntilEventsEmittedNumberEquals(2);
        },
      );

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
          await loginToApp();
          // KDF Delay
          await TestHelpers.delay(3000);

          await device.disableSynchronization();

          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description: 'Account List Bottom Sheet should be visible',
            },
          );

          // Should see default account
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            },
          );

          // Should still see the account added in the previous test, with new name
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              NEW_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${NEW_ACCOUNT_NAME}" from previous test should still be visible`,
            },
          );

          // Should also see the 3rd account added in the previous test
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              LAST_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${LAST_ACCOUNT_NAME}" from previous test should still be visible`,
            },
          );
        },
      );
    });
  },
);
