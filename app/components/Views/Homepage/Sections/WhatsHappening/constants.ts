export const MAX_ITEMS_DISPLAYED = 5;

export const WhatsHappeningSource = {
  Homepage: 'homepage',
  Explore: 'explore',
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
  BuyPressed: 'buy_pressed',
  TradePressed: 'trade_pressed',
  Pan: 'pan',
} as const;
