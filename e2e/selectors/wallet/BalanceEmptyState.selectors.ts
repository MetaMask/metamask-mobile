export const BalanceEmptyStateSelectorsIDs = {
  CONTAINER: 'account-group-balance-empty-state',
  IMAGE: 'account-group-balance-empty-state-image',
  TITLE: 'account-group-balance-empty-state-title',
  SUBTITLE: 'account-group-balance-empty-state-subtitle',
  ACTION_BUTTON: 'account-group-balance-empty-state-action-button',
} as const;

export type BalanceEmptyStateSelectorsIDsType =
  typeof BalanceEmptyStateSelectorsIDs;
