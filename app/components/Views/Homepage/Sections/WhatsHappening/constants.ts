export const MAX_ITEMS_DISPLAYED = 5;

export const WhatsHappeningSource = {
  Homepage: 'homepage',
  Explore: 'explore',
  Unknown: 'unknown',
} as const;

export type WhatsHappeningSourceValue =
  (typeof WhatsHappeningSource)[keyof typeof WhatsHappeningSource];

export const WhatsHappeningInteractionType = {
  SourceClick: 'source_click',
  TradePressed: 'trade_pressed',
} as const;
