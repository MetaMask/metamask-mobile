export const CancelMembershipTestIds = {
  CONTAINER: 'cancel-membership-container',
  // ── Survey step ──────────────────────────────────────────────────────────
  BACK_BUTTON: 'cancel-membership-back-button',
  TITLE: 'cancel-membership-title',
  SUBTITLE: 'cancel-membership-subtitle',
  STATS_CARD: 'cancel-membership-stats-card',
  REASONS_LIST: 'cancel-membership-reasons-list',
  KEEP_BUTTON: 'cancel-membership-keep-button',
  CANCEL_BUTTON: 'cancel-membership-cancel-button',
  // ── Success step ─────────────────────────────────────────────────────────
  SUCCESS_CHECK_ICON_BOX: 'cancel-membership-success-check-icon-box',
  SUCCESS_TITLE: 'cancel-membership-success-title',
  SUCCESS_DESCRIPTION: 'cancel-membership-success-description',
  SUCCESS_DONE_BUTTON: 'cancel-membership-success-done-button',
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
