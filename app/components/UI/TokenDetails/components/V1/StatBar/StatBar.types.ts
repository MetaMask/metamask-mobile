/**
 * Every statistic the Token Details V1 stat bar knows how to render.
 *
 * Variants pick a subset in their own order, so this is the union of all
 * variants rather than any one variant's bar. Declared as a const object so
 * adding an entry turns every `Record<TokenStatKey, ...>` lookup into a type
 * error until it handles the new stat.
 */
export const TokenStatKey = {
  MarketCap: 'market_cap',
  Liquidity: 'liquidity',
  Volume24h: 'volume_24h',
  Holders: 'holders',
  Top10: 'top_10',
  LiquidityToMarketCap: 'liquidity_to_market_cap',
  Tax: 'tax',
  HighLow24h: 'high_low_24h',
  CirculatingSupply: 'circulating_supply',
} as const;

export type TokenStatKey = (typeof TokenStatKey)[keyof typeof TokenStatKey];

export interface TokenStatValue {
  /**
   * Already formatted for display. `null` renders the gray dash, which
   * ASSETS-4019 requires for a missing value — never `0%`, never a tick.
   */
  value: string | null;
  /**
   * Renders the value in amber. Only Liq/MC uses it in V1, and it is purely a
   * display state: it does not feed the security verdict.
   */
  isWarning?: boolean;
}

/**
 * Values keyed by stat. Partial because a key listed by a variant may have no
 * value yet, which collapses "no data" and "not applicable" into the same
 * gray-dash path.
 */
export type TokenStatValues = Partial<Record<TokenStatKey, TokenStatValue>>;
