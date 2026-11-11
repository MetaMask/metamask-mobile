export const CancelMembershipTestIds = {
  CONTAINER: 'cancel-membership-container',
  // ── Shared survey chrome ─────────────────────────────────────────────────
  BACK_BUTTON: 'cancel-membership-back-button',
  KEEP_BUTTON: 'cancel-membership-keep-button',
  CANCEL_BUTTON: 'cancel-membership-cancel-button',
  ERROR_MESSAGE: 'cancel-membership-error-message',
  // ── Reason step ──────────────────────────────────────────────────────────
  TITLE: 'cancel-membership-title',
  REASONS_LIST: 'cancel-membership-reasons-list',
  // ── Stay step ────────────────────────────────────────────────────────────
  STAY_QUESTION: 'cancel-membership-stay-question',
  STAY_QUESTION_INPUT: 'cancel-membership-stay-question-input',
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
