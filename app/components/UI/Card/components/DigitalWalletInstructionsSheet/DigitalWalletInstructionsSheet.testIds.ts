export const DigitalWalletInstructionsSheetSelectors = {
  CONTAINER: 'digital-wallet-instructions-sheet',
  TITLE: 'digital-wallet-instructions-sheet-title',
  DESCRIPTION: 'digital-wallet-instructions-sheet-description',
  TABS: 'digital-wallet-instructions-sheet-tabs',
  APPLE_WALLET_TAB: 'digital-wallet-instructions-sheet-apple-wallet-tab',
  GOOGLE_WALLET_TAB: 'digital-wallet-instructions-sheet-google-wallet-tab',
  STEPS: 'digital-wallet-instructions-sheet-steps',
  step: (stepNumber: number) =>
    `digital-wallet-instructions-sheet-step-${stepNumber}`,
  CLOSE_BUTTON: 'digital-wallet-instructions-sheet-close-button',
} as const;
