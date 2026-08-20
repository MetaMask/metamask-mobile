export const CancelMembershipTestIds = {
  CONTAINER: 'cancel-membership-container',
  BACK_BUTTON: 'cancel-membership-back-button',
  TITLE: 'cancel-membership-title',
  SUBTITLE: 'cancel-membership-subtitle',
  STATS_CARD: 'cancel-membership-stats-card',
  REASONS_LIST: 'cancel-membership-reasons-list',
  KEEP_BUTTON: 'cancel-membership-keep-button',
  CANCEL_BUTTON: 'cancel-membership-cancel-button',
} as const;

/**
 * Returns the testID for a selectable cancel reason item by its reason id.
 */
export const getCancelReasonTestId = (id: string) =>
  `cancel-membership-reason-${id}`;

/**
 * Returns the testID for the checkmark icon inside a selected reason item.
 */
export const getCancelReasonCheckmarkTestId = (id: string) =>
  `cancel-membership-reason-${id}-checkmark`;
