export const PredictHomeTestIds = {
  HOME: 'predict-next-home',
  BACK: 'predict-next-home-back',
  SCROLL: 'predict-next-home-scroll',
  BALANCE: 'predict-next-home-balance',
  BALANCE_AMOUNT: 'predict-next-home-balance-amount',
  BALANCE_LOADING: 'predict-next-home-balance-loading',
  BALANCE_ERROR: 'predict-next-home-balance-error',
  BALANCE_RETRY: 'predict-next-home-balance-retry',
  ACTIONS: 'predict-next-home-portfolio-actions',
  POSITIONS: 'predict-next-home-positions',
  ADD_FUNDS: 'predict-next-home-add-funds',
  WITHDRAW: 'predict-next-home-withdraw',
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
