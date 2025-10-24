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

export interface PlaceOrderParams {
  providerId: string;
  preview: OrderPreview;
  analyticsProperties?: {
    marketId?: string;
    marketTitle?: string;
    marketCategory?: string;
    entryPoint?: string;
    transactionType?: string;
    sharePrice?: number;
    liquidity?: number;
    volume?: number;
  };
}

export interface PreviewOrderParams {
  providerId: string;
  marketId: string;
  outcomeId: string;
  outcomeTokenId: string;
  side: Side;
  size: number;
  signer?: Signer;
}

// Fees in US dollars
export interface PredictFees {
  metamaskFee: number;
  providerFee: number;
  totalFee: number;
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
  address?: string;
  providerId?: string;
  limit?: number;
  offset?: number;
  claimable?: boolean;
  marketId?: string;
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

export interface PrepareWithdrawConfirmationParams {
  callData: Hex;
  signer: Signer;
}

export interface PrepareWithdrawConfirmationResponse {
  callData: Hex;
  amount: number;
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
  previewOrder(params: PreviewOrderParams): Promise<OrderPreview>;
  placeOrder(
    params: PlaceOrderParams & { signer: Signer },
  ): Promise<OrderResult>;

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
  prepareWithdraw(
    params: PrepareWithdrawParams & { signer: Signer },
  ): Promise<PrepareWithdrawResponse>;
  prepareWithdrawConfirmation?(
    params: PrepareWithdrawConfirmationParams,
  ): Promise<PrepareWithdrawConfirmationResponse>;

  getBalance(params: GetBalanceParams): Promise<number>;
}
