export const TradingSignalsSetupBottomSheetSelectorsIDs = {
  CONTAINER: 'trading-signals-setup-bottom-sheet-container',
  CLOSE_BUTTON: 'trading-signals-setup-bottom-sheet-close-button',
  PUSH_TOGGLE: 'trading-signals-setup-bottom-sheet-push-toggle',
  IN_APP_TOGGLE: 'trading-signals-setup-bottom-sheet-in-app-toggle',
  THRESHOLD_OPTION: (amount: number) =>
    `trading-signals-setup-threshold-${amount}`,
};
