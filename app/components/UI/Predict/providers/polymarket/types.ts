import { Side } from '../../types';

export interface PolymarketPosition {
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
  outcomeTokenId: string;
  outcomeId: string;
  side: Side;
  amount: number;
}

// Polymarket API response types
export interface PolymarketApiMarket {
  conditionId: string;
  question: string;
  description: string;
  icon: string;
  image: string;
  groupItemTitle: string;
  status: 'open' | 'closed' | 'resolved';
  volumeNum: number;
  negRisk: boolean;
  clobTokenIds: string;
  outcomes: string;
  outcomePrices: string;
  closed: boolean;
  orderPriceMinTickSize: number;
}

export interface PolymarketApiSeries {
  recurrence: string;
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

export interface PolymarketApiEvent {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  closed: boolean;
  series: PolymarketApiSeries[];
  markets: PolymarketApiMarket[];
}

export interface PolymarketApiEventsResponse {
  data: PolymarketApiEvent[];
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
