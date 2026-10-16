/**
 * Entry point that opened the Manage Accounts view, for the
 * `Manage Accounts Viewed` event.
 *
 * String values must match the `source` enum in
 * `segment-schema/libraries/events/metamask-account-mgmt/manage-accounts-viewed.yaml`.
 */
export enum ManageAccountsViewedSource {
  /** The gear in the accounts list header (both wallet header variants). */
  AccountList = 'account_list',
  /** Reserved for a future account menu entry point; unused on mobile today. */
  AccountMenu = 'account_menu',
}

/**
 * Surface an account was hidden or unhidden from, for the `Account Hidden`
 * event.
 *
 * String values must match the `location` enum in
 * `segment-schema/libraries/events/metamask-account-mgmt/account-hidden.yaml`.
 * Kept separate from {@link AccountRemovedLocation} because the two events
 * accept different surfaces.
 */
export enum AccountHiddenLocation {
  /** The visibility toggle on the Manage Accounts screen. */
  ManageAccounts = 'manage_accounts',
  /** Reserved for a future account menu hide action; unused on mobile today. */
  AccountMenu = 'account_menu',
}

/**
 * Surface an account was removed from, for the `Account Removed` event.
 *
 * String values must match the `location` enum in
 * `segment-schema/libraries/events/metamask-account-mgmt/account-removed.yaml`.
 */
export enum AccountRemovedLocation {
  /** The remove action on the Manage Accounts screen. */
  ManageAccounts = 'manage_accounts',
  /** The remove action on an account details screen. */
  AccountDetails = 'account_details',
}
