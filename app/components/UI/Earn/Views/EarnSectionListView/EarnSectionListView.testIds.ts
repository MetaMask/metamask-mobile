export const EARN_SECTION_LIST_TEST_IDS = {
  HEADER: 'earn-section-list-header',
  HEADER_BACK_BUTTON: 'earn-section-list-header-back-button',
  LIST: 'earn-section-list',
  LIST_LOADING: 'earn-section-list-loading',
  MONEY_PROJECTION: 'earn-section-list-money-projection',
  MONEY_PROJECTION_SKELETON: 'earn-section-list-money-projection-skeleton',
  MONEY_PROJECTION_TOTAL: 'earn-section-list-money-projection-total',
  MONEY_PROJECTION_PROJECTED: 'earn-section-list-money-projection-projected',
  MONEY_VIEW_ALL: 'earn-section-list-money-view-all',
  MORE_WAYS_TITLE: 'earn-section-list-more-ways-title',
  MORE_WAYS_SUBTITLE: 'earn-section-list-more-ways-subtitle',
  DIVIDER: 'earn-section-list-divider',
  ERROR: 'earn-section-list-error',
  ERROR_RETRY: 'earn-section-list-error-retry',
  EMPTY: 'earn-section-list-empty',
  MONEY_TOKEN_ROW: (index: number) =>
    `earn-section-list-money-token-row-${index}`,
} as const;
