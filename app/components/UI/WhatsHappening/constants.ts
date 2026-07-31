export const MAX_ITEMS_DISPLAYED = 5;

/** Compact carousel card width (px). */
export const WHATS_HAPPENING_CARD_WIDTH = 280;

/**
 * Min height for the tag + 2-line title + 3-line description + pills scenario,
 * including 16px top/bottom padding (no card-level right padding).
 */
export const WHATS_HAPPENING_CARD_MIN_HEIGHT = 230;

export const WhatsHappeningSource = {
  Homepage: 'homepage',
  Explore: 'explore',
  Perps: 'perps',
  Deeplink: 'deeplink',
  Unknown: 'unknown',
} as const;

export type WhatsHappeningSourceValue =
  (typeof WhatsHappeningSource)[keyof typeof WhatsHappeningSource];

export const WhatsHappeningView = {
  Carousel: 'carousel',
  Expanded: 'expanded',
} as const;

export const WhatsHappeningInteractionType = {
  SourceClick: 'source_click',
  TradePressed: 'trade_pressed',
  Pan: 'pan',
  RelatedAssetPressed: 'related_asset_pressed',
} as const;
