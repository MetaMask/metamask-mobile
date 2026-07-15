export const PostTradeBottomSheetTestIds = {
  CLOSE_BUTTON: 'post-trade-bottom-sheet-close-button',
  VIEW_ACTIVITY_BUTTON: 'post-trade-bottom-sheet-view-activity-button',
  TRY_AGAIN_BUTTON: 'post-trade-bottom-sheet-try-again-button',
  SUGGESTIONS_SECTION: 'post-trade-bottom-sheet-suggestions-section',
  SUGGESTIONS_LIST: 'post-trade-bottom-sheet-suggestions-list',
  SUGGESTION_PILL: 'post-trade-bottom-sheet-suggestion-pill',
} as const;

export const getPostTradeSuggestionPillTestId = (assetId: string) =>
  `${PostTradeBottomSheetTestIds.SUGGESTION_PILL}-${assetId}`;
