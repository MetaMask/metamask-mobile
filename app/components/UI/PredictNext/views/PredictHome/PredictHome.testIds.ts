export const PredictHomeTestIds = {
  HOME: 'predict-next-home',
  SCROLL: 'predict-next-home-scroll',
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
  image: (eventId: string) => `predict-next-event-image-${eventId}`,
  category: (eventId: string) => `predict-next-event-category-${eventId}`,
  volume: (eventId: string) => `predict-next-event-volume-${eventId}`,
  more: (eventId: string) => `predict-next-event-more-${eventId}`,
} as const;
