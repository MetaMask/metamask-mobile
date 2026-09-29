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

export const activityListRowPrimaryAmountTestId = (hash: string): string =>
  `activity-primary-amount-${hash}`;

export const activityListRowSecondaryAmountTestId = (hash: string): string =>
  `activity-secondary-amount-${hash}`;

export const activityListRowAvatarSingleTestId = (hash: string): string =>
  `activity-row-avatar-single-${hash}`;

export const activityListRowAvatarStackTestId = (hash: string): string =>
  `activity-row-avatar-stack-${hash}`;
