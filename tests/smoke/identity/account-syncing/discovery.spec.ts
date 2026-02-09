import { loginToApp } from '../../../../e2e/viewHelper';
import WalletView from '../../../../e2e/pages/wallet/WalletView';
import AccountListBottomSheet from '../../../../e2e/pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { SmokeIdentity } from '../../../../e2e/tags';
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
import TestHelpers from '../../../../e2e/helpers';

describe(SmokeIdentity('Account syncing - Accounts with activity'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    sharedUserStorageController = createUserStorageController();
  });

  const balancesAccounts = [
    DEFAULT_FIXTURE_ACCOUNT,
    DEFAULT_FIXTURE_ACCOUNT_2,
    '0x08C215b461932f44Fab0D15E5d1FF4C5aF591AF0',
  ];

  it('gracefully handles adding accounts with activity and synced accounts', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_GROUPS_FEATURE_KEY,
          USER_STORAGE_WALLETS_FEATURE_KEY,
        ],
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
        // KDF Delay
        await TestHelpers.delay(5000);

        await WalletView.tapIdenticon();
        // Should see default account
        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2('Account 1'),
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
      },
      async () => {
        await loginToApp();
        // KDF Delay
        await TestHelpers.delay(2000);

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
  });
});
