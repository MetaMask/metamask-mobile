export const EarnStrategySelectionModalTestIds = {
  MODAL: 'earn-strategy-selection-modal',
  MODAL_HEADER: 'earn-strategy-selection-modal-header',
  GET_STARTED_BUTTON: 'earn-strategy-selection-get-started-button',
  STRATEGY_CARD: (strategyId: string) => `earn-strategy-card-${strategyId}`,
} as const;
