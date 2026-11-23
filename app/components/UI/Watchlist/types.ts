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
  tokenMembershipAssetIds: string[];
  tokenCount: number;
  perpsCount: number;
  isInitialLoading: boolean;
  persistOrder: (keys: string[]) => Promise<void>;
  appendOrderKey: (key: string) => Promise<void>;
  refresh: () => Promise<void>;
}
