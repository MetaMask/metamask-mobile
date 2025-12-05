import enContent from '../../../locales/languages/en.json';

// ========================================
// PREDICT TAB VIEW SELECTORS
// ========================================

export const PredictTabViewSelectorsIDs = {
  // Main container
  CONTAINER: 'predict-tab-view-container',

  // Scroll view
  SCROLL_VIEW: 'predict-tab-view-scroll-view',

  // FlashList
  FLASH_LIST: 'predict-tab-view-flash-list',
} as const;

// ========================================
// PREDICT MARKET LIST SELECTORS
// ========================================

export const PredictMarketListSelectorsIDs = {
  // Main container
  CONTAINER: 'predict-market-list-container',

  // Categories/Tabs
  CATEGORY_TABS: 'predict-market-list-category-tabs',
  TRENDING_TAB: 'predict-market-list-trending-tab',
  NEW_TAB: 'predict-market-list-new-tab',
  SPORTS_TAB: 'predict-market-list-sports-tab',
  CRYPTO_TAB: 'predict-market-list-crypto-tab',
  POLITICS_TAB: 'predict-market-list-politics-tab',
  BACK_BUTTON: 'back-button',
  // Empty state
  EMPTY_STATE: 'predict-market-list-empty-state',
} as const;

// Helper functions for dynamic market list selectors
export const getPredictMarketListSelector = {
  marketCardByCategory: (category: string, index: number) =>
    `predict-market-list-${category}-card-${index}`,
  emptyState: () => 'predict-market-list-empty-state',
};

// ========================================
// PREDICT MARKET DETAILS SELECTORS
// ========================================

export const PredictMarketDetailsSelectorsIDs = {
  // Main screen
  SCREEN: 'predict-market-details-screen',
  SCROLLABLE_TAB_VIEW: 'predict-market-details-scrollable-tab-view',

  // Header
  BACK_BUTTON: 'predict-market-details-back-button',
  SHARE_BUTTON: 'predict-market-details-share-button',

  // Tabs
  TAB_BAR: 'predict-market-details-tab-bar',
  ABOUT_TAB: 'predict-market-details-about-tab',
  POSITIONS_TAB: 'predict-market-details-positions-tab',
  OUTCOMES_TAB: 'predict-market-details-outcomes-tab',

  //Tab labels
  POSITIONS_TAB_LABEL: 'predict-market-details-tab-bar-tab-0',
  OUTCOMES_TAB_LABEL: 'predict-market-details-tab-bar-tab-1',
  ABOUT_TAB_LABEL: 'predict-market-details-tab-bar-tab-2',

  // Tab content containers
  ABOUT_TAB_CONTENT: 'about-tab-content',
  POSITIONS_TAB_CONTENT: 'positions-tab-content',
  OUTCOMES_TAB_CONTENT: 'outcomes-tab-content',
  MARKET_DETAILS_CASH_OUT_BUTTON: 'predict-market-details-cash-out-button',
} as const;

export const PredictMarketDetailsSelectorsText = {
  // Tab content containers
  ABOUT_TAB_TEXT: 'About',
  POSITIONS_TAB_TEXT: 'Positions',
  OUTCOMES_TAB_TEXT: 'Outcomes',
} as const;

// ========================================
// PREDICT POSITIONS HEADER SELECTORS
// ========================================

export const PredictPositionsHeaderSelectorsIDs = {
  // Claim button
  CLAIM_BUTTON: 'predict-claim-button',
} as const;

// ========================================
// PREDICT POSITIONS SELECTORS
// ========================================

export const PredictPositionsSelectorsIDs = {
  // Lists
  ACTIVE_POSITIONS_LIST: 'predict-active-positions-list',
  CLAIMABLE_POSITIONS_LIST: 'predict-claimable-positions-list',

  // Section headers
  RESOLVED_MARKETS_HEADER: 'predict-resolved-markets-header',
} as const;

// Predict position selectors
export const PredictPositionSelectorsIDs = {
  CURRENT_POSITION_CARD: 'predict-current-position-card',
  RESOLVED_POSITION_CARD: 'predict-resolved-position-card',
} as const;

// ========================================
// PREDICT BUY PREVIEW SELECTORS
// ========================================

export const PredictBuyPreviewSelectorsIDs = {
  // Buy/Place bet button
  PLACE_BET_BUTTON: 'predict-buy-preview-place-bet-button',
} as const;

// ========================================
// PREDICT CASH OUT SELECTORS
// ========================================

export const PredictCashOutSelectorsIDs = {
  // Container
  CONTAINER: 'predict-cash-out-container',

  // Cash out buttons
  SELL_PREVIEW_CASH_OUT_BUTTON: 'predict-sell-preview-cash-out-button',
} as const;

// ========================================
// PREDICT CLAIM CONFIRMATION SELECTORS
// ========================================

export const PredictClaimConfirmationSelectorsIDs = {
  // Claim amount container
  CLAIM_BACKGROUND_CONTAINER: 'predict-claim-background',
  CLAIM_AMOUNT_CONTAINER: 'predict-claim-amount-container',

  // Claim confirm button
  CLAIM_CONFIRM_BUTTON: 'predict-claim-confirm-button',

  // PREDICT UNAVAILABLE (GEO-BLOCK) SELECTORS
  // ========================================
} as const;

export const PredictUnavailableSelectorsIDs = {
  TITLE_TEXT: enContent.predict.unavailable.title,
  DESCRIPTION_TEXT: enContent.predict.unavailable.description,
  LINK_TEXT: enContent.predict.unavailable.link,
  BUTTON_TEXT: enContent.predict.unavailable.button,
} as const;

// ========================================
// PREDICT ACTIVITY DETAILS SELECTORS
// ========================================

export const PredictActivityDetailsSelectorsIDs = {
  BACK_BUTTON: 'predict-activity-details-back-button',
  CONTAINER: 'predict-activity-details-container',
  TITLE_TEXT: 'predict-activity-details-title',
  AMOUNT_DISPLAY: 'predict-activity-details-amount',
} as const;

// ========================================
// PREDICT BALANCE SELECTORS
// ========================================

export const PredictBalanceSelectorsIDs = {
  BALANCE_CARD: 'predict-balance-card',
} as const;

// ========================================
// PREDICT ADD FUNDS SELECTORS
// ========================================
export const PredictAddFundsSelectorText = {
  ADD_FUNDS: enContent.predict.deposit.add_funds,
} as const;
