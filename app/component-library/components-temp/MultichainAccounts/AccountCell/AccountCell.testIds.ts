export const AccountCellIds = {
  CONTAINER: 'multichain-account-cell-container',
  SELECT: 'multichain-account-cell-select',
  AVATAR: 'multichain-account-cell-avatar',
  ADDRESS: 'multichain-account-cell-address',
  COPY_ADDRESS: 'multichain-account-cell-copy-address',
  BALANCE: 'multichain-account-cell-balance',
  MENU: 'multichain-account-cell-menu',
  CHECK_ICON: 'multichain-account-cell-check-icon',
};

/**
 * Unique ellipsis menu testID for a given account display name.
 */
export const getAccountCellMenuTestId = (accountName: string): string =>
  `${AccountCellIds.MENU}-${accountName}`;

/** Matches per-account menu testIDs: `multichain-account-cell-menu-<name>`. */
export const ACCOUNT_CELL_MENU_TEST_ID = new RegExp(`^${AccountCellIds.MENU}-`);
