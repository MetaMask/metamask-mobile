/** Test IDs of the homepage Collectibles (PackPartner) section. */
export const CollectiblesSectionTestIds = {
  CONTAINER: 'homepage-collectibles-section',
  SKELETON: 'homepage-collectibles-skeleton',
  EMPTY_STATE: 'homepage-collectibles-empty-state',
  EMPTY_CTA: 'homepage-collectibles-empty-cta',
  PACKS: 'homepage-collectibles-packs',
  PACKS_LOADING: 'homepage-collectibles-packs-loading',
  PACKS_EMPTY: 'homepage-collectibles-packs-empty',
  VIEW_PACKS: 'homepage-collectibles-view-packs',
  COLLECTION: 'homepage-collectibles-collection',
  CARD_TILE: (mint: string): string => `homepage-collectibles-card-${mint}`,
} as const;
