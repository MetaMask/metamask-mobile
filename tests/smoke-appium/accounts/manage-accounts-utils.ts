import {
  loginToAppPlaywright,
  ensureAccountListOpenPlaywright,
  dismissPushNotificationExistingUserSheet,
} from '../../flows/wallet.flow.js';
import ManageAccounts from '../../page-objects/MultichainAccounts/ManageAccounts.js';

/** Default entropy group name for the first account in an HD wallet. */
export const MANAGE_ACCOUNTS_ACCOUNT_1 = 'Account 1';

/** Address derived from IDENTITY_TEAM_IMPORTED_PRIVATE_KEY. */
export const MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_ADDRESS =
  '0x5a8aad80ba54a6cf8c41a0ce9663ef84fa2eb74a';

/**
 * Group ID `keyring:Simple Key Pair/<address>`. KeyringController stores
 * EVM addresses lower-cased, so the group ID uses the lower-case address.
 */
export const MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_GROUP_ID = `keyring:Simple Key Pair/${MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_ADDRESS}`;

/** Computed default name for the first Simple Key Pair group. */
export const MANAGE_ACCOUNTS_IMPORTED_ACCOUNT_NAME = 'Imported Account 1';

/** Address of the QR hardware account seeded by the QR-combo fixture. */
export const MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_ADDRESS =
  '0x428f04e9ea21b31090d377f24501065cbb48512f';

/**
 * Group ID `keyring:QR Hardware Wallet Device/<address>`. The account tree
 * is always recomputed at startup, so the fixture's seeded `/ethereum`
 * group ID is never valid at runtime.
 */
export const MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_GROUP_ID = `keyring:QR Hardware Wallet Device/${MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_ADDRESS}`;

/** Computed default name for the first QR hardware wallet group. */
export const MANAGE_ACCOUNTS_HARDWARE_ACCOUNT_NAME = 'QR Account 1';

/**
 * Only collision-free control name in the two-HD-keyring fixtures
 * (`withImportedHdKeyringAndTwoDefaultAccountsOneImportedHdAccountKeyringController`
 * and the QR-combo fixture): each second HD key tree's first group also
 * renders as an exact 'Account 1' row.
 */
export const MANAGE_ACCOUNTS_ACCOUNT_2_CONTROL_NAME = 'Account 2';

/**
 * Exact 'Account 1' count in those same two-HD-keyring fixtures: the primary
 * HD wallet's first group plus the imported HD keyring's first group.
 */
export const MANAGE_ACCOUNTS_ACCOUNT_1_HD_IMPORT_COUNT = 2;

/**
 * Logs in and opens the account list, dismissing the push-notification
 * opt-in sheet when present (no-op otherwise).
 */
export const manageAccountsLoginAndOpenAccountList =
  async (): Promise<void> => {
    await loginToAppPlaywright({ scenarioType: 'e2e' });
    await dismissPushNotificationExistingUserSheet();
    await ensureAccountListOpenPlaywright();
  };

/**
 * Returns from Manage Accounts and reopens the account list — back
 * navigation does not reliably land on the account-list sheet.
 */
export const manageAccountsBackAndReopenAccountList =
  async (): Promise<void> => {
    await ManageAccounts.tapBackButton();
    await ensureAccountListOpenPlaywright();
  };
