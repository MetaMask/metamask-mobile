/**
 * Test IDs for the Manage Accounts screen.
 *
 * Static IDs follow the `AccountHub.testIds.ts` style. Rows and section
 * headers repeat per item, so they are derived through getters keyed by the
 * account group ID / wallet name.
 */
export const ManageAccountsViewSelectorsIDs = {
  CONTAINER: 'manage-accounts-container',
  BACK_BUTTON: 'manage-accounts-back-button',
  ACCOUNT_LIST: 'manage-accounts-account-list',
  ADD_WALLET_BUTTON: 'manage-accounts-add-wallet-button',
} as const;

const ROW_ID_PREFIX = 'manage-accounts-row-';
const ROW_EYE_TOGGLE_ID_PREFIX = 'manage-accounts-row-eye-toggle-';
const ROW_REMOVE_ID_PREFIX = 'manage-accounts-row-remove-';
const SECTION_HEADER_ID_PREFIX = 'manage-accounts-section-header-';
const SECTION_HEADER_REMOVE_ID_PREFIX =
  'manage-accounts-section-header-remove-';
const ADD_ACCOUNT_FOOTER_ID_PREFIX = 'manage-accounts-add-account-footer-';

/** Normalizes a wallet name into a stable test-ID slug. */
const toTestIdSlug = (value: string): string =>
  value.trim().toLowerCase().replace(/\s+/g, '-');

/** Test ID for the management row of a single account group. */
export const getManageAccountRowId = (groupId: string): string =>
  `${ROW_ID_PREFIX}${groupId}`;

/** Test ID for the eye toggle (hide/unhide) on a management row. */
export const getManageAccountRowEyeToggleId = (groupId: string): string =>
  `${ROW_EYE_TOGGLE_ID_PREFIX}${groupId}`;

/** Test ID for the remove (minus) control on a management row. */
export const getManageAccountRowRemoveId = (groupId: string): string =>
  `${ROW_REMOVE_ID_PREFIX}${groupId}`;

/** Test ID for a wallet section header. */
export const getManageAccountSectionHeaderId = (walletName: string): string =>
  `${SECTION_HEADER_ID_PREFIX}${toTestIdSlug(walletName)}`;

/** Test ID for the remove control on a wallet section header. */
export const getManageAccountSectionHeaderRemoveId = (
  walletName: string,
): string => `${SECTION_HEADER_REMOVE_ID_PREFIX}${toTestIdSlug(walletName)}`;

/** Test ID for the "Add account" footer of a wallet section. */
export const getManageAccountAddAccountFooterId = (
  walletName: string,
): string => `${ADD_ACCOUNT_FOOTER_ID_PREFIX}${toTestIdSlug(walletName)}`;
