import { loginToApp } from '../../../viewHelper';
import TestHelpers from '../../../helpers';
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
import { goToImportSrp, inputSrp } from '../../multisrp/utils';
import ImportSrpView from '../../../pages/importSrp/ImportSrpView';
import { IDENTITY_TEAM_SEED_PHRASE_2 } from '../utils/constants';
import { createUserStorageController } from '../utils/mocks';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../api-mocking/mock-responses/feature-flags-mocks';
import AccountDetails from '../../../pages/MultichainAccounts/AccountDetails';
import EditAccountName from '../../../pages/MultichainAccounts/EditAccountName';

describe(SmokeIdentity('Account syncing - Mutiple SRPs'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const SRP_2_FIRST_ACCOUNT = 'Account 1';
  const SRP_2_SECOND_ACCOUNT = 'Number 4';

  /**
   * This test verifies account syncing when adding accounts across multiple SRPs:
   * Phase 1: Starting with the default account, add a second account to the first SRP and verify it syncs.
   * Phase 2: Import a second SRP which automatically creates a third account, then manually create a fourth account on the second SRP with a custom name.
   * Phase 3: Login to a fresh app instance and verify all accounts from both SRPs persist and are visible after importing the second SRP.
   */
  it('adds accounts across multiple SRPs and syncs them', async () => {
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
        await device.disableSynchronization(); // All expected syncs are awaited with retries, so disable auto-sync to avoid test flakiness/hangs

        // Wait for wallet to be ready after login
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'wallet should be visible after login',
          timeout: 15000,
        });

        await WalletView.tapIdenticon();
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
            DEFAULT_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
            timeout: 30000,
          },
        );

        const {
          prepareEventsEmittedCounter,
          waitUntilSyncedAccountsNumberEquals,
        } = arrangeTestUtils(userStorageMockttpController);
        const { waitUntilEventsEmittedNumberEquals } =
          prepareEventsEmittedCounter(
            UserStorageMockttpControllerEvents.PUT_SINGLE,
          );

        await AccountListBottomSheet.tapAddAccountButtonV2();
        await waitUntilEventsEmittedNumberEquals(1);

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
            SECOND_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${SECOND_ACCOUNT_NAME}" should be visible`,
            timeout: 30000,
          },
        );
        await AccountListBottomSheet.swipeToDismissAccountsModal(); // the next action taps on the identicon again

        // Add SRP 2
        await goToImportSrp();
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
        await ImportSrpView.tapImportButton();
        // Wait for wallet to be ready after SRP import
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'wallet should be visible after SRP import',
          timeout: 20000,
        });
        await WalletView.tapIdenticon();

        await waitUntilSyncedAccountsNumberEquals(3);

        // Create second account for SRP 2
        await AccountListBottomSheet.tapAddAccountButtonV2({
          srpIndex: 1,
          shouldWait: true,
        });

        await waitUntilSyncedAccountsNumberEquals(4);

        // Wait for the 4th account's ellipsis button to be visible before tapping
        await Assertions.expectElementToBeVisible(
          await AccountListBottomSheet.getEllipsisMenuButtonAtIndex(3),
          {
            description:
              'ellipsis button for 2nd account on SRP 2 should be visible',
            timeout: 10000,
          },
        );

        // We need to explicitly wait here to avoid having the "Account" added toast appear on top of the EllipsisButton
        await AccountListBottomSheet.tapAccountEllipsisButtonV2(3, {
          shouldWait: true,
        });
        await AccountDetails.tapEditAccountName();
        await EditAccountName.updateAccountName(SRP_2_SECOND_ACCOUNT);
        await EditAccountName.tapSave();
        await AccountDetails.tapBackButton();

        // Wait for navigation to complete and renamed account to be visible
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
            SRP_2_SECOND_ACCOUNT,
          ),
          {
            description: `Account with name "${SRP_2_SECOND_ACCOUNT}" should be visible`,
            timeout: 10000,
          },
        );

        await waitUntilEventsEmittedNumberEquals(5);
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
        await device.disableSynchronization(); // All expected syncs are awaited with retries, so disable auto-sync to avoid test flakiness/hangs
        // Wait for wallet to be ready after login
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'wallet should be visible after login',
          timeout: 15000,
        });

        await goToImportSrp();
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
        await ImportSrpView.tapImportButton();
        // Wait for wallet to be ready after second SRP import
        await Assertions.expectElementToBeVisible(WalletView.container, {
          description: 'wallet should be visible after second SRP import',
          timeout: 20000,
        });

        await WalletView.tapIdenticon();
        const visibleAccounts = [
          DEFAULT_ACCOUNT_NAME,
          SECOND_ACCOUNT_NAME,
          SRP_2_FIRST_ACCOUNT,
          SRP_2_SECOND_ACCOUNT,
        ];

        for (const accountName of visibleAccounts) {
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              accountName,
            ),
            {
              description: `Account with name "${accountName}" should be visible`,
              timeout: 20000,
            },
          );
        }
      },
    );
  });
});
