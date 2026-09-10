import type { SocialShellTab } from '../types';

/**
 * Asset-class filter for the unified Filters sheet. Extends the V0
 * `SocialTypeFilter` with `predictions` (per TSA-1115 designs).
 */
export type SocialFilterType = 'all' | 'tokens' | 'perps' | 'predictions';

/**
 * Trader cohort filter. `following` is exposed on Feed and Live trades only
 * (see `TAB_COHORT_OPTIONS`).
 */
export type SocialTraderCohort =
  | 'all'
  | 'following'
  | 'shrimp'
  | 'dolphin'
  | 'whale'
  | 'kol';

/**
 * Trailing window for the unified Filters sheet. The V0 sheet only offered
 * `7d` / `30d`; TSA-1115 adds `1h` / `24h` to match the new designs.
 */
export type SocialFilterTimeframe = '1h' | '24h' | '7d' | '30d';

/**
 * Network filter. Values mirror the chain ids used by the social service
 * (`robinhood`, `bnb` (bsc), `solana`, `base`). `all` is the default and
 * resolves to "no chain filter" when mapped to API params.
 */
export type SocialFilterNetwork =
  | 'all'
  | 'robinhood'
  | 'bnb'
  | 'solana'
  | 'base';

/**
 * Dual-thumb range filter (market cap, 24h volume). Values are in the unit
 * shown in the sheet (e.g. USD billions for market cap, USD millions for
 * 24h volume) — the API param mapper scales them before forwarding.
 */
export interface SocialRangeFilter {
  min: number;
  max: number;
}

/**
 * Full filter state for a single tab. Every field is present on the model
 * regardless of tab; the sheet hides sections per tab and the param mapper
 * ignores fields that are not relevant for the active tab.
 */
export interface SocialShellFilters {
  type: SocialFilterType;
  traderCohort: SocialTraderCohort;
  timeframe: SocialFilterTimeframe;
  network: SocialFilterNetwork;
  marketCap: SocialRangeFilter;
  volume24h: SocialRangeFilter;
}

/**
 * Per-tab filter state. The draft is what the user is editing inside the
 * sheet; `applied` is what was committed by the last "Show results" tap.
 * `hasActiveFilters` compares `applied` against `DEFAULT_FILTERS`.
 */
export interface SocialShellTabFilterState {
  applied: SocialShellFilters;
  draft: SocialShellFilters;
}

export type SocialShellFilterState = Record<
  SocialShellTab,
  SocialShellTabFilterState
>;

/**
 * API-ready params derived from a tab's `applied` filters. The fields are
 * shaped to drop into the existing `useTopTraders` / `useTraderFeed` hooks
 * once the V1 lists land. `chains` reuses the V0 chain sets; the range
 * fields are forwarded verbatim so the future endpoint can scale them.
 */
export interface SocialFilterApiParams {
  chains: readonly string[];
  timeframe: SocialFilterTimeframe;
  network: SocialFilterNetwork;
  traderCohort: SocialTraderCohort;
  marketCap: SocialRangeFilter;
  volume24h: SocialRangeFilter;
}
