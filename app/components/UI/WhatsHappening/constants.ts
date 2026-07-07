export const MAX_ITEMS_DISPLAYED = 5;

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
