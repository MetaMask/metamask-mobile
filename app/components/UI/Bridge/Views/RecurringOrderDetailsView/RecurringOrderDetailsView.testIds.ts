export const RecurringOrderDetailsViewSelectorsIDs = {
  SCREEN: 'recurring-order-details-screen',
  BACK_BUTTON: 'recurring-order-details-back-button',
  SOURCE_TOKEN_AVATAR: 'recurring-order-details-source-token-avatar',
  SOURCE_NETWORK_BADGE: 'recurring-order-details-source-network-badge',
  DESTINATION_TOKEN_AVATAR: 'recurring-order-details-destination-token-avatar',
  DESTINATION_NETWORK_BADGE:
    'recurring-order-details-destination-network-badge',
  SUMMARY: 'recurring-order-details-summary',
  FILLED_VALUE: 'recurring-order-details-filled-value',
  CANCEL_BUTTON: 'recurring-order-details-cancel-button',
  DUPLICATE_BUTTON: 'recurring-order-details-duplicate-button',
  CANCEL_SHEET: 'recurring-order-details-cancel-sheet',
  CANCEL_SHEET_CLOSE_BUTTON:
    'recurring-order-details-cancel-sheet-close-button',
  CANCEL_SHEET_CONFIRM_BUTTON:
    'recurring-order-details-cancel-sheet-confirm-button',
  OPEN_ORDER_ROW: (orderId: string) => `recurring-order-open-row-${orderId}`,
  HISTORY_ORDER_ROW: (orderId: string) =>
    `recurring-order-history-row-${orderId}`,
  TEST_ENTRY_BUTTON: 'recurring-order-details-test-entry-button',
} as const;
