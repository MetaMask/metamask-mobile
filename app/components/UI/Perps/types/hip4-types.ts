/**
 * HIP-4 Event Futures / Prediction Markets Type Definitions
 *
 * These types represent Hyperliquid's HIP-4 binary prediction markets,
 * which are traded as spot tokens on Hyperliquid's order book.
 *
 * Data comes from the `spotMeta` API endpoint:
 * - `outcomes[]`: Available outcome markets with YES/NO side specs
 * - `questions[]`: Prediction market questions linked to outcomes
 *
 * @see https://www.bedlamresear.ch/posts/hip-4-event-futures/
 */

/**
 * A side specification within an outcome market.
 * Each outcome has multiple sides (typically YES and NO).
 * Each side is a spot token that can be traded.
 *
 * From spotMeta.outcomes[].sideSpecs[]
 */
export interface HIP4SideSpec {
  /** Side name (e.g., "YES", "NO") */
  name: string;
  /** Spot token index corresponding to this side */
  token: number;
}

/**
 * An outcome market from the Hyperliquid spotMeta API.
 * Each outcome represents a possible binary result.
 *
 * From spotMeta.outcomes[]
 */
export interface HIP4Outcome {
  /** Unique identifier of the outcome market */
  outcome: number;
  /** Short name of the outcome market */
  name: string;
  /** Description of the outcome market */
  description: string;
  /** Token specifications for each side of the outcome market */
  sideSpecs: HIP4SideSpec[];
}

/**
 * A prediction market question from the Hyperliquid spotMeta API.
 * Questions link to one or more outcome markets.
 *
 * From spotMeta.questions[]
 */
export interface HIP4Question {
  /** Unique identifier of the question */
  question: number;
  /** Short name of the question (displayed as market title) */
  name: string;
  /** Description of the question (displayed as market description) */
  description: string;
  /** Default outcome index if the question is not resolved */
  fallbackOutcome: number;
  /** Outcome indices associated with this question */
  namedOutcomes: number[];
}

/**
 * Market status for HIP-4 prediction markets.
 * HIP-4 markets go through: opening auction -> active trading -> resolved
 */
export enum HIP4MarketStatus {
  /** Market is in opening auction phase (orders collected, no execution) */
  AUCTION = 'auction',
  /** Market is actively trading on the order book */
  ACTIVE = 'active',
  /** Market has been resolved (r = 0 or 1) and settled */
  RESOLVED = 'resolved',
  /** Market is upcoming but not yet in auction */
  UPCOMING = 'upcoming',
}

/**
 * Resolution result for an HIP-4 market.
 * The resolution value is binary: 0 (NO) or 1 (YES).
 */
export interface HIP4Resolution {
  /** Resolution value: 0 = NO won, 1 = YES won */
  value: 0 | 1;
  /** Timestamp when the market was resolved */
  resolvedAt: number;
}

/**
 * Enriched HIP-4 market combining question + outcome data + live prices.
 * This is the primary data type used by the UI layer.
 */
export interface HIP4Market {
  /** Unique market identifier (question index) */
  id: string;
  /** Question ID from spotMeta */
  questionId: number;
  /** Market title (question name) */
  title: string;
  /** Market description (question description) */
  description: string;
  /** Market status */
  status: HIP4MarketStatus;
  /** Associated outcomes */
  outcomes: HIP4MarketOutcome[];
  /** Fallback outcome index if not resolved */
  fallbackOutcome: number;
  /** Resolution info (null if not resolved) */
  resolution: HIP4Resolution | null;
  /** 24h trading volume in USDC */
  volume24h: number;
  /** Resolution/end date (ISO string, null if not set) */
  endDate: string | null;
  /** Categories/tags for filtering */
  tags: string[];
}

/**
 * Outcome within an HIP-4 market with live pricing data.
 */
export interface HIP4MarketOutcome {
  /** Outcome index from spotMeta */
  outcomeId: number;
  /** Outcome name */
  name: string;
  /** Outcome description */
  description: string;
  /** Token sides (YES/NO) with current prices */
  sides: HIP4MarketSide[];
}

/**
 * A tradeable side (YES/NO) of an outcome with live price data.
 */
export interface HIP4MarketSide {
  /** Side name (e.g., "YES", "NO") */
  name: string;
  /** Spot token index */
  tokenIndex: number;
  /**
   * Current mid-price in [0, 1] range.
   * For YES tokens: price = probability of event occurring.
   * For NO tokens: price = 1 - probability of event occurring.
   */
  price: number;
  /** Best bid price */
  bestBid: number;
  /** Best ask price */
  bestAsk: number;
}

/**
 * User position in an HIP-4 prediction market.
 * Positions are spot token holdings (YES or NO tokens).
 */
export interface HIP4Position {
  /** Market ID (question index) */
  marketId: string;
  /** Outcome ID */
  outcomeId: number;
  /** Side (YES or NO) */
  side: string;
  /** Spot token index */
  tokenIndex: number;
  /** Number of tokens held */
  size: number;
  /** Average entry price */
  avgEntryPrice: number;
  /** Current token price */
  currentPrice: number;
  /** Unrealized PnL in USDC */
  unrealizedPnl: number;
  /** Percentage PnL */
  percentPnl: number;
}

/**
 * A spot pair entry from the spotMeta universe array.
 * Used to map token indices to their allMids price keys.
 */
export interface SpotUniverseEntry {
  /** Pair name used as the key in allMids (e.g., "@100000100") */
  name: string;
  /** Token indices in this pair: [outcomeToken, quoteToken] */
  tokens: number[];
  /** Pair index in the universe */
  index: number;
  /** Whether this is a canonical pair */
  isCanonical: boolean;
}

/**
 * Raw spotMeta response structure for outcome markets.
 * This mirrors the data returned by the @nktkas/hyperliquid SDK (v0.31.0+).
 */
export interface SpotMetaOutcomeData {
  outcomes: HIP4Outcome[];
  questions: HIP4Question[];
  /**
   * Universe entries for outcome tokens.
   * Maps token indices to their spot pair names used in allMids.
   * Only includes pairs relevant to HIP-4 outcome tokens.
   */
  universe?: SpotUniverseEntry[];
}
