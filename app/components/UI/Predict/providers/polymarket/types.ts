import { PredictGamePeriod, Side } from '../../types';

export interface PolymarketPosition {
  conditionId: string;
  eventId: string;
  icon: string;
  title: string;
  slug: string;
  eventSlug?: string;
  size: number;
  outcome: string;
  outcomeIndex: number;
  cashPnl: number;
  curPrice: number;
  currentValue: number;
  percentPnl: number;
  initialValue: number;
  avgPrice: number;
  redeemable: boolean;
  negativeRisk: boolean;
  endDate: string;
  asset: string;
  realizedPnl: number;
}

export enum UtilsSide {
  BUY,
  SELL,
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClobHeaders = {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_API_KEY: string;
  POLY_PASSPHRASE: string;
};

export interface ClobFeeDetails {
  /** Fee rate returned by the CLOB API, e.g. 0.02 means 2%. */
  r?: number | null;
  /** Exponent used by the CLOB fee curve. */
  e?: number | null;
  /** Whether taker-only fees apply for this market. */
  to?: boolean | null;
}

export interface ClobMarketInfo {
  /** Fee details used to calculate conservative market fees. */
  fd?: ClobFeeDetails;
  /** Minimum tick size for orders in this market. */
  mts?: number;
  /** Minimum order size for this market. */
  mos?: number;
}

/** Polymarket Data API v2 envelope: every response wraps its payload in `data`; paginated routes add an opaque cursor. */
export interface PolymarketDataApiV2Response<Row> {
  data: Row[] | null;
  pagination?: {
    next_cursor?: string | null;
  } | null;
}

/** Raw Polymarket Data API v2 position row (`GET /v2/positions`). */
export interface PolymarketPositionV2 {
  condition_id: string;
  event_id: string;
  icon: string;
  title: string;
  slug: string;
  event_slug?: string;
  /** Current holding size for the outcome (v1 `size`). */
  current_size: number;
  outcome: string;
  outcome_index: number;
  /** Cumulative unrealized P&L for the row; open positions only. */
  unrealized_pnl?: number | null;
  /** Current outcome price (v1 `curPrice`). */
  current_price: number;
  current_value: number;
  /** Cost basis in USDC (v1 `initialValue`). */
  entry_cost_usdc: number;
  avg_price: number;
  redeemable: boolean;
  negative_risk: boolean;
  realized_pnl: number;
  end_date: string;
  /** Outcome token id (v1 `asset`). Not an indicator of market protocol. */
  token_id: string;
}

/** Activity side as returned by the Data API v2 (empty string when absent). */
type PolymarketActivityV2Side = 'BUY' | 'SELL' | '';

/** Raw Polymarket Data API v2 activity row (`GET /v2/activity`). */
export interface PolymarketActivityV2 {
  type: string;
  side: PolymarketActivityV2Side;
  size?: number | string | null;
  price: number;
  usdc_size: number;
  timestamp: number;
  transaction_hash: string;
  condition_id: string;
  outcome_index: number;
  title: string;
  outcome?: string;
  icon: string;
  slug?: string;
  event_slug?: string;
  token_id?: string;
}

/** Raw Polymarket Data API v2 user-PnL series (`GET /v2/user-pnl`). */
export interface PolymarketUserPnlV2Response {
  data: {
    proxy_wallet: string;
    interval: string;
    fidelity: string;
    points: {
      t?: number;
      unrealized_pnl?: number | null;
      [key: string]: unknown;
    }[];
  } | null;
}

// Polymarket API response types
export interface PolymarketApiMarket {
  conditionId: string;
  question: string;
  description: string;
  icon: string;
  image: string;
  groupItemTitle: string;
  groupItemThreshold?: number;
  sportsMarketType?: string;
  status: 'open' | 'closed' | 'resolved';
  volumeNum: number;
  liquidity: number;
  negRisk: boolean;
  clobTokenIds: string;
  outcomes: string;
  outcomePrices: string;
  closed: boolean;
  active: boolean;
  acceptingOrders?: boolean;
  resolvedBy: string;
  orderPriceMinTickSize: number | null;
  events?: PolymarketApiEvent[];
  umaResolutionStatus: string;
  /** Gamma protocol version. `v2` is Protocol V2. A missing value is CTF. */
  version?: string;
  line?: number;
  cryptoMarketConfig?: {
    twapEnabled?: boolean;
    twapLookbackSeconds?: number | null;
  } | null;
}

export interface PolymarketApiSeries {
  id: string;
  slug: string;
  title: string;
  recurrence: string;
}

export interface PolymarketApiTag {
  id: string;
  label: string;
  slug: string;
  forceShow?: boolean;
  updatedAt?: string;
  createdAt?: string;
  publishedAt?: string;
  updatedBy?: number;
  forceHide?: boolean;
  isCarousel?: boolean;
}

export interface PolymarketApiEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  endDate?: string;
  closed: boolean;
  active?: boolean;
  series: PolymarketApiSeries[];
  markets: PolymarketApiMarket[];
  tags: PolymarketApiTag[];
  teams?: PolymarketApiTeam[];
  liquidity: number;
  volume: number;
  sortBy?: 'price' | 'ascending' | 'descending';
  gameId?: string;
  startTime?: string;
  finishedTimestamp?: string;
  score?: string;
  elapsed?: string;
  period?: PredictGamePeriod;
  live?: boolean;
  ended?: boolean;
  parentEventId?: string | number | null;
  eventMetadata?: {
    priceToBeat?: number | string | null;
  };
}

export interface PolymarketApiActivity {
  type: 'TRADE' | 'REDEEM';
  side: 'BUY' | 'SELL' | '';
  size?: number | string | null;
  price: number;
  usdcSize: number;
  timestamp: number;
  transactionHash: string;
  conditionId: string;
  outcomeIndex: number;
  title: string;
  outcome?: 'Yes' | 'No' | '';
  icon: string;
  slug?: string;
  eventSlug?: string;
  netPnlUsd?: number;
  totalNetPnlUsd?: number;
}

export interface PolymarketApiEventsKeysetResponse {
  events: PolymarketApiEvent[];
  next_cursor?: string | null;
}

export interface ContractConfig {
  exchange: string;
  negRiskAdapter: string;
  negRiskExchange: string;
  collateral: string;
  conditionalTokens: string;
}

export interface RoundConfig {
  readonly price: number;
  readonly size: number;
  readonly amount: number;
}

export type TickSize = string;

export const COLLATERAL_TOKEN_DECIMALS = 6;
export const CONDITIONAL_TOKEN_DECIMALS = 6;

export enum OrderType {
  GTC = 'GTC',
  FOK = 'FOK',
  GTD = 'GTD',
  FAK = 'FAK',
}

export enum SignatureType {
  /**
   * ECDSA EIP712 signatures signed by EOAs
   */
  EOA,

  /**
   * EIP712 signatures signed by EOAs that own Polymarket Proxy wallets
   */
  POLY_PROXY,

  /**
   * EIP712 signatures signed by EOAs that own Polymarket Gnosis safes
   */
  POLY_GNOSIS_SAFE,

  /**
   * ERC-1271 signatures validated by Polymarket deposit wallets
   */
  POLY_1271,
}

// Simplified market order for users
export interface UserMarketOrder {
  /**
   * TokenID of the Conditional token asset being traded
   */
  tokenID: string;

  /**
   * Price used to create the order
   * If it is not present the market price will be used.
   */
  price?: number;

  /**
   * BUY orders: $$$ Amount to buy
   * SELL orders: Shares to sell
   */
  size: number;

  /**
   * Side of the order
   */
  side: Side;

  /**
   * Fee rate, in basis points, charged to the order maker, charged on proceeds
   */
  feeRateBps?: number;

  /**
   * Nonce used for onchain cancellations
   */
  nonce?: number;

  /**
   * Address of the order taker. The zero address is used to indicate a public order
   */
  taker?: string;

  /**
   * Specifies the type of order execution:
   * - FOK (Fill or Kill): The order must be filled entirely or not at all.
   * - FAK (Fill and Kill): The order can be partially filled, and any unfilled portion is canceled.
   */
  orderType?: OrderType.FOK | OrderType.FAK;
}

export interface ApiKeyCreds {
  apiKey: string;
  secret: string;
  passphrase: string;
}

export interface L2HeaderArgs {
  method: string;
  requestPath: string;
  body?: string;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type OrderResponse = {
  errorMsg?: string;
  makingAmount?: string;
  orderID?: string;
  status?: string;
  success: boolean;
  takingAmount?: string;
  transactionsHashes?: string[];
};

export interface TickSizeResponse {
  minimum_tick_size: TickSize;
}

export interface OrderSummary {
  price: string;
  size: string;
}

export interface OrderBook {
  market: string;
  asset_id: string;
  hash: string;
  timestamp: string;
  asks: OrderSummary[]; // descending by price
  bids: OrderSummary[]; // ascending by price
  min_order_size: string;
  tick_size: string;
  neg_risk: boolean;
}

export interface PolymarketApiTeam {
  id: string;
  name: string;
  logo: string;
  abbreviation: string;
  color: string;
  alias: string;
  league?: string;
}

export interface PolymarketApiGameEvent {
  gameId?: string;
  startTime?: string;
  finishedTimestamp?: string;
  score?: string;
  elapsed?: string;
  period?: PredictGamePeriod;
  live?: boolean;
  ended?: boolean;
  closed?: boolean;
}
