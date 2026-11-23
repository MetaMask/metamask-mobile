export const PredictAmountEntryTestIds = {
  DISPLAY: 'predict-amount-entry-display',
  KEYPAD: 'predict-amount-entry-keypad',
  KEYPAD_KEY: (key: string) => `predict-amount-entry-keypad-key-${key}`,
} as const;
