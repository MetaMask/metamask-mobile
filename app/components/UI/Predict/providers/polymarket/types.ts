import { Side } from '../../types';

export interface PolymarketPosition {
  providerId: string;
  conditionId: string;
  icon: string;
  title: string;
  slug: string;
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
}

export enum UtilsSide {
  BUY,
  SELL,
}

export interface OrderData {
  /**
   * Maker of the order, i.e the source of funds for the order
   */
  maker: string;

  /**
   * Address of the order taker. The zero address is used to indicate a public order
   */
  taker: string;

  /**
   * Token Id of the CTF ERC1155 asset to be bought or sold.
   * If BUY, this is the tokenId of the asset to be bought, i.e the makerAssetId
   * If SELL, this is the tokenId of the asset to be sold, i.e the  takerAssetId
   */
  tokenId: string;

  /**
   * Maker amount, i.e the max amount of tokens to be sold
   */
  makerAmount: string;

  /**
   * Taker amount, i.e the minimum amount of tokens to be received
   */
  takerAmount: string;

  /**
   * The side of the order, BUY or SELL
   */
  side: UtilsSide;

  /**
   * Fee rate, in basis points, charged to the order maker, charged on proceeds
   */
  feeRateBps: string;

  /**
   * Nonce used for onchain cancellations
   */
  nonce: string;

  /**
   * Signer of the order. Optional, if it is not present the signer is the maker of the order.
   */
  signer?: string;

  /**
   * Timestamp after which the order is expired.
   * Optional, if it is not present the value is '0' (no expiration)
   */
  expiration?: string;

  /**
   * Signature type used by the Order. Default value 'EOA'
   */
  signatureType?: SignatureType;
}

/**
 * SignedOrder
 *
 * Based on the response from buildMarketOrderCreationArgs, which returns
 * OrderData combined with a generated salt. A SignedOrder augments that
 * structure with the EIP-712 signature string produced by the signer.
 */
export type SignedOrder = (OrderData & { salt: string }) & {
  signature: string;
};

export type ClobOrderObject = Omit<SignedOrder, 'side' | 'salt'> & {
  side: Side;
  salt: number;
};
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
export type ClobHeaders = {
  POLY_ADDRESS: string;
  POLY_SIGNATURE: string;
  POLY_TIMESTAMP: string;
  POLY_API_KEY: string;
  POLY_PASSPHRASE: string;
};

export interface PolymarketOffchainTradeParams {
  clobOrder: ClobOrderObject;
  headers: ClobHeaders;
}

export interface OrderArtifactsParams {
  marketId: string;
  outcomeTokenId: string;
  side: Side;
  amount: number;
}

// Polymarket API response types
export interface PolymarketMarket {
  id: string;
  question: string;
  conditionId: string;
  slug: string;
  resolutionSource?: string;
  endDate: string;
  liquidity: string;
  startDate: string;
  image: string;
  icon: string;
  description: string;
  outcomes: string;
  outcomePrices: string;
  volume: string;
  active: boolean;
  closed: boolean;
  marketMakerAddress: string;
  createdAt: string;
  updatedAt: string;
  new: boolean;
  featured: boolean;
  submitted_by: string;
  archived: boolean;
  resolvedBy: string;
  restricted: boolean;
  groupItemTitle: string;
  groupItemThreshold: string;
  questionID: string;
  enableOrderBook: boolean;
  orderPriceMinTickSize: number;
  orderMinSize: number;
  volumeNum: number;
  liquidityNum: number;
  endDateIso: string;
  startDateIso: string;
  hasReviewedDates: boolean;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  clobTokenIds: string;
  umaBond: string;
  umaReward: string;
  volume24hrClob: number;
  volume1wkClob: number;
  volume1moClob: number;
  volume1yrClob: number;
  volumeClob: number;
  liquidityClob: number;
  acceptingOrders: boolean;
  negRisk: boolean;
  negRiskMarketID: string;
  negRiskRequestID: string;
  ready: boolean;
  funded: boolean;
  acceptingOrdersTimestamp: string;
  cyom: boolean;
  competitive: number;
  pagerDutyNotificationEnabled: boolean;
  approved: boolean;
  clobRewards?: {
    id: string;
    conditionId: string;
    assetAddress: string;
    rewardsAmount: number;
    rewardsDailyRate: number;
    startDate: string;
    endDate: string;
  }[];
  rewardsMinSize: number;
  rewardsMaxSpread: number;
  spread: number;
  oneDayPriceChange?: number;
  oneHourPriceChange?: number;
  oneWeekPriceChange?: number;
  oneMonthPriceChange?: number;
  lastTradePrice?: number;
  bestBid?: number;
  bestAsk?: number;
  automaticallyActive: boolean;
  clearBookOnStart: boolean;
  seriesColor?: string;
  showGmpSeries: boolean;
  showGmpOutcome: boolean;
  manualActivation: boolean;
  negRiskOther: boolean;
  umaResolutionStatuses: string;
  pendingDeployment: boolean;
  deploying: boolean;
  deployingTimestamp: string;
  rfqEnabled: boolean;
  holdingRewardsEnabled: boolean;
  feesEnabled: boolean;
  umaResolutionStatus?: string;
  closedTime?: string;
  umaEndDate?: string;
  customLiveness?: number;
  automaticallyResolved?: boolean;
  neg_risk: boolean;
}

export interface PolymarketSeries {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  seriesType: string;
  recurrence: string;
  image: string;
  icon: string;
  layout?: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  publishedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
  commentsEnabled: boolean;
  competitive: string;
  volume24hr: number;
  volume: number;
  liquidity: number;
  startDate: string;
  commentCount: number;
}

export interface PolymarketTag {
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

export interface PolymarketEvent {
  id: string;
  ticker: string;
  slug: string;
  title: string;
  description: string;
  resolutionSource: string;
  startDate: string;
  creationDate: string;
  endDate: string;
  image: string;
  icon: string;
  active: boolean;
  closed: boolean;
  archived: boolean;
  new: boolean;
  featured: boolean;
  restricted: boolean;
  liquidity: number;
  volume: number;
  openInterest: number;
  createdAt: string;
  updatedAt: string;
  competitive: number;
  volume24hr: number;
  volume1wk: number;
  volume1mo: number;
  volume1yr: number;
  enableOrderBook: boolean;
  liquidityClob: number;
  negRisk: boolean;
  negRiskMarketID: string;
  commentCount: number;
  markets: PolymarketMarket[];
  series: PolymarketSeries[];
  tags: PolymarketTag[];
  cyom: boolean;
  showAllOutcomes: boolean;
  showMarketImages: boolean;
  enableNegRisk: boolean;
  automaticallyActive: boolean;
  startTime?: string;
  seriesSlug?: string;
  gmpChartMode?: string;
  negRiskAugmented?: boolean;
  featuredOrder?: number;
  pendingDeployment: boolean;
  deploying: boolean;
  deployingTimestamp: string;
  tweetCount?: number;
}

export interface PolymarketEventsResponse {
  data: PolymarketEvent[];
  pagination: {
    hasMore: boolean;
    totalResults: number;
  };
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

export type TickSize = '0.1' | '0.01' | '0.001' | '0.0001';

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
  amount: number;

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
  errorMsg: string;
  makingAmount: string;
  orderID: string;
  status: string;
  success: boolean;
  takingAmount: string;
  transactionsHashes: string[];
};

export interface TickSizeResponse {
  minimum_tick_size: TickSize;
}

export interface ClobOrderParams {
  owner: string;
  order: ClobOrderObject;
  orderType: OrderType;
}

export interface OrderSummary {
  price: string;
  size: string;
}
