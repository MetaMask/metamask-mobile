export const collectiblesTestIds = {
  homeSection: 'collectibles-home-section',
  carousel: 'collectibles-home-section-carousel',
  skeleton: 'collectibles-home-section-skeleton',
  empty: 'collectibles-home-section-empty',
  tradeMenuItem: 'collectibles-trade-menu-item',
  tile: (code: string) => `collectibles-pack-tile-${code}`,
  flame: (code: string) => `collectibles-pack-tile-flame-${code}`,
} as const;
