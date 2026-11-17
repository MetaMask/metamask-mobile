export const EventMarketLayoutSectionTestIds = {
  section: (sectionKey: string) =>
    `predict-next-event-market-layout-section-${sectionKey}`,
  viewAll: (sectionKey: string) =>
    `predict-next-event-market-layout-view-all-${sectionKey}`,
  card: (sectionKey: string, cardKey: string) =>
    `predict-next-event-market-layout-card-${sectionKey}-${cardKey}`,
} as const;
