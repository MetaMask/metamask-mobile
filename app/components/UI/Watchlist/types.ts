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
  orderedItems: UnifiedWatchlistItem[];
  isOrderLoading: boolean;
  isOrderReady: boolean;
  orderError: string | null;
  tokens: UnifiedWatchlistDomainState<UnifiedWatchlistToken>;
  perps: UnifiedWatchlistDomainState<UnifiedWatchlistPerp>;
  canUseLivePerpsPrices: boolean;
  canUseMotion: boolean;
  canRefresh: boolean;
  canFetchSuggestions: boolean;
  tokenMembershipAssetIds: string[];
  isTokenMetadataComplete: boolean;
  tokenCount: number;
  isInitialLoading: boolean;
  persistOrder: (keys: string[]) => Promise<void>;
  refresh: () => Promise<void>;
}
