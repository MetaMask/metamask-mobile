// ========================================
// PREDICT TAB VIEW SELECTORS
// ========================================

export const PredictTabViewSelectorsIDs = {
  // Main container
  CONTAINER: 'predict-tab-view-container',

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

  // Header
  BACK_BUTTON: 'predict-market-details-back-button',

  // Tabs
  TAB_BAR: 'predict-market-details-tab-bar',
  ABOUT_TAB: 'predict-market-details-about-tab',
  POSITIONS_TAB: 'predict-market-details-positions-tab',
  OUTCOMES_TAB: 'predict-market-details-outcomes-tab',
} as const;
