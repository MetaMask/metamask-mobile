export const RedesignedSendViewSelectorsIDs = {
  SEND_AMOUNT: 'send_amount',
  EDIT_AMOUNT_KEYBOARD: 'edit-amount-keyboard',
  PERCENTAGE_BUTTON_100: 'percentage-button-100',
  RECIPIENT_ADDRESS_INPUT: 'recipient-address-input',
  REVIEW_BUTTON: 'review-button',
} as const;

/** TestID for recipient row (unselected). */
export const getRecipientRowTestId = (address: string) =>
  `recipient-${address}`;

/** TestID for selected recipient row. */
export const getSelectedRecipientTestId = (address: string) =>
  `selected-${address}`;

/** TestID for recipient row avatar. */
export const getRecipientAvatarTestId = (address: string) =>
  `recipient-avatar-${address}`;

/** TestID for NFT row in asset list (name or tokenId). */
export const getNftRowTestId = (nameOrTokenId: string) =>
  `nft-${nameOrTokenId}`;
