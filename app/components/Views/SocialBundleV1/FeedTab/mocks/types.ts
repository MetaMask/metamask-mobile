import type { ImageSourcePropType } from 'react-native';

/**
 * Mock data shape for the SocialBundleV1 prototype Feed.
 *
 * A `FeedItem` is a discriminated union over `type`, matching the four card
 * variants Design + Product asked for (see TSA-1121):
 *
 * - `perps_big`  — perps position with post text (e.g. BTC 40x Short).
 * - `token_big`  — spot token position with post text (e.g. PUMP Buy).
 * - `closed`     — closed position card with post text (e.g. ETH 15x Short).
 * - `default`    — small spot token card without post text (e.g. PEPE Buy).
 *
 * Everything here is mocked — no API contracts implied.
 */

export type TraderTier = 'shrimp' | 'dolphin' | 'whale';

/** Shared header fields every feed entry renders. */
export interface FeedTrader {
  id: string;
  name: string;
  avatar: ImageSourcePropType;
  winRatePct: number;
  tier: TraderTier;
}

/** Points that plot the price line on the big-position cards. */
export interface ChartPoint {
  /** Normalized 0..1 along the horizontal axis. */
  x: number;
  /** Normalized 0..1 along the vertical axis (0 = bottom, 1 = top). */
  y: number;
}

export interface PositionChart {
  /** Ordered points for the price line. */
  points: ChartPoint[];
  /**
   * Index into `points` where the position was opened — rendered as a marker
   * dot on the line. `null` hides the marker (still shows the end-dot).
   */
  openMarkerIndex: number | null;
  /** Green (positive PnL) or red (negative) tint for the line + end-dot. */
  trend: 'up' | 'down';
}

export interface FeedFooter {
  likes: number;
  comments: number;
  reposts: number;
}

interface FeedItemBase {
  id: string;
  trader: FeedTrader;
  /** e.g. "5 min ago" — the prototype uses raw strings, not a live clock. */
  timeAgo: string;
  footer: FeedFooter;
}

export interface PerpsBigFeedItem extends FeedItemBase {
  type: 'perps_big';
  postText: string;
  position: {
    tokenSymbol: string; // "BTC"
    /** Optional token logo — when null, cards fall back to an MMDS monogram. */
    tokenLogo: ImageSourcePropType | null;
    side: 'long' | 'short';
    /** Formatted display string (e.g. "$212,000.00"). */
    entryPrice: string;
    /** Notional size, e.g. "$38.0M". */
    notional: string;
    /** e.g. "+$272,632.00". */
    pnlAbs: string;
    /** e.g. "+128.6%". */
    pnlPct: string;
    leverage: string; // "40X"
    takeProfit: string; // "$101,214"
    stopLoss: string; // "$110,905"
    liquidationPrice: string; // "$110,367"
    chart: PositionChart;
  };
}

export interface TokenBigFeedItem extends FeedItemBase {
  type: 'token_big';
  postText: string;
  position: {
    tokenSymbol: string; // "PUMP"
    tokenLogo: ImageSourcePropType | null;
    side: 'buy' | 'sell';
    entryPrice: string; // "$0.0₄4947"
    /** Market cap, e.g. "$128,400.00". */
    marketCap: string;
    /** Volume, e.g. "$3.1B". */
    volume: string;
    pnlAbs: string; // "+$95,272.80"
    pnlPct: string; // "+74.2%"
    holdTime: string; // "1d 20h"
    /** Two ints for the top-N% / devs holders bar. */
    holdersTopPct: number;
    holdersDevPct: number;
    chart: PositionChart;
  };
}

export interface ClosedFeedItem extends FeedItemBase {
  type: 'closed';
  postText: string;
  position: {
    tokenSymbol: string; // "ETH"
    tokenLogo: ImageSourcePropType | null;
    side: 'long' | 'short';
    leverage: string; // "15X"
    pnlAbs: string; // "+$96,378.60"
    pnlPct: string; // "+38.2%"
    entryPrice: string; // "$1,890"
    exitPrice: string; // "$1,842"
    maxHoldTime: string; // "8h"
    status: 'closed';
  };
}

export interface DefaultFeedItem extends FeedItemBase {
  type: 'default';
  position: {
    tokenSymbol: string; // "PEPE"
    tokenLogo: ImageSourcePropType | null;
    side: 'buy' | 'sell';
    /** Market cap headline, e.g. "$4.2B MC". */
    marketCap: string;
    volume: string; // "$44.5M"
    price: string; // "$5,610.00"
    pnlPct: string; // "+9.84%"
  };
}

export type FeedItem =
  | PerpsBigFeedItem
  | TokenBigFeedItem
  | ClosedFeedItem
  | DefaultFeedItem;

export type FeedAudience = 'trending' | 'following';
