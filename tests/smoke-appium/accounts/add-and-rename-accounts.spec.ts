import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import { loginAndOpenAccountList } from '../../flows/wallet.flow.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import {
  assertAccountCount,
  importAccountViaPrivateKey,
  renameAccountAtIndex,
} from '../../flows/accounts.flow.js';
import { withIdentityFixtures } from '../../smoke/identity/utils/withIdentityFixtures.js';
import { arrangeTestUtils } from '../../smoke/identity/utils/helpers.js';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';
import { IDENTITY_TEAM_IMPORTED_PRIVATE_KEY } from '../../smoke/identity/utils/constants.js';
import Assertions from '../../framework/Assertions.js';
import { sleep } from '../../framework/Utilities.js';
import { identityFixtureOptions } from './identity-fixture-options.js';

appiumTest.describe(SmokeAccounts('Add and rename accounts'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  appiumTest.beforeAll(() => {
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const ADDED_ACCOUNT_NAME = 'Account 2';
  const RENAMED_ACCOUNT_NAME = 'RENAMED ACCOUNT';
  const THIRD_ACCOUNT_NAME = 'Account 3';

  appiumTest(
    'adds accounts, renames one, and syncs changes across app restarts',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions = identityFixtureOptions(
        sharedUserStorageController,
        currentDeviceDetails,
      );

      // Phase 1: Add a new HD account with account sync enabled and verify it is
      // written to the mocked user-storage backend (PUT_SINGLE).
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Default account "${DEFAULT_ACCOUNT_NAME}" should be visible`,
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
          await assertAccountCount(ADDED_ACCOUNT_NAME, 1);
        },
      );

      // Phase 2: Restart the app with the same shared user-storage state. The
      // account added in phase 1 should be restored from sync, then we rename
      // it and add a third account (two PUT_SINGLE events total this phase).
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          const { prepareEventsEmittedCounter } = arrangeTestUtils(
            userStorageMockttpController,
          );
          const { waitUntilEventsEmittedNumberEquals } =
            prepareEventsEmittedCounter(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
            );

          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              DEFAULT_ACCOUNT_NAME,
            ),
            {
              description: `Default account "${DEFAULT_ACCOUNT_NAME}" should persist`,
            },
          );
          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.getAccountElementByAccountNameV2(
              ADDED_ACCOUNT_NAME,
            ),
            {
              description: `Added account "${ADDED_ACCOUNT_NAME}" should persist after restart`,
            },
          );

          await renameAccountAtIndex(1, RENAMED_ACCOUNT_NAME);

          await Assertions.expectElementToBeVisible(
            AccountListBottomSheet.accountList,
            {
              description:
                'Account list should be visible after renaming an account',
              timeout: 10000,
            },
          );

          await AccountListBottomSheet.tapAddAccountButtonV2();
          await waitUntilEventsEmittedNumberEquals(2);
        },
      );

      // Phase 3: Restart again and verify all HD account changes (add + rename)
      // were synced and are visible after login.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenAccountList({ scenarioType: 'e2e' });

        await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);
        await assertAccountCount(RENAMED_ACCOUNT_NAME, 1);
        await assertAccountCount(THIRD_ACCOUNT_NAME, 1);
      });
    },
  );

  const RENAMED_IMPORTED_ACCOUNT_NAME = 'New Imported Account';
  const IMPORTED_ACCOUNT_NAME_AFTER_IMPORT = 'Imported Account 1';
  const IMPORTED_ACCOUNT_INDEX = 1;

  appiumTest(
    'imports an account via private key, renames it without syncing to user storage, and does not persist across app restarts',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const importedAccountUserStorageController =
        createUserStorageController();
      const fixtureOptions = identityFixtureOptions(
        importedAccountUserStorageController,
        currentDeviceDetails,
      );

      // Phase 1: Import via private key, rename in-session. Imported accounts are
      // excluded from user storage, so no PUT_SINGLE should fire during rename.
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          await loginAndOpenAccountList({ scenarioType: 'e2e' });
          await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);

          await importAccountViaPrivateKey(IDENTITY_TEAM_IMPORTED_PRIVATE_KEY);

          // Allow the imported account name to settle in the list.
          await sleep(5000);
          await assertAccountCount(IMPORTED_ACCOUNT_NAME_AFTER_IMPORT, 1);

          let putSingleCount = 0;
          const onPutSingle = (): void => {
            putSingleCount += 1;
          };
          userStorageMockttpController.eventEmitter.on(
            UserStorageMockttpControllerEvents.PUT_SINGLE,
            onPutSingle,
          );

          try {
            await renameAccountAtIndex(
              IMPORTED_ACCOUNT_INDEX,
              RENAMED_IMPORTED_ACCOUNT_NAME,
            );

            // Allow the renamed imported account name to settle in the list.
            await sleep(5000);

            if (putSingleCount !== 0) {
              throw new Error(
                `Renaming an imported account should not call user storage PUT_SINGLE (received ${putSingleCount})`,
              );
            }
          } finally {
            userStorageMockttpController.eventEmitter.off(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
              onPutSingle,
            );
          }

          await assertAccountCount(RENAMED_IMPORTED_ACCOUNT_NAME, 1);
        },
      );

      // Phase 2: Restart the app (fixture reload). UI-imported accounts are not
      // synced and are not in the fixture, so only the default HD account remains.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenAccountList({
          scenarioType: 'e2e',
          accountListDescription:
            'Account list should be visible after restart',
        });

        await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);
        await assertAccountCount(RENAMED_IMPORTED_ACCOUNT_NAME, 0);
        await assertAccountCount(IMPORTED_ACCOUNT_NAME_AFTER_IMPORT, 0);
      });
    },
  );
});
