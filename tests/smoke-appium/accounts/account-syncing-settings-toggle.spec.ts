import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginAndOpenAccountList } from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import {
  assertAccountCount,
  disableAccountSyncViaSettings,
} from '../../flows/accounts.flow.js';
import { withIdentityFixtures } from '../../smoke/identity/utils/withIdentityFixtures.js';
import { arrangeTestUtils } from '../../smoke/identity/utils/helpers.js';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';
import Assertions from '../../framework/Assertions.js';
import { identityFixtureOptions } from './identity-fixture-options.js';

appiumTest.describe(SmokeAccounts('Account syncing - Setting'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  appiumTest.beforeAll(() => {
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const THIRD_ACCOUNT_NAME = 'Account 3';

  appiumTest(
    'syncs new accounts when account sync is enabled and excludes accounts created when sync is disabled',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions = identityFixtureOptions(
        sharedUserStorageController,
        currentDeviceDetails,
      );

      // Phase 1: With account sync enabled, add Account 2 and verify it is written
      // to user storage (PUT_SINGLE). Disable account sync in Settings, then add
      // Account 3 locally — it should not be synced.
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);

          const { prepareEventsEmittedCounter } = arrangeTestUtils(
            userStorageMockttpController,
          );
          const { waitUntilEventsEmittedNumberEquals } =
            prepareEventsEmittedCounter(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
            );

          await AccountListBottomSheet.tapAddAccountButtonV2();
          await waitUntilEventsEmittedNumberEquals(1);
          await assertAccountCount(SECOND_ACCOUNT_NAME, 1);

          await AccountListBottomSheet.tapBackButton();
          await Assertions.expectElementToBeVisible(WalletView.container, {
            description: 'Wallet view should be visible after account list',
          });

          await disableAccountSyncViaSettings();

          await WalletView.tapIdenticon();
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description: 'Account list should be visible after Settings',
            },
          );
          await AccountListBottomSheet.tapAddAccountButtonV2();
          await assertAccountCount(THIRD_ACCOUNT_NAME, 1);
        },
      );

      // Phase 2: Restart the app with the same shared user-storage state. Only
      // accounts created while sync was enabled (Account 1 and 2) should persist;
      // Account 3 (created after sync was disabled) must be absent.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenAccountList({ scenarioType: 'e2e' });

        await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);
        await assertAccountCount(SECOND_ACCOUNT_NAME, 1);
        await assertAccountCount(THIRD_ACCOUNT_NAME, 0);
      });
    },
  );
});
