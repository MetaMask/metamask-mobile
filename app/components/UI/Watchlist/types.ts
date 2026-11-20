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

export interface UnifiedWatchlistDomainState<TItem> {
  items: TItem[];
  isLoading: boolean;
  error: string | null;
}

export interface UnifiedWatchlistResult {
  isUnifiedEnabled: boolean;
  isPerpsEnabled: boolean;
  items: UnifiedWatchlistItem[];
  tokens: UnifiedWatchlistDomainState<UnifiedWatchlistToken>;
  perps: UnifiedWatchlistDomainState<UnifiedWatchlistPerp>;
  canUseLivePerpsPrices: boolean;
  canUseMotion: boolean;
  canRefresh: boolean;
  canFetchSuggestions: boolean;
  isInitialLoading: boolean;
  refresh: () => Promise<void>;
}
