/**
 * Clicker Leaderboard API Types
 * Based on https://docs.clicker.xyz/api-reference/leaderboard
 */

/**
 * Format types for the reason value display
 */
export type ReasonFormat = 'currency' | 'percent' | 'text';

/**
 * Reason object explaining why a trader is ranked
 */
export interface LeaderboardReason {
  title: string;
  value: string;
  format: ReasonFormat;
}

/**
 * Profile images in different sizes
 */
export interface ProfileImages {
  /** Full-sized image URL */
  raw: string | null;
  /** 75x75 image URL */
  xs: string | null;
  /** 300x300 image URL */
  sm: string | null;
}

/**
 * Social and trading metadata for a profile
 */
export interface ProfileMetadata {
  farcasterUsername: string | null;
  farcasterId: number | null;
  lensHandle: string | null;
  ensName: string | null;
  twitterHandle: string | null;
  debankName: string | null;
  pumpName: string | null;
  commentCount30d: number | null;
  pnl30d: number | null;
  winRate30d: number | null;
  tradeCount30d: number | null;
  roiPercent30d: number | null;
  perAddressPnl30d?: Record<string, number>;
  perAddressRoiPercent30d?: Record<string, number | null>;
}

/**
 * Metrics for a specific partner context
 */
export interface PartnerMetrics {
  followingCount: number | null;
  followerCount: number | null;
}

/**
 * Comment metrics
 */
export interface CommentMetrics {
  commentCount30d: number | null;
  commentCountAllTime: number | null;
}

/**
 * Copy trading metrics
 */
export interface CopytradedMetrics {
  count: number | null;
  distinctActors: number | null;
  volumeUSD: number | null;
}

/**
 * Social metrics for a profile
 */
export interface ProfileMetrics {
  thisPartner: PartnerMetrics;
  allPartners: PartnerMetrics;
  comments: CommentMetrics;
  copytradedAllTime: CopytradedMetrics;
}

/**
 * A trader entry in the leaderboard
 */
export interface LeaderboardTrader {
  reason: LeaderboardReason;
  id: string;
  name: string;
  images: ProfileImages;
  addresses: string[];
  metadata: ProfileMetadata;
  metrics?: ProfileMetrics;
}

/**
 * A section of the leaderboard (e.g., by chain, by community)
 */
export interface LeaderboardSection {
  key: string;
  title: string;
  description: string;
  commenters: LeaderboardTrader[];
  others: LeaderboardTrader[];
}

/**
 * Response from the Clicker Leaderboard API
 */
export interface LeaderboardResponse {
  sections: LeaderboardSection[];
}

/**
 * Chain filter options for the leaderboard
 */
export type LeaderboardChainFilter =
  | 'all'
  | 'base'
  | 'solana'
  | 'ethereum'
  | 'hyperliquid';

/**
 * Chain filter configuration
 */
export interface ChainFilterOption {
  id: LeaderboardChainFilter;
  label: string;
  section?: string; // API section value
}

/**
 * Available chain filters for the leaderboard
 */
export const LEADERBOARD_CHAIN_FILTERS: ChainFilterOption[] = [
  { id: 'all', label: 'All', section: undefined },
  { id: 'base', label: 'Base', section: 'base' },
  { id: 'solana', label: 'Solana', section: 'solana' },
  { id: 'ethereum', label: 'Ethereum', section: 'ethereum' },
  { id: 'hyperliquid', label: 'Hyperliquid', section: 'hyperliquid' },
];

/**
 * Parameters for the leaderboard API request
 */
export interface LeaderboardParams {
  /** Number of results to return (1-250, default 50) */
  limit?: number;
  /** Specific sections to fetch */
  sections?: string | string[];
}

/**
 * State for the leaderboard data
 */
export interface LeaderboardState {
  traders: LeaderboardTrader[];
  isLoading: boolean;
  error: string | null;
  lastFetched: number | null;
}

/**
 * Full trader profile from the Profile API
 * @see https://docs.clicker.xyz/api-reference/profile
 */
export interface TraderProfile {
  id: string;
  name: string;
  images: ProfileImages;
  addresses: string[];
  metadata: ProfileMetadata;
  metrics?: ProfileMetrics;
}

/**
 * Supported chains for the Feed API
 */
export type FeedChain =
  | 'ethereum'
  | 'base'
  | 'solana'
  | 'arbitrum'
  | 'optimism'
  | 'polygon'
  | 'bsc'
  | 'avalanche'
  | 'zora';

/**
 * Individual trade within a feed item
 */
export interface FeedTrade {
  tokenAmount: number;
  usdCost: number;
  marketCap?: number;
  timestamp: number;
  transactionHash?: string;
  direction: 'buy' | 'sell';
  perpPositionType?: 'long' | 'short';
  perpLeverage?: number;
}

/**
 * Position stats for a trade
 */
export interface PositionStats {
  boughtUsd: number;
  soldUsd: number;
  realizedGainsUsd: number;
  holdingsCostBasisUsd: number;
}

/**
 * Trade metadata from the Feed API
 */
export interface FeedMetadata {
  tokenChain: FeedChain;
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  metadataType?: string;
  totalSupply?: string;
  positionAmount?: number;
  positionStats?: PositionStats;
  trades?: FeedTrade[];
}

/**
 * Trade metrics
 */
export interface FeedMetrics {
  copyCount?: number;
  copyVolume?: string;
  replyCount?: number;
  commentCount?: number;
}

/**
 * Call to action for a feed item (e.g., swap link)
 */
export interface FeedCallToAction {
  text: string;
  url: string;
}

/**
 * A trade/transaction item from the Feed API
 * @see https://docs.clicker.xyz/api-reference/feed
 */
export interface FeedItem {
  itemId: string;
  itemTitle?: string;
  timestamp: number; // Unix timestamp
  transactionHash?: string;
  cardLatestTradeAt?: number;
  actor: {
    type: string;
    address: string;
    name: string;
    images: ProfileImages;
    profile?: TraderProfile;
  };
  metadata?: FeedMetadata;
  metrics?: FeedMetrics;
  insights?: Array<{ text: string }>;
  imageUrl?: string;
  callToActions?: FeedCallToAction[];
}

/**
 * Response from the Feed API
 */
export interface FeedResponse {
  items: FeedItem[];
  pagination: {
    hasMore: boolean;
    oldestTimestamp?: string;
  };
}

/**
 * Parameters for the Feed API request
 */
export interface FeedParams {
  /** Array of addresses to get feed for (required) */
  addresses: string[];
  /** Number of items to return (default 25) */
  limit?: number;
  /** Filter to trades newer than this timestamp */
  newerThan?: string;
  /** Filter to trades older than this timestamp */
  olderThan?: string;
  /** Filter to specific chains */
  chains?: FeedChain[];
  /** Only include trades with comments */
  onlyWithComments?: boolean;
  /** Minimum trade USD value */
  minTradeUsd?: number;
}
