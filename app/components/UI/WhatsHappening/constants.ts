/** Skeleton placeholder count while the market overview is loading. */
export const SKELETON_CARD_COUNT = 5;

/** Compact carousel card width (px). */
export const WHATS_HAPPENING_CARD_WIDTH = 280;

/** Space between carousel cards. Matches the previous `gap-3` (12px). */
export const WHATS_HAPPENING_CAROUSEL_GAP = 12;

/**
 * Horizontal inset of the carousel content. Matches the previous `px-4` (16px).
 * Card positions in the scroll content start after this padding.
 */
export const WHATS_HAPPENING_CAROUSEL_HORIZONTAL_PADDING = 16;

/** Fraction of card width that must overlap the carousel viewport. */
export const WHATS_HAPPENING_CARD_VISIBILITY_THRESHOLD = 0.5;

/**
 * How often the carousel reports scroll position while the user is dragging.
 * A half-card crossing is 140px, so this still samples a normal snap without
 * a per-frame native event stream.
 */
export const WHATS_HAPPENING_CAROUSEL_SCROLL_EVENT_THROTTLE = 50;

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
