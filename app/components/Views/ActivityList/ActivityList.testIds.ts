export const ActivityListSelectorsIDs = {
  CONTAINER: 'activity-list',
  LOADING_INDICATOR: 'activity-list-loading',
} as const;

export const activityListRowItemTestId = (index: number): string =>
  `transaction-item-${index}`;

export const activityListRowStatusTestId = (index: number): string =>
  `transaction-status-${index}`;
