export const ActivityListSelectorsIDs = {
  CONTAINER: 'activity-list',
  LOADING_INDICATOR: 'activity-list-loading',
  LOAD_MORE_INDICATOR: 'activity-list-load-more',
} as const;

export const activityListRowItemTestId = (index: number): string =>
  `transaction-item-${index}`;

export const activityListRowTitleTestId = (hash: string): string =>
  `activity-title-${hash}`;

export const activityListRowSubtitleTestId = (hash: string): string =>
  `activity-subtitle-${hash}`;

export const activityListRowPendingSpinnerTestId = (hash: string): string =>
  `activity-pending-spinner-${hash}`;
