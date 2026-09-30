/** Test IDs of the homepage Gacha (CollectorCrypt) section. */
export const GachaSectionTestIds = {
  CONTAINER: 'homepage-gacha-section',
  SKELETON: 'homepage-gacha-skeleton',
  EMPTY_STATE: 'homepage-gacha-empty-state',
  EMPTY_CTA: 'homepage-gacha-empty-cta',
  CARD_TILE: (mint: string): string => `homepage-gacha-card-${mint}`,
} as const;
