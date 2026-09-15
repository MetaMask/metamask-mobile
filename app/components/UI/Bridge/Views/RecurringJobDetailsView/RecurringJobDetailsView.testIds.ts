export const RecurringJobDetailsViewSelectorsIDs = {
  SCREEN: 'recurring-job-details-screen',
  BACK_BUTTON: 'recurring-job-details-back-button',
  SOURCE_TOKEN_AVATAR: 'recurring-job-details-source-token-avatar',
  SOURCE_NETWORK_BADGE: 'recurring-job-details-source-network-badge',
  DESTINATION_TOKEN_AVATAR: 'recurring-job-details-destination-token-avatar',
  DESTINATION_NETWORK_BADGE: 'recurring-job-details-destination-network-badge',
  SUMMARY: 'recurring-job-details-summary',
  FILLED_VALUE: 'recurring-job-details-filled-value',
  HISTORY: 'recurring-job-details-history',
  HISTORY_ROW: (orderId: string) =>
    `recurring-job-details-history-row-${orderId}`,
  CANCEL_BUTTON: 'recurring-job-details-cancel-button',
  DUPLICATE_BUTTON: 'recurring-job-details-duplicate-button',
  NOT_FOUND: 'recurring-job-details-not-found',
  CANCEL_SHEET: 'recurring-job-details-cancel-sheet',
  CANCEL_SHEET_CLOSE_BUTTON: 'recurring-job-details-cancel-sheet-close-button',
  CANCEL_SHEET_CONFIRM_BUTTON:
    'recurring-job-details-cancel-sheet-confirm-button',
  OPEN_JOB_ROW: (jobId: string) => `recurring-job-open-row-${jobId}`,
  COMPLETED_JOB_ROW: 'recurring-job-completed-row',
  TEST_ENTRY_BUTTON: 'recurring-job-details-test-entry-button',
} as const;
