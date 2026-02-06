import { loginToApp } from '../../../../e2e/viewHelper';
import TestHelpers from '../../../../e2e/helpers';
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
import AddAccountBottomSheet from '../../../../e2e/pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../../../e2e/pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../../../e2e/pages/importAccount/SuccessImportAccountView';
import { IDENTITY_TEAM_IMPORTED_PRIVATE_KEY } from '../utils/constants';
import { createUserStorageController } from '../utils/mocks';
import {
  USER_STORAGE_GROUPS_FEATURE_KEY,
  USER_STORAGE_WALLETS_FEATURE_KEY,
} from '@metamask/account-tree-controller';

describe(SmokeIdentity('Account syncing - Unsupported Account types'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  beforeAll(async () => {
    await TestHelpers.reverseServerPort();
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const IMPORTED_ACCOUNT_NAME = 'Account 3';
  /**
   * This test verifies that imported accounts are not synced to user storage:
   * Phase 1: Create regular accounts and import a private key account
   * Phase 2: Verify the imported account is visible in the current session
   * Phase 3: Login to a fresh app instance and verify only regular accounts persist (imported accounts are excluded)
   */

  it('does not sync imported accounts and excludes them when logging into a fresh app instance', async () => {
    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_GROUPS_FEATURE_KEY,
          USER_STORAGE_WALLETS_FEATURE_KEY,
        ],
        sharedUserStorageController,
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
            SECOND_ACCOUNT_NAME,
          ),
          {
            description: `Account with name "${SECOND_ACCOUNT_NAME}" should be visible`,
          },
        );

        await Assertions.expectElementToBeVisible(
          AccountListBottomSheet.accountList,
        );

        await AccountListBottomSheet.tapAddAccountButton();
        await AddAccountBottomSheet.tapImportAccount();
        await Assertions.expectElementToBeVisible(ImportAccountView.container);
        await ImportAccountView.enterPrivateKey(
          IDENTITY_TEAM_IMPORTED_PRIVATE_KEY,
        );
        await Assertions.expectElementToBeVisible(
          SuccessImportAccountView.container,
        );
        await SuccessImportAccountView.tapCloseButton();

        // Right now there's a bug in the naming of imported accounts, so we just wait a while and reload the app
        await TestHelpers.delay(2000);
      },
    );

    await withIdentityFixtures(
      {
        userStorageFeatures: [
          USER_STORAGE_GROUPS_FEATURE_KEY,
          USER_STORAGE_WALLETS_FEATURE_KEY,
        ],
        sharedUserStorageController,
      },
      async () => {
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

        await Assertions.expectElementToNotBeVisible(
          AccountListBottomSheet.getAccountElementByAccountNameV2(
            IMPORTED_ACCOUNT_NAME,
          ),
        );
      },
    );
  });
});
