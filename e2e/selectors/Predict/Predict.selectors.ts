// ========================================
// PREDICT TAB VIEW SELECTORS
// ========================================

export const PredictTabViewSelectorsIDs = {
  // Main container
  CONTAINER: 'predict-tab-view-container',

  // Loading states
  LOADING_CONTAINER: 'predict-tab-view-loading-container',
  SKELETON_LOADING_1: 'skeleton-loading-1',
  SKELETON_LOADING_2: 'skeleton-loading-2',
  SKELETON_LOADING_3: 'skeleton-loading-3',
  SKELETON_LOADING_4: 'skeleton-loading-4',
  SKELETON_LOADING_5: 'skeleton-loading-5',

  // Error state
  ERROR_CONTAINER: 'predict-tab-view-error-container',
  ERROR_TEXT: 'predict-tab-view-error-text',

  // FlashList
  FLASH_LIST: 'predict-tab-view-flash-list',
  REFRESH_CONTROL: 'predict-tab-view-refresh-control',

  // Markets Won Card
  MARKETS_WON_CARD: 'markets-won-card',
  MARKETS_WON_CLAIM_BUTTON: 'predict-markets-won-claim-button',

  // Position items
  POSITION_ITEM: 'predict-position-item',

  // Empty state
  EMPTY_STATE: 'empty-state',
  EMPTY_STATE_ICON: 'icon',
  EMPTY_STATE_TITLE: 'predict-tab-no-predictions',
  EMPTY_STATE_DESCRIPTION: 'predict-tab-no-predictions-description',
  EMPTY_STATE_EXPLORE_BUTTON: 'predict-tab-explore',

  // Footer
  PREDICT_NEW_BUTTON: 'predict-new-button',
} as const;

// Helper functions for dynamic selectors
export const getPredictTabViewSelector = {
  positionItem: (positionId: string) => `position-${positionId}`,
  skeletonLoading: (index: number) => `skeleton-loading-${index}`,
  };

  // ========================================
// PREDICT MARKET DETAILS SELECTORS
  // ========================================

export const PredictMarketDetailsSelectorsIDs = {
  // Main screen
  SCREEN: 'predict-market-details-screen',

  // Header
  HEADER: 'predict-market-details-header',
  BACK_BUTTON: 'predict-market-details-back-button',
  MARKET_TITLE: 'predict-market-details-market-title',
  MARKET_PRICE: 'predict-market-details-market-price',

  // Chart
  CHART_CONTAINER: 'predict-market-details-chart-container',
  CHART_LOADING: 'predict-market-details-chart-loading',

  // Tabs
  TAB_BAR: 'predict-market-details-tab-bar',
  ABOUT_TAB: 'predict-market-details-about-tab',
  POSITIONS_TAB: 'predict-market-details-positions-tab',
  OUTCOMES_TAB: 'predict-market-details-outcomes-tab',

  // Tab content
  ABOUT_CONTENT: 'predict-market-details-about-content',
  POSITIONS_CONTENT: 'predict-market-details-positions-content',
  OUTCOMES_CONTENT: 'predict-market-details-outcomes-content',

  // Action buttons
  ACTION_BUTTONS_CONTAINER: 'predict-market-details-action-buttons',
  PREDICT_BUTTON: 'predict-market-details-predict-button',
  CLAIM_BUTTON: 'predict-market-details-claim-button',
} as const;

  // ========================================
// PREDICT MARKET LIST SELECTORS
  // ========================================

export const PredictMarketListSelectorsIDs = {
  // Main container
  CONTAINER: 'predict-market-list-container',

  // Header
  HEADER: 'predict-market-list-header',
  SEARCH_BUTTON: 'predict-market-list-search-button',
  CLOSE_BUTTON: 'predict-market-list-close-button',

  // Search
  SEARCH_INPUT: 'predict-market-list-search-input',
  SEARCH_CLEAR_BUTTON: 'predict-market-list-search-clear-button',

  // Categories/Tabs
  CATEGORY_TABS: 'predict-market-list-category-tabs',
  TRENDING_TAB: 'predict-market-list-trending-tab',
  NEW_TAB: 'predict-market-list-new-tab',
  SPORTS_TAB: 'predict-market-list-sports-tab',
  CRYPTO_TAB: 'predict-market-list-crypto-tab',
  POLITICS_TAB: 'predict-market-list-politics-tab',

  // Market items
  MARKET_ITEM: 'predict-market-list-market-item',
  MARKET_CARD: 'predict-market-list-card',
  MARKET_ITEM_TITLE: 'predict-market-list-market-item-title',
  MARKET_ITEM_PRICE: 'predict-market-list-market-item-price',
  MARKET_ITEM_END_TIME: 'predict-market-list-market-item-end-time',

  // Loading states
  LOADING_SKELETON: 'predict-market-list-loading-skeleton',
  LOADING_CONTAINER: 'predict-market-list-loading-container',

  // Empty state
  EMPTY_STATE: 'predict-market-list-empty-state',
  EMPTY_STATE_TEXT: 'predict-market-list-empty-state-text',
} as const;

// Helper functions for dynamic market list selectors
export const getPredictMarketListSelector = {
  marketItem: (marketId: string) => `predict-market-list-market-item-${marketId}`,
  marketCard: (index: number) => `predict-market-list-card-${index}`,
  categoryTab: (category: string) => `predict-market-list-${category.toLowerCase()}-tab`,
  emptyState: () => 'predict-market-list-empty-state',
};

  // ========================================
// PREDICT POSITION SELECTORS
  // ========================================

export const PredictPositionSelectorsIDs = {
  // Position card
  POSITION_CARD: 'predict-position-card',
  POSITION_TITLE: 'predict-position-title',
  POSITION_MARKET: 'predict-position-market',
  POSITION_OUTCOME: 'predict-position-outcome',
  POSITION_AMOUNT: 'predict-position-amount',
  POSITION_PNL: 'predict-position-pnl',
  POSITION_STATUS: 'predict-position-status',
  POSITION_END_TIME: 'predict-position-end-time',
  } as const;

// Helper functions for dynamic position selectors
export const getPredictPositionSelector = {
  positionCard: (positionId: string) => `position-${positionId}`,
  positionOutcome: (positionId: string, outcomeIndex: number) =>
    `position-${positionId}-outcome-${outcomeIndex}`,
  };

  // ========================================
// PREDICT MARKETS WON CARD SELECTORS
  // ========================================

export const PredictMarketsWonCardSelectorsIDs = {
  // Card container
  CARD: 'markets-won-card',

  // Content
  TITLE: 'predict-markets-won-card-title',
  MARKETS_WON_COUNT: 'markets-won-count',
  CLAIMABLE_AMOUNT: 'claimable-amount',
  UNREALIZED_AMOUNT: 'predict-markets-won-card-unrealized-amount',
  UNREALIZED_PERCENT: 'predict-markets-won-card-unrealized-percent',

  // Actions
  CLAIM_BUTTON: 'predict-markets-won-card-claim-button',
  CLAIM_BUTTON_LOADING: 'predict-markets-won-card-claim-button-loading',
} as const;

  // ========================================
// PREDICT NEW BUTTON SELECTORS
  // ========================================

export const PredictNewButtonSelectorsIDs = {
  BUTTON: 'predict-new-button',
  BUTTON_TEXT: 'predict-new-button-text',
  BUTTON_ICON: 'predict-new-button-icon',
} as const;

  // ========================================
// PREDICT POSITION EMPTY SELECTORS
  // ========================================

export const PredictPositionEmptySelectorsIDs = {
  CONTAINER: 'empty-state',
  ICON: 'icon',
  TITLE: 'predict-position-empty-title',
  DESCRIPTION: 'predict-position-empty-description',
  EXPLORE_BUTTON: 'predict-position-empty-explore-button',
  } as const;

  // ========================================
// PREDICT GENERAL SELECTORS
  // ========================================

export const PredictGeneralSelectorsIDs = {
  // Common buttons
    CONTINUE_BUTTON: 'continue-button',
    DONE_BUTTON: 'done-button',
  CANCEL_BUTTON: 'cancel-button',
  BACK_BUTTON: 'back-button',

  // Loading indicators
  LOADING_SPINNER: 'predict-loading-spinner',
  LOADING_TEXT: 'predict-loading-text',

  // Error states
  ERROR_CONTAINER: 'predict-error-container',
  ERROR_TEXT: 'predict-error-text',
  RETRY_BUTTON: 'predict-retry-button',
  } as const;

