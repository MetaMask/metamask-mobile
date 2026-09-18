import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  assertAccountCount,
  importAccountViaPrivateKey,
} from '../../flows/accounts.flow.js';
import ManageAccounts from '../../page-objects/MultichainAccounts/ManageAccounts.js';
import RemoveAccount from '../../page-objects/MultichainAccounts/RemoveAccount.js';
import FixtureBuilder from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import { IDENTITY_TEAM_IMPORTED_PRIVATE_KEY } from '../../smoke/identity/utils/constants.js';
import {
  MANAGE_ACCOUNTS_ACCOUNT_1,
  MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID,
  MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_NAME,
  manageAccountsBackAndReopenAccountList,
  manageAccountsLoginAndOpenAccountList,
} from './manage-accounts-utils.js';

/**
 * Removal flows from the Manage Accounts screen:
 *
 * Imported (Simple Key Pair) accounts are removed through the
 * remove-account confirmation sheet
 * (`Routes.SHEET.MULTICHAIN_ACCOUNT_DETAILS.REMOVE_ACCOUNT`), which
 * dismisses back to the Manage Accounts screen and removes the account
 * from the keyring asynchronously.
 *
 * Hardware wallet accounts are NOT removable from this screen (product
 * decision 2026-09-16) — they expose a hide toggle only. Hideable vs
 * remove-only gating is pinned in `manage-accounts-hide-unhide.spec.ts`.
 */
appiumTest.describe(SmokeAccounts('Manage accounts delete'), () => {
  appiumTest(
    'removes an imported private key account',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder().build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await manageAccountsLoginAndOpenAccountList();

          // Import a private key account through the UI.
          await importAccountViaPrivateKey(IDENTITY_TEAM_IMPORTED_PRIVATE_KEY);
          await assertAccountCount(MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_NAME, 1);
          // Exact-match control: 'Imported Account 1' substring-matches
          // 'Account 1', so the control needs exactMatch.
          await assertAccountCount(MANAGE_ACCOUNTS_ACCOUNT_1, 1, 5000, true);

          await ManageAccounts.tapManageAccountsButton();
          await ManageAccounts.tapRemoveButton(
            MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID,
          );

          // The sheet's container wrapper reports isDisplayed=false while on
          // screen (bottom-sheet flattening) — assert existence, not
          // visibility, per the framework guidance in AppiumAssertions.
          await Assertions.expectElementToExist(RemoveAccount.container, {
            timeout: 10_000,
            description: 'Remove account confirmation sheet should be present',
          });
          // Its children DO report visible — assert one for a stronger check.
          await Assertions.expectElementToBeVisible(
            RemoveAccount.removeButton,
            {
              timeout: 10_000,
              description: 'Remove account confirm button should be visible',
            },
          );
          await RemoveAccount.tapRemoveButton();

          // The sheet dismisses back to Manage Accounts; the keyring removal
          // itself is async, so return to the account list and wait out the
          // count change.
          await manageAccountsBackAndReopenAccountList();

          await assertAccountCount(
            MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_NAME,
            0,
            10_000,
          );
          await assertAccountCount(MANAGE_ACCOUNTS_ACCOUNT_1, 1, 5000, true);
        },
      );
    },
  );
});
