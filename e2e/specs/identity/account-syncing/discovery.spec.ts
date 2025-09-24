import { loginToApp } from '../../../viewHelper';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { RegressionIdentity } from '../../../tags';
import { withIdentityFixtures } from '../utils/withIdentityFixtures';
import { arrangeTestUtils } from '../utils/helpers';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController';
import {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../../framework/fixtures/FixtureBuilder';
import { createUserStorageController } from '../utils/mocks';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';
import { setupRemoteFeatureFlagsMock } from '../../../api-mocking/helpers/remoteFeatureFlagsHelper';
import { remoteFeatureMultichainAccountsAccountDetailsV2 } from '../../../api-mocking/mock-responses/feature-flags-mocks';

describe(RegressionIdentity('Account syncing - Accounts with activity'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    sharedUserStorageController = createUserStorageController();
  });

  const balancesAccounts = [
    DEFAULT_FIXTURE_ACCOUNT,
    DEFAULT_FIXTURE_ACCOUNT_2,
    '0x08C215b461932f44Fab0D15E5d1FF4C5aF591AF0',
  ];

  const itif = (condition: boolean) => (condition ? it : it.skip);

  itif(device.getPlatform() === 'ios')(
    'gracefully handles adding accounts with activity and synced accounts',
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
          // Should see default account
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              'Account 1',
            ),
          );

          // Add another second EVM account
          await AccountListBottomSheet.tapAddAccountButtonV2();

          await waitUntilEventsEmittedNumberEquals(1);
        },
      );

      await withIdentityFixtures(
        {
          userStorageFeatures: [
            USER_STORAGE_GROUPS_FEATURE_KEY,
            USER_STORAGE_WALLETS_FEATURE_KEY,
          ],
          sharedUserStorageController,
          mockBalancesAccounts: balancesAccounts,
          testSpecificMock: async (mockServer) => {
            await setupRemoteFeatureFlagsMock(
              mockServer,
              remoteFeatureMultichainAccountsAccountDetailsV2(true),
            );
          },
        },
        async () => {
          await loginToApp();

          await WalletView.tapIdenticon();

          const visibleAccounts = ['Account 1', 'Account 2', 'Account 3']; // Only 2 accounts and synced, the third account is due to balances

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
