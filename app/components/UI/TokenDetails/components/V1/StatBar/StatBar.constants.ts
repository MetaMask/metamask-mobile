import { TokenDetailsVariant } from '../../../constants/constants';
import { TokenStatKey } from './StatBar.types';

/**
 * Which stats each variant shows, in the order they appear.
 *
 * This is the whole of the bar's per-variant behaviour: the component renders
 * whatever this lists and nothing else. Because the `Record` is keyed by
 * `TokenDetailsVariant`, adding a variant to that const object fails type
 * checking here until the new variant declares its stats.
 *
 * Memecoin order is fixed by ASSETS-4019 and is not user-reorderable in V1.
 */
export const STAT_KEYS_BY_VARIANT: Record<
  TokenDetailsVariant,
  readonly TokenStatKey[]
> = {
  [TokenDetailsVariant.Memecoin]: [
    TokenStatKey.MarketCap,
    TokenStatKey.Liquidity,
    TokenStatKey.Volume24h,
    TokenStatKey.Holders,
    TokenStatKey.Top10,
    TokenStatKey.LiquidityToMarketCap,
    TokenStatKey.Tax,
    TokenStatKey.HighLow24h,
    TokenStatKey.CirculatingSupply,
  ],
};

/** Label shown under each value. */
export const STAT_LABEL_KEYS: Record<TokenStatKey, string> = {
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

/** Stands in for a value the API did not return. */
export const STAT_EMPTY_VALUE = '—';
