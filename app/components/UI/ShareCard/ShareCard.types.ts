/**
 * Whether the shared result went up or down. Picks the theme accent, the sign
 * glyph, and the change arrow.
 */
export type ShareCardDirection = 'up' | 'down';

export interface ShareCardAuthor {
  /** Name shown in the user chip, e.g. `alex.eth`. */
  label: string;
  imageUrl?: string;
  /** Wallet address used for the fallback avatar when there is no image. */
  address?: string;
}

export interface ShareCardMarket {
  /** Ticker shown first on the market line, e.g. `BTC`. */
  symbol: string;
  imageUrl?: string;
  /** Text after the separator dot, e.g. `Long 20x`. Omitted for spot. */
  detail?: string;
}

export interface ShareCardStat {
  label: string;
  value: string;
}

export interface ShareCardChartModel {
  /** Price series, oldest first. Fewer than two points draws no line. */
  points: number[];
  /** Index into `points` of the entry marker. */
  entryIndex?: number;
  /** Index into `points` of the exit marker. */
  exitIndex?: number;
}

/**
 * Everything a share card draws, already formatted. Surfaces build this from
 * their own data so the card itself stays free of domain logic.
 */
export interface ShareCardModel {
  direction: ShareCardDirection;
  author: ShareCardAuthor;
  /** Top-right caption, e.g. `Closed · 2 hr ago`. Rendered uppercase. */
  statusLabel: string;
  market: ShareCardMarket;
  /** Hero figure with its sign, e.g. `+$1,248.50`. */
  primaryValue: string;
  /** Unsigned change beside the hero, e.g. `26.02%`. */
  changeLabel: string;
  /** Up to two label/value pairs under the hero. */
  stats: ShareCardStat[];
  chart: ShareCardChartModel;
  /** Referral code shown in the footer. Hidden when absent. */
  promoCode?: string;
  /** Line under the promo code, e.g. what the code gives. Rendered uppercase. */
  promoCaption?: string;
}
