import type { CaipChainId } from '@metamask/utils';
import type {
  FeedItem as CoreFeedItem,
  Position,
} from '@metamask/social-controllers';
import type { PositionTokenAvatarData } from './components/PositionTokenAvatar';
import type { SocialLivePriceSource } from './live/types';
import type { TradeAction } from './utils/tradeAction';

export type SocialV1PerpDirection = 'long' | 'short';
export type SocialV1SpotSide = 'buy' | 'sell';

export interface SocialFeedPageHandle {
  scrollToOffset: (offset: number, animated?: boolean) => void;
}

export interface SocialV1FeedAsset {
  /** Ticker shown on the position card (`BTC`, `NVDA`). */
  symbol: string;
  /**
   * Human name from the feed row when it is a real name and not the ticker
   * or a raw market id (`Ethereum`, `NVIDIA`).
   */
  name?: string;
  avatar: PositionTokenAvatarData;
}

/** The trader who published the post, rendered in the post header. */
export interface SocialV1FeedAuthor {
  /** Social API trader id, used to open their profile. */
  id: string;
  username: string;
  /** Wallet address, used for the Maskicon fallback when there is no avatar. */
  address?: string;
  avatarUri?: string | null;
  /**
   * Whole percent (e.g. `92` for 92%), matching the leaderboard's
   * `TopTrader.winRatePercent`. `null` when the window has no win-rate data,
   * in which case the badge is omitted.
   */
  winRatePercent: number | null;
  /** 30-day realized PnL in USD. Null when the feed actor omitted it. */
  pnl30d?: number | null;
  /** 30-day sell count behind the win rate. */
  tradeCount30d?: number | null;
  /** Profiles following this trader. */
  followerCount?: number | null;
}

interface SocialV1FeedItemBase {
  id: string;
  author: SocialV1FeedAuthor;
  /** Post time in seconds or milliseconds -- see `tradeTimestampToMs`. */
  timestamp: number;
  asset: SocialV1FeedAsset;
  /** Author comment. */
  comment?: string;
  /**
   * Klipy GIF the author attached to the comment. Set on a GIF-only comment,
   * which has no `comment` caption, so the card still counts it as commented.
   * The card body does not render it.
   */
  commentGifUrl?: string;
  /**
   * Realized P&L in USD on a closed position, current value on an open one.
   * Only the closed layout renders it; the open layout leads with P&L instead.
   */
  valueLabel: string;
  /** P&L as a percent. */
  pnlLabel: string;
  /** P&L in USD, abbreviated (`+$256.96K`). Sits under the percent when open. */
  pnlValueLabel?: string;
  /** USD the trader put in, i.e. what the P&L is measured against. */
  costLabel?: string;
  isPnlPositive: boolean;
}

export interface SocialV1PerpsOpenFeedItem extends SocialV1FeedItemBase {
  variant: 'perpsOpen';
  direction: SocialV1PerpDirection;
  /**
   * Tradable market id forwarded to the Perps order sheet. HIP-3 markets keep
   * the `xyz:` prefix here; `asset.symbol` is the stripped display ticker.
   */
  tradeSymbol: string;
  /** Numeric multiplier forwarded to the Perps order sheet on copy trade. */
  leverage?: number;
  markPriceLabel?: string;
  leverageLabel?: string;
  entryPriceLabel?: string;
  /** Time held so far, first fill to now. */
  holdTimeLabel?: string;
  /** How the card's figures follow the streamed mark price. */
  live?: SocialLivePriceSource;
  /**
   * Composer previews set this to `false` so the card does not offer to copy
   * the order that was just placed. Absent means the open position is copyable.
   */
  showCopyTrade?: boolean;
}

export interface SocialV1PerpsClosedFeedItem extends SocialV1FeedItemBase {
  variant: 'perpsClosed';
  direction: SocialV1PerpDirection;
  leverageLabel?: string;
  entryPriceLabel?: string;
  exitPriceLabel?: string;
  holdTimeLabel?: string;
  /** Epoch milliseconds of the closing fill. */
  closedAtMs?: number;
}

export interface SocialV1SpotOpenFeedItem extends SocialV1FeedItemBase {
  variant: 'spotOpen';
  side: SocialV1SpotSide;
  markPriceLabel?: string;
  /** Current market cap, scaled from the fills' market cap per unit price. */
  marketCapLabel?: string;
  entryPriceLabel?: string;
  entryMarketCapLabel?: string;
  /** Time held so far, first fill to now. */
  holdTimeLabel?: string;
  /** How the card's figures follow the streamed spot price. */
  live?: SocialLivePriceSource;
}

export interface SocialV1SpotClosedFeedItem extends SocialV1FeedItemBase {
  variant: 'spotClosed';
  side: SocialV1SpotSide;
  entryPriceLabel?: string;
  entryMarketCapLabel?: string;
  exitPriceLabel?: string;
  exitMarketCapLabel?: string;
  holdTimeLabel?: string;
  /** Epoch milliseconds of the closing fill. */
  closedAtMs?: number;
}

/**
 * Composer-shared spot position. Reuses the open card layout; Copy trade is
 * gated by `showCopyTrade` so a closed share still has no CTA.
 */
export interface SocialV1SpotShareFeedItem extends SocialV1FeedItemBase {
  variant: 'spotShare';
  side: SocialV1SpotSide;
  markPriceLabel?: string;
  entryPriceLabel?: string;
  holdTimeLabel?: string;
  showCopyTrade?: boolean;
  /** How the card's figures follow the streamed spot price, as on an open row. */
  live?: SocialLivePriceSource;
}

/**
 * Two layouts -- open and closed -- crossed with the asset class. Both share
 * the header. Open cards quote a live price or market cap and offer Copy
 * trade. Closed cards caption when the position settled and offer nothing,
 * because there is no longer a position to copy. The asset class decides the
 * side tag and whether entry and exit are quoted as market cap. `spotShare`
 * is the composer insert of a spot position.
 */
export type SocialV1FeedItem =
  | SocialV1PerpsOpenFeedItem
  | SocialV1PerpsClosedFeedItem
  | SocialV1SpotOpenFeedItem
  | SocialV1SpotClosedFeedItem
  | SocialV1SpotShareFeedItem;

export interface SocialV1FeedPost {
  id: string;
  authorHandle: string;
  authorImageUrl?: string | null;
  timestampMs: number;
  /**
   * Swap-comment id for the Call this post reacts to. Absent on pending
   * composer posts and on live rows with no authorComment. The heart still
   * renders; picks stay session-local until a Call id exists.
   */
  commentId?: string;
  /**
   * Language the Call was written in. `null` when the API has not detected
   * one. Absent on older payloads. The translate control hides only for `en`.
   */
  sourceLanguage?: string | null;
  /** Translations already returned with the Call, keyed by language code. */
  translations?: Record<string, string>;
  reactions: { emotion: string; count: number }[];
  /** Session/API viewer emotion when known. */
  userReaction?: string | null;
  /** Detected copies of this position. Absent on older social-api builds. */
  copyCount?: number;
  /**
   * Triggering spot fill market cap in USD. Null for perps and for fills that
   * omitted it. Following / Live market-cap filters pass those through.
   */
  marketCapUsd?: number | null;
  gifUri?: string;
  isPending?: boolean;
  item: SocialV1FeedItem;
  /**
   * The canonical position behind a live row, handed to the position details
   * sheet so it opens without a fetch. Absent on pending and mocked posts.
   */
  position?: Position;
  /**
   * Socket event whose entrance this post plays once. Absent on posts that
   * arrived without one (HTTP snapshot, revisions of rows already shown).
   */
  realtimeEventId?: string;
}

/**
 * Feed audience filter. `all` shows every trader's activity; `following` shows
 * only the activity of traders the user follows.
 */
export type FeedAudience = 'all' | 'following';

/**
 * Asset class a social surface is narrowed to. Same values as the
 * leaderboard's `SocialTypeFilter`, so filter state passes straight through.
 */
export type SocialAssetClass = 'all' | 'tokens' | 'perps';

/**
 * Position-lifecycle stage of the trade a row announces, shown after the
 * trader username. Rendered as `opened / added / reduced / closed` for perps
 * and `bought / bought more / sold some / sold all` for spot when supplied.
 */
export type FeedAction = TradeAction;

/** Perp position direction, used for the LONG / SHORT badge. */
export type FeedPerpDirection = 'long' | 'short';

/** What the muted suffix after the second value represents (spot MC vs per-unit price). */
export type FeedSubHeaderContextKind = 'marketCap' | 'price';

/**
 * Structured sub-header for feed position cards. Dollar amounts render in
 * TextDefault; connectors (" at ", " MC") render in TextAlternative (Figma).
 */
export interface FeedSubHeader {
  /** Formatted trade size, e.g. "$120K". Empty when there is no triggering trade. */
  sizeLabel: string;
  /** Second value after " at ", e.g. "$900K" or "$120.00". */
  contextValueLabel?: string;
  /** When `marketCap`, a muted " MC" suffix follows `contextValueLabel`. */
  contextKind?: FeedSubHeaderContextKind;
}

interface FeedItemBase {
  /** Stable id for list keying. */
  id: string;
  /** Clicker profile id (UUID), used to open the trader profile. */
  traderId: string;
  /** Trader display name. */
  username: string;
  /** Trader address, used for the avatar fallback + profile source. */
  traderAddress: string;
  /** Optional avatar image url. */
  avatarUri?: string;
  /** Optional lifecycle action supplied by the API. */
  action?: FeedAction;
  /**
   * Whether the position is closed. This is separate from `action` because a
   * missing lifecycle action must not change the position's value/P&L display.
   */
  isClosed?: boolean;
  /** Epoch milliseconds the trade happened. Drives relative/absolute time. */
  timestamp: number;
  /** Trade size + optional MC/price context for the position card sub-header. */
  subHeader: FeedSubHeader;
  /** Pre-formatted current value, e.g. "$123,000.5". Empty when the API omits it. */
  valueLabel: string;
  /** Pre-formatted P&L, e.g. "+12%". Empty when the API omits it. */
  pnlLabel: string;
  /** Whether the API supplied a value for the top-right figure. */
  hasValueData: boolean;
  /** Whether the API supplied a P&L percent for the bottom-right figure. */
  hasPnlData: boolean;
  /** Whether the P&L is positive (green) or negative (red). */
  isPnlPositive: boolean;
  /**
   * Token avatar data (image url + address/chain/symbol) consumed by the shared
   * `PositionTokenAvatar`, which resolves the Clicker URL → MetaMask CDN →
   * monogram fallback (and the Hyperliquid perp logo) exactly like the profile.
   */
  tokenAvatar: PositionTokenAvatarData;
}

/**
 * Spot trade item. Carries a real token address + CAIP chain so the Trade
 * button can open the QuickBuy sheet end-to-end.
 */
export interface FeedSpotItem extends FeedItemBase {
  type: 'spot';
  tokenSymbol: string;
  tokenName: string;
  tokenAddress: string;
  /** CAIP chain id for the QuickBuy target (e.g. `eip155:1`). */
  chain: CaipChainId;
  /** Hex chain id for the network badge image (e.g. `0x1`). */
  chainIdHex: `0x${string}`;
}

/**
 * Perp trade item. Carries a real market symbol so the Trade button can open
 * the Perps market detail page.
 */
export interface FeedPerpItem extends FeedItemBase {
  type: 'perps';
  /**
   * Clean market symbol shown to the user (e.g. `ETH`, `SPCX`). Never carries a
   * HIP-3 DEX prefix.
   */
  marketSymbol: string;
  /** Perp market display name (e.g. `Ethereum`). */
  marketName: string;
  /**
   * Tradable market symbol used to open the Perps market detail page. For HIP-3
   * markets this is the `xyz:`-namespaced symbol; not shown to the user.
   */
  tradeSymbol: string;
  direction: FeedPerpDirection;
  /** Leverage multiplier (e.g. `8` → "8x"). `null` hides the leverage badge. */
  leverage: number | null;
}

export type FeedItem = FeedSpotItem | FeedPerpItem;

/**
 * A mapped feed item paired with the raw API row it came from.
 *
 * `FeedItem` deliberately drops the fill history, so consumers that need to
 * derive figures it does not carry -- an average entry from `costBasis`, an
 * exit from the closing fill, a hold time from the first and last timestamps --
 * would otherwise have to re-fetch the position. Pairing them here keeps that
 * derivation on the page the feed already loaded.
 */
export interface TraderFeedRow {
  item: FeedItem;
  core: CoreFeedItem;
}
