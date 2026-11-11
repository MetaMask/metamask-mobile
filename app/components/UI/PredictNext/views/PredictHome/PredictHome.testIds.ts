export const PredictHomeTestIds = {
  HOME: 'predict-next-home',
  BACK: 'predict-next-home-back',
  SEARCH: 'predict-next-home-search',
  HEADER_TITLE: 'predict-next-home-header-title',
  TITLE_SECTION: 'predict-next-home-title-section',
  SCROLL: 'predict-next-home-scroll',
  BALANCE: 'predict-next-home-balance',
  BALANCE_AMOUNT: 'predict-next-home-balance-amount',
  BALANCE_LOADING: 'predict-next-home-balance-loading',
  BALANCE_ERROR: 'predict-next-home-balance-error',
  BALANCE_RETRY: 'predict-next-home-balance-retry',
  BALANCE_GEO_BLOCKED: 'predict-next-home-balance-geo-blocked',
  ACTIONS: 'predict-next-home-portfolio-actions',
  POSITIONS: 'predict-next-home-positions',
  HOME_TRENDING: 'predict-next-home-trending',
  HOME_TRENDING_HEADER: 'predict-next-home-trending-header',
  HOME_TRENDING_CHEVRON: 'predict-next-home-trending-chevron',
  HOME_TRENDING_CAROUSEL: 'predict-next-home-trending-carousel',
  HOME_TRENDING_PAGINATION: 'predict-next-home-trending-pagination',
  HOME_TRENDING_SKELETON: 'predict-next-home-trending-skeleton',
  HOME_SPORTS: 'predict-next-home-sports',
  HOME_SPORTS_HEADER: 'predict-next-home-sports-header',
  HOME_SPORTS_CHEVRON: 'predict-next-home-sports-chevron',
  HOME_SPORTS_ROW: 'predict-next-home-sports-row',
  HOME_SPORTS_SKELETON: 'predict-next-home-sports-skeleton',
  HOME_GAMES_ERROR: 'predict-next-home-games-error',
  HOME_GAMES_RETRY: 'predict-next-home-games-retry',
  GET_STARTED_BANNER: 'predict-next-home-get-started-banner',
  GET_STARTED_BANNER_IMAGE: 'predict-next-home-get-started-banner-image',
  GET_STARTED_BANNER_DISMISS: 'predict-next-home-get-started-banner-dismiss',
  SECTIONS_LOADING: 'predict-next-home-sections-loading',
  SECTIONS_ERROR: 'predict-next-home-sections-error',
  SECTIONS_RETRY: 'predict-next-home-sections-retry',
  SECTIONS_UNAVAILABLE: 'predict-next-home-sections-unavailable',
  CATEGORIES: 'predict-next-home-categories',
  CATEGORIES_HEADER: 'predict-next-home-categories-header',
  CATEGORIES_LIST: 'predict-next-home-categories-list',
  categoryChip: (categoryId: string) =>
    `predict-next-home-category-${categoryId}`,
  section: (feedScreenId: string) =>
    `predict-next-home-section-${feedScreenId}`,
  sectionHeader: (feedScreenId: string) =>
    `predict-next-home-section-header-${feedScreenId}`,
  sectionLoading: (feedScreenId: string) =>
    `predict-next-home-section-loading-${feedScreenId}`,
  sectionError: (feedScreenId: string) =>
    `predict-next-home-section-error-${feedScreenId}`,
  sectionEmpty: (feedScreenId: string) =>
    `predict-next-home-section-empty-${feedScreenId}`,
  sectionRetry: (feedScreenId: string) =>
    `predict-next-home-section-retry-${feedScreenId}`,
  event: (venueId: string, eventId: string) =>
    `predict-next-event-${venueId}-${eventId}`,
  eventContent: (venueId: string, eventId: string) =>
    `predict-next-event-content-${venueId}-${eventId}`,
  outcome: (eventId: string, side: 'yes' | 'no') =>
    `predict-next-outcome-${eventId}-${side}`,
  gameQuote: (eventId: string, selection: 'away' | 'home') =>
    `predict-next-game-quote-${eventId}-${selection}`,
  image: (eventId: string) => `predict-next-event-image-${eventId}`,
  category: (eventId: string) => `predict-next-event-category-${eventId}`,
  volume: (eventId: string) => `predict-next-event-volume-${eventId}`,
  more: (eventId: string) => `predict-next-event-more-${eventId}`,
} as const;
