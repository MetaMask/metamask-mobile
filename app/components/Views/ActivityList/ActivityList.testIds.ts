export const ActivityListSelectorsIDs = {
  CONTAINER: 'activity-list',
} as const;

export const activityListRowItemTestId = (index: number): string =>
  `transaction-item-${index}`;

export const activityListRowTitleTestId = (hash: string): string =>
  `activity-title-${hash}`;

export const activityListRowSubtitleTestId = (hash: string): string =>
  `activity-subtitle-${hash}`;

export const activityListRowPendingSpinnerTestId = (hash: string): string =>
  `activity-pending-spinner-${hash}`;
