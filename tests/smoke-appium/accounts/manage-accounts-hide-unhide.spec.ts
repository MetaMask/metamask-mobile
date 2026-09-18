import { test as appiumTest } from '../../framework/fixtures/playwright/index.js';
import { SmokeAccounts } from '../../tags.js';
import {
  assertAccountCount,
  importAccountViaPrivateKey,
} from '../../flows/accounts.flow.js';
import ManageAccounts from '../../page-objects/MultichainAccounts/ManageAccounts.js';
import FixtureBuilder, {
  DEFAULT_FIXTURE_HD_KEYRING_1_ID,
} from '../../framework/fixtures/FixtureBuilder.js';
import { withFixtures } from '../../framework/fixtures/FixtureHelper.js';
import Assertions from '../../framework/Assertions.js';
import { IDENTITY_TEAM_IMPORTED_PRIVATE_KEY } from '../../smoke/identity/utils/constants.js';
import {
  MANAGE_ACCOUNTS_ACCOUNT_1,
  MANAGE_ACCOUNTS_ACCOUNT_1_HD_IMPORT_COUNT,
  MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME,
  MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_GROUP_ID,
  MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_NAME,
  MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID,
  MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_NAME,
  manageAccountsBackAndReopenAccountList,
  manageAccountsLoginAndOpenAccountList,
} from './manage-accounts-utils.js';

/**
 * Account group ID of {@link MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME} in the
 * primary fixture HD wallet.
 *
 * The fixture's vault carries a deterministic keyring `metadata.id` (entropy
 * source), so the AccountTreeController builds a stable group ID for it:
 * `entropy:<entropySource>/<index>`. The address is the second one in the
 * keyring, so its group index is `1`.
 */
const ACCOUNT_2_GROUP_ID = `entropy:${DEFAULT_FIXTURE_HD_KEYRING_1_ID}/1`;

/**
 * The Manage Accounts screen lets a user hide an entropy or hardware account
 * group; the account list must then drop it, and unhiding must bring it back.
 * Hiding is display-only, so the KeyringController keeps the account —
 * otherwise unhiding could never restore the group.
 *
 * Imported accounts are NOT hideable (product decision 2026-09-10,
 * docs/account-management/manage-accounts-screen.md) — the remove-only test
 * below pins that gating. Their removal flow lives in
 * `manage-accounts-delete-accounts.spec.ts`.
 *
 * Hardware accounts ARE hideable and are NOT removable from this screen
 * (product decision 2026-09-16).
 */
appiumTest.describe(SmokeAccounts('Manage accounts hide/unhide'), () => {
  appiumTest(
    'hides and unhides an account group and reflects it in the account list',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await manageAccountsLoginAndOpenAccountList();

          // Baseline: Account 2 is unique; Account 1 is not — the imported HD
          // keyring's first group also renders as exact 'Account 1'.
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_1,
            MANAGE_ACCOUNTS_ACCOUNT_1_HD_IMPORT_COUNT,
            5000,
            true,
          );
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME,
            1,
            5000,
            true,
          );

          // Hide Account 2 from the Manage Accounts screen.
          await ManageAccounts.tapManageAccountsButton();
          await ManageAccounts.tapHideToggle(ACCOUNT_2_GROUP_ID);
          await manageAccountsBackAndReopenAccountList();

          // Hidden: Account 2 disappears; both Account 1 rows stay.
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME,
            0,
            10_000,
            true,
          );
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_1,
            MANAGE_ACCOUNTS_ACCOUNT_1_HD_IMPORT_COUNT,
            5000,
            true,
          );

          // Unhide it again and confirm it reappears.
          await ManageAccounts.tapManageAccountsButton();
          await ManageAccounts.tapHideToggle(ACCOUNT_2_GROUP_ID);
          await manageAccountsBackAndReopenAccountList();

          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME,
            1,
            10_000,
            true,
          );
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_1,
            MANAGE_ACCOUNTS_ACCOUNT_1_HD_IMPORT_COUNT,
            5000,
            true,
          );
        },
      );
    },
  );

  /**
   * Product decision 2026-09-10 (docs/account-management/manage-accounts-screen.md):
   * imported accounts are NOT hideable — the row exposes the remove control
   * only. Removal flow coverage lives in
   * `manage-accounts-delete-accounts.spec.ts`.
   */
  appiumTest(
    'renders remove-only controls for an imported private key account',
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
          await Assertions.expectElementToBeVisible(
            ManageAccounts.getRow(MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID),
            {
              timeout: 10_000,
              description: 'Imported account row should be visible',
            },
          );
          await Assertions.expectElementToBeVisible(
            ManageAccounts.getRemoveButton(
              MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID,
            ),
            {
              timeout: 10_000,
              description: 'Imported account remove control should be visible',
            },
          );
          await Assertions.expectElementToNotBeVisible(
            ManageAccounts.getHideToggle(
              MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID,
            ),
            {
              timeout: 5_000,
              description:
                'Imported account hide toggle should not be present (not hideable)',
            },
          );
        },
      );
    },
  );

  /**
   * Product decision 2026-09-16 (docs/account-management/manage-accounts-screen.md):
   * hardware wallet accounts are hideable and are NOT removable from this
   * screen — the row exposes the eye toggle only. Hardware removal remains
   * on the account-actions sheet, not Manage Accounts.
   */
  appiumTest(
    'renders hide-only controls for a QR hardware wallet account',
    async ({ driver: _driver, currentDeviceDetails }) => {
      await withFixtures(
        {
          fixture: new FixtureBuilder()
            .withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountOneQrAccountOneSimpleKeyPairAccount()
            .build(),
          restartDevice: true,
          currentDeviceDetails,
        },
        async () => {
          await manageAccountsLoginAndOpenAccountList();

          // Baseline: the fixture's QR hardware account shows up in the
          // account list next to the primary HD accounts.
          await assertAccountCount(MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_NAME, 1);
          await assertAccountCount(
            MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME,
            1,
            5000,
            true,
          );

          await ManageAccounts.tapManageAccountsButton();
          await Assertions.expectElementToBeVisible(
            ManageAccounts.getRow(MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_GROUP_ID),
            {
              timeout: 10_000,
              description: 'QR hardware account row should be visible',
            },
          );
          await Assertions.expectElementToBeVisible(
            ManageAccounts.getHideToggle(
              MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_GROUP_ID,
            ),
            {
              timeout: 10_000,
              description: 'QR hardware account hide toggle should be visible',
            },
          );
          await Assertions.expectElementToNotBeVisible(
            ManageAccounts.getRemoveButton(
              MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_GROUP_ID,
            ),
            {
              timeout: 5_000,
              description:
                'QR hardware account remove control should not be present (not removable from this screen)',
            },
          );
        },
      );
    },
  );
});
