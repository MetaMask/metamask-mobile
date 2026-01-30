import { KeyringController } from '@metamask/keyring-controller';
import {
  GameUpdate,
  GetPriceHistoryParams,
  GetPriceParams,
  GetPriceResponse,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  PriceUpdate,
  Result,
  Side,
} from '../types';
import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { PredictFeeCollection } from '../types/flags';

export type GameUpdateCallback = (update: GameUpdate) => void;
export type PriceUpdateCallback = (updates: PriceUpdate[]) => void;

export interface ConnectionStatus {
  sportsConnected: boolean;
  marketConnected: boolean;
}

export interface GetMarketsParams {
  providerId?: string;

  // Filters
  q?: string;
  status?: 'open' | 'closed' | 'resolved';
  category?: PredictCategory;

  // Sorting
  sortBy?: 'volume24h' | 'date';
  sortDirection?: 'asc' | 'desc';

  // Pagination
  offset?: number;
  limit?: number;

  // Live sports configuration
  liveSportsLeagues?: string[];
}

export interface Signer {
  address: string;
  signTypedMessage: KeyringController['signTypedMessage'];
  signPersonalMessage: KeyringController['signPersonalMessage'];
}

export interface PlaceOrderParams {
  providerId: string;
  preview: OrderPreview;
  analyticsProperties?: {
    marketId?: string;
    marketTitle?: string;
    marketCategory?: string;
    marketTags?: string[];
    entryPoint?: string;
    transactionType?: string;
    sharePrice?: number;
    liquidity?: number;
    volume?: number;
    marketType?: string;
    outcome?: string;
    marketSlug?: string;
    gameId?: string;
    gameStartTime?: string;
    gameLeague?: string;
    gameStatus?: string;
    gamePeriod?: string | null;
    gameClock?: string | null;
  };
}

export interface PreviewOrderParams {
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  side: Side;
  size: number;
  // For sell orders, we can store the position ID
  // so we can perform optimistic updates
  positionId?: string;
}

// Fees in US dollars
export interface PredictFees {
  metamaskFee: number;
  providerFee: number;
  totalFee: number;
  totalFeePercentage: number;
  collector: Hex;
}

export interface GeoBlockResponse {
  isEligible: boolean;
  country?: string;
}

/**
 * @example
 * side = BUY;
 * maxAmountSpent = 12.34; // $12.34
 * minAmountReceived = 54.32; // 54.32 shares
 * sharePrice = 0.1234; // $0.1234
 * slippage = 0.01; // 1%
 *
 * side = SELL;
 * maxAmountSpent = 42.23; // 42.23 shares
 * minAmountReceived = 48.56; // $48.56
 * sharePrice = 0.3456; // $0.3456
 * slippage = 0.005; // 0.5%
 */
export interface OrderPreview {
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  timestamp: number;
  side: Side;
  sharePrice: number;
  maxAmountSpent: number;
  minAmountReceived: number;
  slippage: number;
  tickSize: number;
  minOrderSize: number;
  negRisk: boolean;
  fees?: PredictFees;
  rateLimited?: boolean;
  // For sell orders, we can store the position ID
  // so we can perform optimistic updates
  positionId?: string;
}

export type OrderResult = Result<{
  id: string;
  spentAmount: string;
  receivedAmount: string;
  txHashes?: string[];
}>;

export interface ClaimOrderParams {
  positions: PredictPosition[];
  signer: Signer;
}

export interface ClaimOrderResponse {
  chainId: number;
  transactions: {
    params: {
      to: Hex;
      data?: Hex;
      value?: Hex;
    };
    type?: TransactionType;
  }[];
}

export interface GetPositionsParams {
  providerId?: string;
  address?: string;
  claimable?: boolean;
  marketId?: string;
  outcomeId?: string;
  limit?: number;
  offset?: number;
}

export interface PrepareDepositParams {
  providerId: string;
}

export interface GetAccountStateParams {
  providerId: string;
}

export interface PrepareDepositResponse {
  chainId: Hex;
  transactions: {
    params: {
      to: Hex;
      data: Hex;
    };
    type?: TransactionType;
  }[];
}

export interface GetPredictWalletParams {
  providerId: string;
}

export interface AccountState {
  address: Hex;
  isDeployed: boolean;
  hasAllowances: boolean;
}

export interface GetBalanceParams {
  address?: string;
  providerId: string;
}

export interface PrepareWithdrawParams {
  providerId: string;
}

export interface PrepareWithdrawResponse {
  chainId: Hex;
  transaction: {
    params: {
      to: Hex;
      data: Hex;
    };
    type?: TransactionType;
  };
  predictAddress: Hex;
}

export interface SignWithdrawParams {
  callData: Hex;
  signer: Signer;
}

export interface SignWithdrawResponse {
  callData: Hex;
  amount: number;
}

export interface PredictProvider {
  readonly providerId: string;
  readonly name: string;
  readonly chainId: number;

  // Market data
  getMarkets(params: GetMarketsParams): Promise<PredictMarket[]>;
  getMarketsByIds?(
    marketIds: string[],
    liveSportsLeagues?: string[],
  ): Promise<PredictMarket[]>;
  getMarketDetails(params: {
    marketId: string;
    liveSportsLeagues?: string[];
  }): Promise<PredictMarket>;
  getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]>;
  getPrices(
    params: Omit<GetPriceParams, 'providerId'>,
  ): Promise<GetPriceResponse>;

  // User information
  getPositions(
    params: Omit<GetPositionsParams, 'address'> & { address: string },
  ): Promise<PredictPosition[]>;
  getActivity(params: { address: string }): Promise<PredictActivity[]>;
  getUnrealizedPnL(params: {
    address: string;
  }): Promise<import('../types').UnrealizedPnL>;

  // Order management
  previewOrder(
    params: Omit<PreviewOrderParams, 'providerId'> & {
      signer: Signer;
      feeCollection?: PredictFeeCollection;
    },
  ): Promise<OrderPreview>;
  placeOrder(
    params: Omit<PlaceOrderParams, 'providerId'> & { signer: Signer },
  ): Promise<OrderResult>;

  // Claim management
  prepareClaim(params: ClaimOrderParams): Promise<ClaimOrderResponse>;
  confirmClaim?(params: { positions: PredictPosition[]; signer: Signer }): void;

  // Eligibility (Geo-Blocking)
  isEligible(): Promise<GeoBlockResponse>;

  // Predict wallet management
  prepareDeposit(
    params: PrepareDepositParams & { signer: Signer },
  ): Promise<PrepareDepositResponse>;
  getAccountState(
    params: GetAccountStateParams & { ownerAddress: string },
  ): Promise<AccountState>;
  prepareWithdraw(
    params: PrepareWithdrawParams & { signer: Signer },
  ): Promise<PrepareWithdrawResponse>;
  signWithdraw?(params: SignWithdrawParams): Promise<SignWithdrawResponse>;

  getBalance(params: GetBalanceParams): Promise<number>;

  subscribeToGameUpdates?(
    gameId: string,
    callback: GameUpdateCallback,
  ): () => void;

  subscribeToMarketPrices?(
    tokenIds: string[],
    callback: PriceUpdateCallback,
  ): () => void;

  getConnectionStatus?(): ConnectionStatus;
}
