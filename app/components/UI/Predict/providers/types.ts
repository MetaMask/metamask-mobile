import { KeyringController } from '@metamask/keyring-controller';
import {
  GetPriceHistoryParams,
  OffchainTradeParams,
  PredictActivity,
  PredictCategory,
  PredictClaim,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  Result,
  Side,
} from '../types';

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
}

export interface Signer {
  address: string;
  signTypedMessage: KeyringController['signTypedMessage'];
  signPersonalMessage: KeyringController['signPersonalMessage'];
}

export interface BuyOrderParams {
  signer: Signer;
  market: PredictMarket;
  outcomeId: string;
  outcomeTokenId: string;
  size: number;
  isOnboarded: boolean;
}

export interface SellOrderParams {
  signer: Signer;
  position: PredictPosition;
  isOnboarded: boolean;
}

export interface PlaceOrderParams {
  outcomeId: string;
  outcomeTokenId: string;
  side: Side;
  size: number;
  providerId: string;
}

export interface CalculateBetAmountsParams {
  providerId: string;
  outcomeTokenId: string;
  userBetAmount: number;
}

export interface CalculateBetAmountsResponse {
  toWin: number;
  sharePrice: number;
}

export interface CalculateCashOutAmountsParams {
  address: string;
  providerId: string;
  marketId: string;
  outcomeTokenId: string;
}

export interface CalculateCashOutAmountsResponse {
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
}

export interface ClaimOrderParams {
  position: PredictPosition;
}

export interface GetPositionsParams {
  address?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
  claimable?: boolean;
}

export interface PredictProvider {
  // Market data
  getMarkets(params: GetMarketsParams): Promise<PredictMarket[]>;
  getMarketDetails(params: { marketId: string }): Promise<PredictMarket>;
  getPriceHistory(
    params: GetPriceHistoryParams,
  ): Promise<PredictPriceHistoryPoint[]>;

  // User information
  getPositions(
    params: Omit<GetPositionsParams, 'address'> & { address: string },
  ): Promise<PredictPosition[]>;
  getActivity(params: { address: string }): Promise<PredictActivity[]>;

  // Order management
  placeOrder<T = void>(
    params: PlaceOrderParams & { signer: Signer },
  ): Promise<Result<T>>;

  calculateBetAmounts(
    params: CalculateBetAmountsParams,
  ): Promise<CalculateBetAmountsResponse>;

  calculateCashOutAmounts(
    params: CalculateCashOutAmountsParams,
  ): Promise<CalculateCashOutAmountsResponse>;

  // Claim management
  prepareClaim(params: ClaimOrderParams): PredictClaim;

  // Eligibility (Geo-Blocking)
  isEligible(): Promise<boolean>;
}
