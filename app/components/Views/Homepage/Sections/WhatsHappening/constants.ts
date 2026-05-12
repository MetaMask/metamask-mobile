export const MAX_ITEMS_DISPLAYED = 5;

export const WhatsHappeningSource = {
  Homepage: 'homepage',
  Explore: 'explore',
  Deeplink: 'deeplink',
  Unknown: 'unknown',
} as const;

export type WhatsHappeningSourceValue =
  (typeof WhatsHappeningSource)[keyof typeof WhatsHappeningSource];

export const WhatsHappeningInteractionType = {
  SourceClick: 'source_click',
  BuyPressed: 'buy_pressed',
  TradePressed: 'trade_pressed',
} as const;
