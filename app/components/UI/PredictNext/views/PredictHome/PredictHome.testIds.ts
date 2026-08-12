export const PredictHomeTestIds = {
  HOME: 'predict-next-home',
  LOADING: 'predict-next-loading',
  ERROR: 'predict-next-error',
  EMPTY: 'predict-next-empty',
  FEED: 'predict-next-event-feed',
  FOOTER_LOADING: 'predict-next-footer-loading',
  FOOTER_RETRY: 'predict-next-footer-retry',
  event: (venueId: string, eventId: string) =>
    `predict-next-event-${venueId}-${eventId}`,
  eventContent: (venueId: string, eventId: string) =>
    `predict-next-event-content-${venueId}-${eventId}`,
} as const;
