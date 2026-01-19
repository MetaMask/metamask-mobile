export const TrendingViewSelectorsIDs = {
  SEARCH_BUTTON: 'explore-view-search-button',
  BROWSER_BUTTON: 'trending-view-browser-button',
  SEARCH_INPUT: 'explore-view-search-input',
  SEARCH_CANCEL_BUTTON: 'explore-search-cancel-button',
  TOKEN_ROW_ITEM_PREFIX: 'trending-token-row-item-',
  PERPS_ROW_ITEM_PREFIX: 'perps-market-row-item-',
  PREDICTIONS_ROW_ITEM_PREFIX: 'predict-market-list-trending-card-',
  SITE_ROW_ITEM: 'site-row-item',
  SEARCH_FOOTER_GOOGLE_LINK: 'trending-search-footer-google-link',
  SCROLL_VIEW: 'trending-feed-scroll-view',
  QUICK_ACTIONS_SCROLL_VIEW: 'quick-actions-scroll-view',
  SEARCH_RESULTS_LIST: 'trending-search-results-list',
  VIEW_ALL_BUTTON_PREFIX: 'section-header-view-all-',
} as const;

export const TrendingViewSelectorsText = {
  VIEW_ALL: 'View all',
  // Section titles might vary by localization, but these are for logical mapping
  SECTION_PREDICTIONS: 'Predictions',
  SECTION_TOKENS: 'Tokens',
  SECTION_PERPS: 'Perps',
  SECTION_SITES: 'Sites',
} as const;

// Map section to its full view back button Test ID
export const SECTION_BACK_BUTTONS: Record<string, string> = {
  [TrendingViewSelectorsText.SECTION_TOKENS]:
    'trending-tokens-header-back-button',
  [TrendingViewSelectorsText.SECTION_PERPS]:
    'perps-market-list-close-button-back-button',
  [TrendingViewSelectorsText.SECTION_SITES]:
    'sites-full-view-header-back-button',
  [TrendingViewSelectorsText.SECTION_PREDICTIONS]: 'back-button',
};

// Map item type to its details page back button Test ID
export const DETAILS_BACK_BUTTONS: Record<string, string> = {
  token: 'back-arrow-button',
  perp: 'perps-market-header-back-button',
  prediction: 'predict-market-details-back-button',
};

// Map section to its full view header Test ID
export const SECTION_FULL_VIEW_HEADERS: Record<string, string> = {
  [TrendingViewSelectorsText.SECTION_SITES]: 'sites-full-view-header',
  [TrendingViewSelectorsText.SECTION_TOKENS]: 'trending-tokens-header',
  [TrendingViewSelectorsText.SECTION_PERPS]: 'perps-market-list-close-button',
  [TrendingViewSelectorsText.SECTION_PREDICTIONS]: 'back-button', // PredictFeed uses back-button as main identifier
};
