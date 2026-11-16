declare const predictTrendingMarketBrand: unique symbol;

/**
 * A market shown in an Explore section or search result. Opaque: callers
 * read `id` for list keys and analytics, and hand the market back to the
 * Predict component that renders it. Only the trending hooks mint one.
 */
export interface PredictTrendingMarket {
  readonly id: string;
  readonly [predictTrendingMarketBrand]: true;
}

/** Which Predict feed an Explore section shows. */
export type PredictTrendingVariant =
  | 'trending'
  | 'sports'
  | 'crypto'
  | 'politics';

export interface UsePredictTrendingFeedOptions {
  /** @default 'trending' */
  variant?: PredictTrendingVariant;
  /** A non-empty query searches instead of listing the variant's feed. */
  query?: string;
  /** Explore's pull-to-refresh trigger. */
  refresh?: { trigger: number; silentRefresh: boolean };
  /** @default true */
  enabled?: boolean;
}

/** A page of markets for an Explore section or search result list. */
export interface PredictTrendingFeed {
  data: PredictTrendingMarket[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  fetchMore?: () => void;
  isFetchingMore?: boolean;
  hasMore?: boolean;
  /** Total result count from the server; only set while searching. */
  total?: number;
}

/** One sport's markets in the Sports tab's All Sports list. */
export interface PredictSportsMarketsPage {
  marketData: PredictTrendingMarket[];
  isFetching: boolean;
  isFetchingMore: boolean;
  error: string | null;
  hasMore: boolean;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
}

/** The Sports tab's All Sports list: a pill per sport and its markets. */
export interface PredictSportsMarketsFeed {
  pills: { key: string; name: string }[];
  activeKey: string;
  select: (key: string) => void;
  active: PredictSportsMarketsPage;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/** Predict market identity for Explore search analytics. */
export interface PredictTrendingMarketAnalyticsProperties {
  market_id?: string;
  market_slug?: string;
  market_tags?: string[];
  market_title?: string;
}
