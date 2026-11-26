import type { TrendingAsset } from '@metamask/assets-controllers';
import type { PerpsMarketData } from '@metamask/perps-controller';

export interface UnifiedWatchlistToken {
  kind: 'token';
  key: string;
  assetId: string;
  token: TrendingAsset;
}

export interface UnifiedWatchlistResolvedPerp {
  kind: 'perp';
  key: string;
  symbol: string;
  status: 'resolved';
  market: PerpsMarketData;
}

export interface UnifiedWatchlistUnavailablePerp {
  kind: 'perp';
  key: string;
  symbol: string;
  status: 'unavailable';
}

export type UnifiedWatchlistPerp =
  | UnifiedWatchlistResolvedPerp
  | UnifiedWatchlistUnavailablePerp;

export type UnifiedWatchlistItem = UnifiedWatchlistToken | UnifiedWatchlistPerp;

export type WatchlistFilter = 'all' | 'tokens' | 'perps';

export interface UnifiedWatchlistDomainState<TItem> {
  items: TItem[];
  error: string | null;
}

export interface UnifiedWatchlistResult {
  items: UnifiedWatchlistItem[];
  isOrderReady: boolean;
  orderError: string | null;
  tokens: UnifiedWatchlistDomainState<UnifiedWatchlistToken>;
  perps: UnifiedWatchlistDomainState<UnifiedWatchlistPerp>;
  suggestedPerps: PerpsMarketData[];
  canUseLivePerpsPrices: boolean;
  canUseMotion: boolean;
  canRefresh: boolean;
  canFetchSuggestions: boolean;
  /**
   * Raw persisted token membership asset IDs, including entries whose metadata
   * did not hydrate. Used for order pruning and suggestion deduplication.
   */
  tokenMembershipAssetIds: string[];
  perpsMembershipSymbols: string[];
  /**
   * Count of hydrated, visible watchlist tokens (`tokens.items.length`) rather
   * than raw `tokenMembershipAssetIds.length`. Stored blobs can legitimately
   * retain stale or delisted asset IDs with no API metadata; those unhydrated
   * entries are omitted without surfacing a coverage error so callers,
   * suggestion budgets, and analytics match rendered token rows.
   */
  tokenCount: number;
  perpsCount: number;
  isInitialLoading: boolean;
  persistOrder: (keys: string[]) => Promise<void>;
  appendOrderKey: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
}
