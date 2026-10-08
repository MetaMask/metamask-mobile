/**
 * Test IDs for the mUSD rescue screens (review + recipient selection).
 */
export const MusdRescueSendTestIds = {
  CONTAINER: 'musd-rescue-send-screen',
  BACK_BUTTON: 'musd-rescue-send-back-button',
  AMOUNT: 'musd-rescue-send-amount',
  BANNER: 'musd-rescue-send-banner',
  TO_ROW: 'musd-rescue-send-to-row',
  RECEIVE_ROW: 'musd-rescue-send-receive-row',
  SEND_BUTTON: 'musd-rescue-send-send-button',
  ERROR_MESSAGE: 'musd-rescue-send-error-message',
} as const;

export const MusdRescueRecipientTestIds = {
  CONTAINER: 'musd-rescue-recipient-screen',
  BACK_BUTTON: 'musd-rescue-recipient-back-button',
  SEARCH_FIELD: 'musd-rescue-recipient-search',
  ACCOUNT_OPTION: 'musd-rescue-recipient-option',
  EMPTY_STATE: 'musd-rescue-recipient-empty',
} as const;
