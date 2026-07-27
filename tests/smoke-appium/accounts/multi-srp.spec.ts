import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  loginAndOpenAccountList,
  waitForWalletHomePlaywright,
} from '../../flows/wallet.flow.js';
import WalletView from '../../page-objects/wallet/WalletView.js';
import AccountListBottomSheet from '../../page-objects/wallet/AccountListBottomSheet.js';
import {
  assertAccountCount,
  inputSrp,
  openImportSrpFromAccountList,
  renameAccountAtIndex,
} from '../../flows/accounts.flow.js';
import { withIdentityFixtures } from '../../smoke/identity/utils/withIdentityFixtures.js';
import { arrangeTestUtils } from '../../smoke/identity/utils/helpers.js';
import {
  UserStorageMockttpControllerEvents,
  UserStorageMockttpController,
} from '../../smoke/identity/utils/user-storage/userStorageMockttpController.js';
import { createUserStorageController } from '../../smoke/identity/utils/mocks.js';
import { IDENTITY_TEAM_SEED_PHRASE_2 } from '../../smoke/identity/utils/constants.js';
import ImportSrpView from '../../page-objects/importSrp/ImportSrpView.js';
import ToastModal from '../../page-objects/wallet/ToastModal.js';
import { identityFixtureOptions } from './identity-fixture-options.js';

appiumTest.describe(SmokeAccounts('Account syncing - Multiple SRPs'), () => {
  let sharedUserStorageController: UserStorageMockttpController;

  appiumTest.beforeAll(() => {
    sharedUserStorageController = createUserStorageController();
  });

  const DEFAULT_ACCOUNT_NAME = 'Account 1';
  const SECOND_ACCOUNT_NAME = 'Account 2';
  const SRP_2_RENAMED_ACCOUNT = 'Number 4';

  appiumTest(
    'adds accounts across multiple SRPs and syncs them',
    async ({ driver: _driver, currentDeviceDetails }) => {
      const fixtureOptions = identityFixtureOptions(
        sharedUserStorageController,
        currentDeviceDetails,
      );

      // Phase 1: Wait for the initial full sync, then add an account on SRP 1,
      // import SRP 2, add and rename an account on SRP 2, and verify each
      // mutation is reflected in the mocked user-storage backend.
      await withIdentityFixtures(
        fixtureOptions,
        async ({ userStorageMockttpController }) => {
          await loginAndOpenAccountList({
            scenarioType: 'e2e',
            walletTimeout: 15_000,
          });
          await assertAccountCount(DEFAULT_ACCOUNT_NAME, 1);

          const {
            prepareEventsEmittedCounter,
            waitUntilSyncedAccountsNumberEquals,
          } = arrangeTestUtils(userStorageMockttpController);

          await waitUntilSyncedAccountsNumberEquals(1);

          const { waitUntilEventsEmittedNumberEquals } =
            prepareEventsEmittedCounter(
              UserStorageMockttpControllerEvents.PUT_SINGLE,
            );

          await AccountListBottomSheet.tapAddAccountButtonV2();
          await waitUntilSyncedAccountsNumberEquals(2);
          await assertAccountCount(SECOND_ACCOUNT_NAME, 1);

          await openImportSrpFromAccountList();
          await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
          await ImportSrpView.tapImportButton();
          await waitForWalletHomePlaywright(20_000);
          // Top import-success toast covers the account picker until it dismisses.
          await ToastModal.waitForToastToDismiss();

          await WalletView.tapIdenticon();
          await AccountListBottomSheet.waitForAccountListVisible();
          await waitUntilSyncedAccountsNumberEquals(3);

          await AccountListBottomSheet.tapAddAccountButtonV2({
            srpIndex: 1,
            shouldWait: true,
          });
          await waitUntilSyncedAccountsNumberEquals(4);
          await assertAccountCount(DEFAULT_ACCOUNT_NAME, 2);
          await assertAccountCount(SECOND_ACCOUNT_NAME, 2);

          await renameAccountAtIndex(3, SRP_2_RENAMED_ACCOUNT, {
            shouldWait: true,
          });
          await assertAccountCount(SRP_2_RENAMED_ACCOUNT, 1);

          await waitUntilEventsEmittedNumberEquals(5);
        },
      );

      // Phase 2: Restart the app with the same shared user-storage state.
      // Re-import SRP 2 and verify all accounts from both SRPs are restored.
      await withIdentityFixtures(fixtureOptions, async () => {
        await loginAndOpenAccountList({
          scenarioType: 'e2e',
          walletTimeout: 15_000,
        });
        await openImportSrpFromAccountList();
        await inputSrp(IDENTITY_TEAM_SEED_PHRASE_2);
        await ImportSrpView.tapImportButton();
        await waitForWalletHomePlaywright(20_000);
        // Top import-success toast covers the account picker until it dismisses.
        await ToastModal.waitForToastToDismiss();

        await WalletView.tapIdenticon();
        await AccountListBottomSheet.waitForAccountListVisible();
        for (const [accountName, count] of Object.entries({
          [DEFAULT_ACCOUNT_NAME]: 2,
          [SECOND_ACCOUNT_NAME]: 1,
          [SRP_2_RENAMED_ACCOUNT]: 1,
        })) {
          await assertAccountCount(accountName, count, 10000);
        }
      });
    },
  );
});
