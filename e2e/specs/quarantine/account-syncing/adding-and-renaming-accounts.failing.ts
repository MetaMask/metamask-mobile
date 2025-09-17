import {
  importWalletWithRecoveryPhrase,
  loginToApp,
} from '../../../viewHelper';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { RegressionIdentity } from '../../../tags';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../../identity/utils/withIdentityFixtures';
import { arrangeTestUtils } from '../../identity/utils/helpers';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../../identity/utils/user-storage/userStorageMockttpController';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import AccountActionsBottomSheet from '../../../pages/wallet/AccountActionsBottomSheet';
import FixtureBuilder from '../../../framework/fixtures/FixtureBuilder';
import { defaultGanacheOptions } from '../../../framework/Constants';
import { createUserStorageController } from '../../identity/utils/mocks';

describe(
  RegressionIdentity('Account syncing - Adding and Renaming Accounts'),
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

    it('should add a new account and sync it', async () => {
      await withIdentityFixtures(
        {
          userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
          sharedUserStorageController,
        },
        async ({ userStorageMockttpController }) => {
          await loginToApp();

          await WalletView.tapIdenticon();

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description: 'Account List Bottom Sheet should be visible',
            },
          );

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
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

          await AccountListBottomSheet.tapAddAccountButton();
          await AddAccountBottomSheet.tapCreateEthereumAccount();
          await waitUntilEventsEmittedNumberEquals(1);

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
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
          userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
          sharedUserStorageController,
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

          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description: 'Account List Bottom Sheet should be visible',
            },
          );

          // Should see default account
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            },
          );

          // Should ALSO see the account added in the previous test
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
              ADDED_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${ADDED_ACCOUNT_NAME}" from previous test should still be visible`,
            },
          );

          // Rename the second account
          await AccountListBottomSheet.tapEditAccountActionsAtIndex(1);
          await AccountActionsBottomSheet.renameActiveAccount(NEW_ACCOUNT_NAME);

          // Bottom sheet remains open after renaming account
          // await WalletView.tapIdenticon();
          await AccountListBottomSheet.tapAddAccountButton();
          await AddAccountBottomSheet.tapCreateEthereumAccount();

          await waitUntilEventsEmittedNumberEquals(2);
        },
      );

      const onboardingFixture = new FixtureBuilder()
        .withOnboardingFixture()
        .build();

      await withIdentityFixtures(
        {
          userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
          sharedUserStorageController,
          fixture: onboardingFixture,
        },
        async () => {
          // Go through onboarding again to ensure accounts and names are synced (sanity check)
          await importWalletWithRecoveryPhrase({
            seedPhrase: defaultGanacheOptions.mnemonic,
          });

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
            AccountListBottomSheet.getAccountElementByAccountName(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            },
          );

          // Should still see the account added in the previous test, with new name
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
              NEW_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${NEW_ACCOUNT_NAME}" from previous test should still be visible`,
            },
          );

          // Should also see the 3rd account added in the previous test
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
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
