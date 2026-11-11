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
