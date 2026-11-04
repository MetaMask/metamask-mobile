export const EventMarketLayoutSectionTestIds = {
  section: (sectionKey: string) =>
    `predict-next-event-market-layout-section-${sectionKey}`,
  card: (sectionKey: string, cardKey: string) =>
    `predict-next-event-market-layout-card-${sectionKey}-${cardKey}`,
} as const;
