import enContent from '../../../../locales/languages/en.json';

export const ConnectedAccountModalSelectorsText = {
  PERMISSION_LINK: enContent.accounts.permissions,
  DISCONNECT_ALL: enContent.accounts.disconnect_all_accounts,
  IMPORTED: enContent.accounts.imported,
  TITLE: enContent.accounts.connected_accounts_title,
  SELECT_ALL: enContent.networks.select_all,
} as const;

export const ConnectedAccountsSelectorsIDs = {
  CONNECT_ACCOUNTS_BUTTON: 'connect-accounts-buttons',
  NETWORK_PICKER: 'accounts-connected-network-picker',
  DISCONNECT_ALL_BUTTON: 'accounts-connected-revoke-button',
  CONTAINER: 'accounts-connected-modal-container',
  DISCONNECT: 'disconnect',
  DISCONNECT_ALL_ACCOUNTS_NETWORKS: 'disconnect_all',
  NAVIGATE_TO_EDIT_ACCOUNTS_PERMISSIONS_BUTTON:
    'navigate_to_edit_accounts_permissions_button',
  NAVIGATE_TO_EDIT_NETWORKS_PERMISSIONS_BUTTON:
    'navigate_to_edit_networks_permissions_button',
  SELECT_ALL_NETWORKS_BUTTON: 'select_all',
  DESELECT_ALL_NETWORKS_BUTTON: 'deselect_all',
  DISCONNECT_NETWORKS_BUTTON: 'disconnect',
  CONFIRM_DISCONNECT_NETWORKS_BUTTON: 'confirm_disconnect_networks',
  MANAGE_PERMISSIONS: 'manage_permissions',
  ACCOUNT_LIST_BOTTOM_SHEET: 'account-list-bottom-sheet',
} as const;

export const PermissionsSummarySelectorsIDs = {
  ACCOUNTS_TAB: 'accounts-tab',
  PERMISSIONS_TAB: 'permissions-tab',
} as const;

export type ConnectedAccountModalSelectorsTextType =
  typeof ConnectedAccountModalSelectorsText;
export type ConnectedAccountsSelectorsIDsType =
  typeof ConnectedAccountsSelectorsIDs;
export type PermissionsSummarySelectorsIDsType =
  typeof PermissionsSummarySelectorsIDs;
