export const OwnedTokensTestIds = {
  MODE_SWITCH: 'owned-tokens-mode-switch',
  MODE_FIND: 'owned-tokens-mode-find',
  MODE_OWNED: 'owned-tokens-mode-owned',
  LIST: 'owned-tokens-list',
  SEARCH_BUTTON: 'owned-tokens-search-button',
  SEARCH_INPUT: 'owned-tokens-search-input',
  SEARCH_CANCEL: 'owned-tokens-search-cancel',
  FILTER_ALL: 'owned-tokens-filter-all',
  FILTER_HIDDEN: 'owned-tokens-filter-hidden',
  FILTER_UNDETECTED: 'owned-tokens-filter-undetected',
  ADD_BUTTON: 'owned-tokens-add-button',
  EMPTY: 'owned-tokens-empty',
  ERROR: 'owned-tokens-error',
  RETRY: 'owned-tokens-retry',
  NOTICE: 'owned-tokens-partial-notice',
  NOTICE_DISMISS: 'owned-tokens-partial-notice-dismiss',
  SKELETON: 'owned-tokens-skeleton',
  WARNING_SHEET: 'owned-tokens-warning-sheet',
  WARNING_CONFIRM: 'owned-tokens-warning-confirm',
  WARNING_CANCEL: 'owned-tokens-warning-cancel',
  OFFLINE: 'owned-tokens-offline',
} as const;

export const ownedTokenRowTestId = (rowKey: string): string =>
  `owned-token-row-${rowKey}`;
