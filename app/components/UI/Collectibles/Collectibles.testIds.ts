export const collectiblesTestIds = {
  homeSection: 'collectibles-home-section',
  carousel: 'collectibles-home-section-carousel',
  skeleton: 'collectibles-home-section-skeleton',
  tradeMenuItem: 'collectibles-trade-menu-item',
  tile: (code: string) => `collectibles-pack-tile-${code}`,
} as const;

export const CollectiblesHomeTestIds = {
  CONTAINER: 'collectibles-home',
  BACK_BUTTON: 'collectibles-home-back',
} as const;
