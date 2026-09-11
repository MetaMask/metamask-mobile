import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginAndOpenAccountList } from '../../flows/wallet.flow.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import { assertAccountCount } from '../../flows/accounts.flow.js';
import { withIdentityFixtures } from '../../smoke/identity/utils/withIdentityFixtures.js';
import { arrangeTestUtils } from '../../smoke/identity/utils/helpers.js';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';
import {
  DEFAULT_FIXTURE_ACCOUNT,
  DEFAULT_FIXTURE_ACCOUNT_2,
} from '../../framework/fixtures/FixtureBuilder.js';
import { identityFixtureOptions } from './identity-fixture-options.js';

appiumTest.describe(
  SmokeAccounts('Account syncing - Accounts with activity'),
  () => {
    let sharedUserStorageController: UserStorageMockttpController;

    appiumTest.beforeAll(() => {
      sharedUserStorageController = createUserStorageController();
    });

    const balancesAccounts = [
      DEFAULT_FIXTURE_ACCOUNT,
      DEFAULT_FIXTURE_ACCOUNT_2,
      '0x08C215b461932f44Fab0D15E5d1FF4C5aF591AF0',
    ];

    appiumTest(
      'gracefully handles adding accounts with activity and synced accounts',
      async ({ driver: _driver, currentDeviceDetails }) => {
        const baseFixtureOptions = identityFixtureOptions(
          sharedUserStorageController,
          currentDeviceDetails,
        );

        // Phase 1: Add Account 2 with sync enabled and verify it is written to
        // user storage (PUT_SINGLE).
        await withIdentityFixtures(
          baseFixtureOptions,
          async ({ userStorageMockttpController }) => {
            const { prepareEventsEmittedCounter } = arrangeTestUtils(
              userStorageMockttpController,
            );
            const { waitUntilEventsEmittedNumberEquals } =
              prepareEventsEmittedCounter(
                UserStorageMockttpControllerEvents.PUT_SINGLE,
              );

            await loginAndOpenAccountList({ scenarioType: 'e2e' });
            await assertAccountCount('Account 1', 1);

            await AccountListBottomSheet.tapAddAccountButtonV2();
            await waitUntilEventsEmittedNumberEquals(1);
            await assertAccountCount('Account 2', 1);
          },
        );

        // Phase 2: Restart with mocked on-chain balances. Account discovery should
        // surface Account 3 from activity while synced Account 1 and 2 are restored.
        await withIdentityFixtures(
          identityFixtureOptions(
            sharedUserStorageController,
            currentDeviceDetails,
            { mockBalancesAccounts: balancesAccounts },
          ),
          async () => {
            await loginAndOpenAccountList({ scenarioType: 'e2e' });

            for (const accountName of ['Account 1', 'Account 2', 'Account 3']) {
              await assertAccountCount(accountName, 1);
            }
          },
        );
      },
    );
  },
);
