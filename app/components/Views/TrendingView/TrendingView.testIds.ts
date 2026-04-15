export const TrendingViewSelectorsIDs = {
  TRENDING_FEED_SCROLL_VIEW: 'trending-feed-scroll-view',
  QUICK_ACTIONS_SCROLL_VIEW: 'quick-actions-scroll-view',
  EXPLORE_HEADER_ROOT: 'explore-header-root',
  EXPLORE_SAFE_AREA: 'explore-safe-area',
  SECTION_HEADER_VIEW_ALL_TOKENS: 'section-header-view-all-tokens',
  TRENDING_TOKENS_HEADER: 'trending-tokens-header',
  EXPLORE_VIEW_SEARCH_BUTTON: 'explore-view-search-button',
  EXPLORE_VIEW_SEARCH_INPUT: 'explore-view-search-input',
  TRENDING_SEARCH_RESULTS_LIST: 'trending-search-results-list',
  ALL_NETWORKS_BUTTON: 'all-networks-button',
  CLOSE_BUTTON: 'close-button',
  TRENDING_TOKENS_HEADER_SEARCH_TOGGLE: 'trending-tokens-header-search-toggle',
  TRENDING_TOKENS_HEADER_SEARCH_BAR: 'trending-tokens-header-search-bar',
} as const;

export type TrendingViewSelectorsIDsType = typeof TrendingViewSelectorsIDs;
