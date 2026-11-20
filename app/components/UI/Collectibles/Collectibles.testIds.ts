export const collectiblesTestIds = {
  homeSection: 'collectibles-home-section',
  carousel: 'collectibles-home-section-carousel',
  skeleton: 'collectibles-home-section-skeleton',
  tile: (code: string) => `collectibles-pack-tile-${code}`,
  openButton: (code: string) => `collectibles-pack-open-${code}`,
} as const;
