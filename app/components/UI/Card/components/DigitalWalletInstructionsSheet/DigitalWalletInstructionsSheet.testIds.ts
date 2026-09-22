export const DigitalWalletInstructionsSheetSelectors = {
  CONTAINER: 'digital-wallet-instructions-sheet',
  TITLE: 'digital-wallet-instructions-sheet-title',
  DESCRIPTION: 'digital-wallet-instructions-sheet-description',
  CARD_DETAILS: 'digital-wallet-instructions-sheet-card-details',
  VIEW_CARD_DETAILS_BUTTON:
    'digital-wallet-instructions-sheet-view-card-details-button',
  WALLET_HEADING: 'digital-wallet-instructions-sheet-wallet-heading',
  STEPS: 'digital-wallet-instructions-sheet-steps',
  step: (stepNumber: number) =>
    `digital-wallet-instructions-sheet-step-${stepNumber}`,
  CLOSE_BUTTON: 'digital-wallet-instructions-sheet-close-button',
} as const;
