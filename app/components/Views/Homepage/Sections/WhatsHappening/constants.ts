export const MAX_ITEMS_DISPLAYED = 5;

export const WhatsHappeningEntryPoint = {
  Card: 'card',
  ViewAll: 'view_all',
} as const;

export const WhatsHappeningSource = {
  Homepage: 'homepage',
  Explore: 'explore',
} as const;

export type WhatsHappeningSourceValue =
  (typeof WhatsHappeningSource)[keyof typeof WhatsHappeningSource];

export const WhatsHappeningInteractionType = {
  SourceClick: 'source_click',
  BuyPressed: 'buy_pressed',
  TradePressed: 'trade_pressed',
} as const;
