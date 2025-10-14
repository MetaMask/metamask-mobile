import { KeyringController } from '@metamask/keyring-controller';
import {
  GetPriceHistoryParams,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  Result,
  Side,
} from '../types';
import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';

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
  positions: PredictPosition[];
  signer: Signer;
}

export interface ClaimOrderResponse {
  chainId: number;
  transactionParams: {
    from: Hex;
    to: Hex;
    data: Hex;
  };
}

export interface GetPositionsParams {
  address?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
  claimable?: boolean;
  marketId?: string;
}

export interface GetClaimablePositionsParams {
  address?: string;
  providerId?: string;
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
  address: string;
  isDeployed: boolean;
  hasAllowances: boolean;
}

export interface GetBalanceParams {
  address?: string;
  providerId: string;
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
  getUnrealizedPnL(params: {
    address: string;
  }): Promise<import('../types').UnrealizedPnL>;

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
  prepareClaim(params: ClaimOrderParams): Promise<ClaimOrderResponse>;

  // Eligibility (Geo-Blocking)
  isEligible(): Promise<boolean>;

  // Predict wallet management
  prepareDeposit(
    params: PrepareDepositParams & { signer: Signer },
  ): Promise<PrepareDepositResponse>;
  getAccountState(
    params: GetAccountStateParams & { ownerAddress: string },
  ): Promise<AccountState>;

  getBalance(params: GetBalanceParams): Promise<number>;
}
