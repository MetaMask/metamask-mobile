/** Test IDs of one Home games row, by its catalog section ID. */
const gamesRowTestIds = (sectionId: string) => ({
  ROW: `predict-next-home-games-row-${sectionId}`,
  HEADER: `predict-next-home-games-row-header-${sectionId}`,
  CHEVRON: `predict-next-home-games-row-chevron-${sectionId}`,
  LIST: `predict-next-home-games-row-list-${sectionId}`,
  SKELETON: `predict-next-home-games-row-skeleton-${sectionId}`,
});

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
  DEPOSIT_STATUS: 'predict-next-home-deposit-status',
  ACTIONS: 'predict-next-home-portfolio-actions',
  DIVIDER: 'predict-next-home-divider',
  POSITIONS: 'predict-next-home-positions',
  ADD_FUNDS: 'predict-next-home-add-funds',
  WITHDRAW: 'predict-next-home-withdraw',
  HOME_TRENDING: 'predict-next-home-trending',
  HOME_TRENDING_HEADER: 'predict-next-home-trending-header',
  HOME_TRENDING_CHEVRON: 'predict-next-home-trending-chevron',
  HOME_TRENDING_CAROUSEL: 'predict-next-home-trending-carousel',
  HOME_TRENDING_PAGINATION: 'predict-next-home-trending-pagination',
  HOME_TRENDING_SKELETON: 'predict-next-home-trending-skeleton',
  /** The games row whose catalog section ID is `sports` (Kalshi's Sports
   * row); {@link gamesRow} names any games row. */
  HOME_SPORTS: gamesRowTestIds('sports').ROW,
  HOME_SPORTS_HEADER: gamesRowTestIds('sports').HEADER,
  HOME_SPORTS_CHEVRON: gamesRowTestIds('sports').CHEVRON,
  HOME_SPORTS_ROW: gamesRowTestIds('sports').LIST,
  HOME_SPORTS_SKELETON: gamesRowTestIds('sports').SKELETON,
  /** The test IDs of the games row whose catalog section ID is `sectionId`. */
  gamesRow: (sectionId: string) => gamesRowTestIds(sectionId),
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
  CATEGORIES_LIST: 'predict-next-home-categories-list',
  categoryChip: (categoryId: string) =>
    `predict-next-home-category-${categoryId}`,
  categoryChipIcon: (categoryId: string) =>
    `predict-next-home-category-icon-${categoryId}`,
  /** A Feed preview section, by its catalog section ID. */
  section: (sectionId: string) => `predict-next-home-section-${sectionId}`,
  sectionHeader: (sectionId: string) =>
    `predict-next-home-section-header-${sectionId}`,
  sectionLoading: (sectionId: string) =>
    `predict-next-home-section-loading-${sectionId}`,
  sectionError: (sectionId: string) =>
    `predict-next-home-section-error-${sectionId}`,
  sectionEmpty: (sectionId: string) =>
    `predict-next-home-section-empty-${sectionId}`,
  sectionRetry: (sectionId: string) =>
    `predict-next-home-section-retry-${sectionId}`,
  event: (venueId: string, eventId: string) =>
    `predict-next-event-${venueId}-${eventId}`,
  eventContent: (venueId: string, eventId: string) =>
    `predict-next-event-content-${venueId}-${eventId}`,
  outcome: (eventId: string, side: 'yes' | 'no') =>
    `predict-next-outcome-${eventId}-${side}`,
  /** The yes Outcome price of one Market on a multi-row or featured card. */
  marketOutcome: (eventId: string, marketId: string) =>
    `predict-next-outcome-${eventId}-${marketId}-yes`,
  gameQuote: (eventId: string, selection: 'away' | 'draw' | 'home') =>
    `predict-next-game-quote-${eventId}-${selection}`,
  gameTeam: (eventId: string, selection: 'away' | 'draw' | 'home') =>
    `predict-next-game-team-${eventId}-${selection}`,
  image: (eventId: string) => `predict-next-event-image-${eventId}`,
  category: (eventId: string) => `predict-next-event-category-${eventId}`,
  volume: (eventId: string) => `predict-next-event-volume-${eventId}`,
  more: (eventId: string) => `predict-next-event-more-${eventId}`,
} as const;
