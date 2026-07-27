import type { CaipChainId } from '@metamask/utils';
import type { PositionTokenAvatarData } from '../components/PositionTokenAvatar';

/**
 * Feed audience filter. `all` shows every trader's activity; `following` shows
 * only the activity of traders the user follows.
 */
export type FeedAudience = 'all' | 'following';

/**
 * Feed type filter. Alias of the shared {@link SocialTypeFilter} used across the
 * leaderboard and feed: everything, spot tokens, or perps. Applied client-side
 * over the loaded feed pages.
 */
export type { SocialTypeFilter as FeedTypeFilter } from '../components/TypeFilter/types';

/** Trade action verb, shown after the trader username. */
export type FeedAction = 'bought' | 'sold' | 'opened' | 'closed';

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
  /** Trade action verb. */
  action: FeedAction;
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

/** A day-grouped bucket of feed items, e.g. "July 1, 2026". */
export interface FeedSection {
  /** Formatted date label used as the section header. */
  dateLabel: string;
  data: FeedItem[];
}
