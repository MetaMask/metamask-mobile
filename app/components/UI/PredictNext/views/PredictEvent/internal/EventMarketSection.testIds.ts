export const EventMarketSectionTestIds = {
  HEADER: 'predict-next-event-market-section-header',
  VOLUME: 'predict-next-event-market-section-volume',
  CHEVRON: (direction: 'up' | 'down') =>
    `predict-next-event-market-section-chevron-${direction}`,
} as const;
