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

  const itif = (condition: boolean) => (condition ? it : it.skip);

  // Multi SRP account syncing tests are flaky on Android right now - skipping for Android until more stable
  itif(device.getPlatform() === 'ios')(
    'adds accounts across multiple SRPs and syncs them',
    async () => {
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
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${DEFAULT_ACCOUNT_NAME}" should be visible`,
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
            },
          );
          await AccountListBottomSheet.swipeToDismissAccountsModal(); // the next action taps on the identicon again

          // Add SRP 2
          await device.disableSynchronization();
          await goToImportSrp();
          await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
          await ImportSrpView.tapImportButton();
          // KDF Delay
          await TestHelpers.delay(3000);

          await Assertions.expectElementToBeVisible(WalletView.container);
          await WalletView.tapIdenticon();

          await waitUntilSyncedAccountsNumberEquals(3);

          // Create second account for SRP 2
          await AccountListBottomSheet.tapAddAccountButtonV2({
            srpIndex: 1,
          });

          await waitUntilSyncedAccountsNumberEquals(4);
          await TestHelpers.delay(3000);

          await AccountListBottomSheet.tapAccountEllipsisButtonV2(3);
          await AccountDetails.tapEditAccountName();
          await EditAccountName.updateAccountName(SRP_2_SECOND_ACCOUNT);
          await EditAccountName.tapSave();
          await AccountDetails.tapBackButton();

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              SRP_2_SECOND_ACCOUNT,
            ),
            {
              description: `Account with name "${SRP_2_SECOND_ACCOUNT}" should be visible`,
            },
          );
          await device.enableSynchronization();
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
          // KDF Delay
          await TestHelpers.delay(3000);

          await goToImportSrp();
          await device.disableSynchronization();
          await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
          await ImportSrpView.tapImportButton();
          // KDF Delay
          await TestHelpers.delay(3000);

          await Assertions.expectElementToBeVisible(WalletView.container);
          await WalletView.tapIdenticon();
          await device.enableSynchronization();
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
              },
            );
          }
        },
      );
    },
  );
});
