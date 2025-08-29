import { loginToApp } from '../../../viewHelper';
import TestHelpers from '../../../helpers.js';
import WalletView from '../../../pages/wallet/WalletView';
import AccountListBottomSheet from '../../../pages/wallet/AccountListBottomSheet';
import Assertions from '../../../framework/Assertions';
import { RegressionIdentity } from '../../../tags.js';
import { USER_STORAGE_FEATURE_NAMES } from '@metamask/profile-sync-controller/sdk';
import { withIdentityFixtures } from '../utils/withIdentityFixtures.ts';
import { arrangeTestUtils } from '../utils/helpers.ts';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../utils/user-storage/userStorageMockttpController.ts';
import AddAccountBottomSheet from '../../../pages/wallet/AddAccountBottomSheet';
import ImportAccountView from '../../../pages/importAccount/ImportAccountView';
import SuccessImportAccountView from '../../../pages/importAccount/SuccessImportAccountView';
import { IDENTITY_TEAM_IMPORTED_PRIVATE_KEY } from '../utils/constants.ts';
import { createUserStorageController } from '../utils/mocks.ts';

describe(
  RegressionIdentity('Account syncing - Unsupported Account types'),
  () => {
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

    it('should not sync imported accounts and exclude them when logging into a fresh app instance', async () => {
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
          await Assertions.expectElementToBeVisible(
            ImportAccountView.container,
          );
          await ImportAccountView.enterPrivateKey(
            IDENTITY_TEAM_IMPORTED_PRIVATE_KEY,
          );
          await Assertions.expectElementToBeVisible(
            SuccessImportAccountView.container,
          );
          await SuccessImportAccountView.tapCloseButton();
          await AccountListBottomSheet.swipeToDismissAccountsModal();
          await Assertions.expectElementToBeVisible(WalletView.container);
          await WalletView.tapIdenticon();

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
              IMPORTED_ACCOUNT_NAME,
            ),
            {
              description: `Account with name "${IMPORTED_ACCOUNT_NAME}" should be visible`,
            },
          );
        },
      );

      await withIdentityFixtures(
        {
          userStorageFeatures: [USER_STORAGE_FEATURE_NAMES.accounts],
          sharedUserStorageController,
        },
        async () => {
          await loginToApp();
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
              AccountListBottomSheet.getAccountElementByAccountName(
                accountName,
              ),
              {
                description: `Account with name "${accountName}" should be visible`,
              },
            );
          }

          await Assertions.expectElementToNotBeVisible(
            AccountListBottomSheet.getAccountElementByAccountName(
              IMPORTED_ACCOUNT_NAME,
            ),
          );
        },
      );
    });
  },
);
