export const collectiblesTestIds = {
  homeSection: 'collectibles-home-section',
  carousel: 'collectibles-home-section-carousel',
  skeleton: 'collectibles-home-section-skeleton',
  tradeMenuItem: 'collectibles-trade-menu-item',
  tile: (code: string) => `collectibles-pack-tile-${code}`,
  buyButton: (code: string) => `collectibles-pack-tile-buy-${code}`,
  buySheet: 'collectibles-buy-sheet',
  buySheetClose: 'collectibles-buy-sheet-close',
} as const;
