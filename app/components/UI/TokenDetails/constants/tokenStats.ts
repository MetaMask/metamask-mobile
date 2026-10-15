import type { ExplainerCopy } from '../components/V1/TokenExplainerSheet/TokenExplainerSheet.types';

/**
 * Every statistic Token Details V1 knows how to render.
 *
 * Shared by the stat bar and the Security tab rather than declared in each.
 * The two surfaces overlap on five stats, and when they each owned a key enum
 * the overlap drifted: two keys matched by accident, three differed only in
 * spelling, and Liq/MC ended up computed on one surface and hardcoded `null`
 * on the other. One enum makes that class of divergence unrepresentable.
 *
 * Neither surface shows all of these. The bar reads
 * `STAT_KEYS_BY_VARIANT`, the tab reads `SECURITY_SECTIONS`, and each keys its
 * own labels off its own list, so a stat only needs copy where it appears.
 *
 * Declared as a const object so adding an entry turns every
 * `Record<TokenStatKey, ...>` lookup into a type error until it handles the
 * new stat.
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
  LpBurnedLocked: 'lp_burned_locked',
  PrimaryPool: 'primary_pool',
  VolumeFlags: 'volume_flags',
  ListedOnExchange: 'listed_on_exchange',
  Created: 'created',
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
  /**
   * Renders a skeleton in place of the value. Set per stat rather than for the
   * surface as a whole because the market-sourced cells resolve on a different
   * schedule from the security-sourced ones, and a token the user already
   * holds has its market data in state with nothing to wait for.
   */
  isLoading?: boolean;
}

/**
 * Values keyed by stat. Partial because a key a surface lists may have no
 * value yet, which collapses "no data" and "not applicable" into the same
 * gray-dash path.
 */
export type TokenStatValues = Partial<Record<TokenStatKey, TokenStatValue>>;

/**
 * Stands in for a value the API did not return.
 *
 * An em dash, rendered in `text-alternative`, so a missing reading cannot be
 * mistaken for a real one. ASSETS-4022 forbids `0%` or a green tick standing
 * in for absent data.
 */
export const STAT_EMPTY_VALUE = '\u2014';

/**
 * Copy for a stat's explainer sheet, shared by the stat bar and the Security
 * tab.
 *
 * One map rather than one per surface. The two used to carry their own, and
 * four of the five overlapping stats had byte-identical descriptions under two
 * locale keys — while Liquidity's two copies had already drifted apart by a
 * typographic apostrophe, which is the kind of divergence nobody notices until
 * a translator asks why the same sentence appears twice.
 *
 * Titles are separate from the row labels because a label abbreviates to fit
 * its line (`Liq/MC`, `Top 10`) while the sheet spells the term out.
 */
export const STAT_EXPLAINER_KEYS: Record<TokenStatKey, ExplainerCopy> = {
  [TokenStatKey.MarketCap]: {
    title: 'token_details_v1.stats.explainers.market_cap.title',
    description: 'token_details_v1.stats.explainers.market_cap.description',
  },
  [TokenStatKey.Liquidity]: {
    title: 'token_details_v1.stats.explainers.liquidity.title',
    description: 'token_details_v1.stats.explainers.liquidity.description',
  },
  [TokenStatKey.Volume24h]: {
    title: 'token_details_v1.stats.explainers.volume_24h.title',
    description: 'token_details_v1.stats.explainers.volume_24h.description',
  },
  [TokenStatKey.Holders]: {
    title: 'token_details_v1.stats.explainers.holders.title',
    description: 'token_details_v1.stats.explainers.holders.description',
  },
  [TokenStatKey.Top10]: {
    title: 'token_details_v1.stats.explainers.top_10.title',
    description: 'token_details_v1.stats.explainers.top_10.description',
  },
  [TokenStatKey.LiquidityToMarketCap]: {
    title: 'token_details_v1.stats.explainers.liquidity_to_market_cap.title',
    description:
      'token_details_v1.stats.explainers.liquidity_to_market_cap.description',
  },
  [TokenStatKey.Tax]: {
    title: 'token_details_v1.stats.explainers.tax.title',
    description: 'token_details_v1.stats.explainers.tax.description',
  },
  [TokenStatKey.HighLow24h]: {
    title: 'token_details_v1.stats.explainers.high_low_24h.title',
    description: 'token_details_v1.stats.explainers.high_low_24h.description',
  },
  [TokenStatKey.CirculatingSupply]: {
    title: 'token_details_v1.stats.explainers.circulating_supply.title',
    description:
      'token_details_v1.stats.explainers.circulating_supply.description',
  },
  [TokenStatKey.LpBurnedLocked]: {
    title: 'token_details_v1.stats.explainers.lp_burned_locked.title',
    description:
      'token_details_v1.stats.explainers.lp_burned_locked.description',
  },
  [TokenStatKey.PrimaryPool]: {
    title: 'token_details_v1.stats.explainers.primary_pool.title',
    description: 'token_details_v1.stats.explainers.primary_pool.description',
  },
  [TokenStatKey.VolumeFlags]: {
    title: 'token_details_v1.stats.explainers.volume_flags.title',
    description: 'token_details_v1.stats.explainers.volume_flags.description',
  },
  [TokenStatKey.ListedOnExchange]: {
    title: 'token_details_v1.stats.explainers.listed_on_exchange.title',
    description:
      'token_details_v1.stats.explainers.listed_on_exchange.description',
  },
  [TokenStatKey.Created]: {
    title: 'token_details_v1.stats.explainers.created.title',
    description: 'token_details_v1.stats.explainers.created.description',
  },
};
