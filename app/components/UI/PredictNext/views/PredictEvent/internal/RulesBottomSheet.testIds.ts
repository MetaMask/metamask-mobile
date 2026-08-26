export const RulesBottomSheetTestIds = {
  SHEET: 'predict-next-rules-sheet',
  CLOSE_BUTTON: 'predict-next-rules-close',
  CONTENT: 'predict-next-rules-content',
  SOURCES: 'predict-next-rules-sources',
  SOURCE_LINK: (sourceIndex: number) =>
    `predict-next-rules-source-${sourceIndex}`,
  EVENT_RULES: 'predict-next-event-rules',
  MARKET_QUESTION: 'predict-next-market-question',
  MARKET_RULES: 'predict-next-market-rules',
} as const;
