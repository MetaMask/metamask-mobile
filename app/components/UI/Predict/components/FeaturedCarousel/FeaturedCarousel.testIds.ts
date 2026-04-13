export const FEATURED_CAROUSEL_TEST_IDS = {
  CONTAINER: 'featured-carousel-container',
  FLASH_LIST: 'featured-carousel-flash-list',
  PAGINATION_DOTS: 'featured-carousel-pagination-dots',
  CARD: (index: number) => `featured-carousel-card-${index}`,
  CARD_TITLE: (index: number) => `featured-carousel-card-title-${index}`,
  CARD_OUTCOME: (index: number, outcomeIndex: number) =>
    `featured-carousel-card-${index}-outcome-${outcomeIndex}`,
  CARD_BUY_BUTTON: (index: number, outcomeIndex: number) =>
    `featured-carousel-card-${index}-buy-${outcomeIndex}`,
  CARD_FOOTER: (index: number) => `featured-carousel-card-footer-${index}`,
  SKELETON: 'featured-carousel-skeleton',
} as const;
