import { TokenDetailsVariant } from '../../../constants/constants';
import { TokenStatKey } from '../../../constants/tokenStats';

/**
 * The bar's whole vocabulary, in the order the memecoin variant shows them.
 *
 * `as const` so `BarStatKey` can be derived from it rather than restating the
 * union: the bar carries labels for these nine and needs none for the five
 * stats only the Security tab renders.
 */
const BAR_STAT_KEYS = [
  TokenStatKey.MarketCap,
  TokenStatKey.Liquidity,
  TokenStatKey.Volume24h,
  TokenStatKey.Holders,
  TokenStatKey.Top10,
  TokenStatKey.LiquidityToMarketCap,
  TokenStatKey.Tax,
  TokenStatKey.HighLow24h,
  TokenStatKey.CirculatingSupply,
] as const;

/** Only the stats the bar can show, so `STAT_LABEL_KEYS` stays exhaustive. */
export type BarStatKey = (typeof BAR_STAT_KEYS)[number];

/**
 * Which stats each variant shows, in the order they appear.
 *
 * This is the whole of the bar's per-variant behaviour: the component renders
 * whatever this lists and nothing else. Keyed by `TokenDetailsVariant`, so
 * adding a variant fails type checking here until it declares its stats.
 *
 * Memecoin order is fixed by ASSETS-4019 and is not user-reorderable in V1.
 */
export const STAT_KEYS_BY_VARIANT: Record<
  TokenDetailsVariant,
  readonly BarStatKey[]
> = {
  [TokenDetailsVariant.Memecoin]: BAR_STAT_KEYS,
};

/**
 * Label shown under each value.
 *
 * Abbreviated to fit a cell, which is why these are the bar's own rather than
 * shared with the Security tab: the same stat reads `Liquidity` here and
 * `Total liquidity` on a full-width row. The explainer copy behind both *is*
 * shared — see `STAT_EXPLAINER_KEYS`.
 */
export const STAT_LABEL_KEYS: Record<BarStatKey, string> = {
  [TokenStatKey.MarketCap]: 'token_details_v1.stats.market_cap',
  [TokenStatKey.Liquidity]: 'token_details_v1.stats.liquidity',
  [TokenStatKey.Volume24h]: 'token_details_v1.stats.volume_24h',
  [TokenStatKey.Holders]: 'token_details_v1.stats.holders',
  [TokenStatKey.Top10]: 'token_details_v1.stats.top_10',
  [TokenStatKey.LiquidityToMarketCap]:
    'token_details_v1.stats.liquidity_to_market_cap',
  [TokenStatKey.Tax]: 'token_details_v1.stats.tax',
  [TokenStatKey.HighLow24h]: 'token_details_v1.stats.high_low_24h',
  [TokenStatKey.CirculatingSupply]: 'token_details_v1.stats.circulating_supply',
};
