export const PackRevealSelectorsIDs = {
  CONTAINER: 'pack-reveal',
  REVEAL_BUTTON: 'pack-reveal-button',
  CARD: 'pack-reveal-card',
  METADATA: 'pack-reveal-metadata',
  STAGE: (stage: string) => `pack-reveal-stage-${stage}`,
  FOOTER: 'pack-reveal-footer',
} as const;
