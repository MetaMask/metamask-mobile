import { KeyringController } from '@metamask/keyring-controller';
import {
  AccountState,
  ConnectionStatus,
  GameUpdateCallback,
  GeoBlockResponse,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  GetPriceHistoryParams,
  GetPriceParams,
  GetPriceResponse,
  OrderPreview,
  OrderResult,
  PlaceOrderParams,
  PredictActivity,
  PredictFees,
  PredictMarket,
  PredictPosition,
  PredictPriceHistoryPoint,
  PreviewOrderParams,
  PriceUpdateCallback,
  UnrealizedPnL,
} from '../types';
import { Hex } from '@metamask/utils';
import { TransactionType } from '@metamask/transaction-controller';
import { PredictFeeCollection } from '../types/flags';

// Re-export shared types so existing provider-layer imports continue to work
export type {
  AccountState,
  ConnectionStatus,
  GameUpdateCallback,
  GeoBlockResponse,
  GetBalanceParams,
  GetMarketsParams,
  GetPositionsParams,
  OrderPreview,
  OrderResult,
  PlaceOrderParams,
  PredictFees,
  PreviewOrderParams,
  PriceUpdateCallback,
};

export interface Signer {
  address: string;
  signTypedMessage: KeyringController['signTypedMessage'];
  signPersonalMessage: KeyringController['signPersonalMessage'];
}

export interface PrepareDepositParams {
  signer: Signer;
}

export interface GetAccountStateParams {
  ownerAddress: string;
}

export interface PrepareWithdrawParams {
  signer: Signer;
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

export interface PrepareWithdrawResponse {
  chainId: Hex;
  transaction: {
    params: {
      to: Hex;
      data: Hex;
      gas?: Hex;
    };
    type?: TransactionType;
  };
  predictAddress: Hex;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface GetPredictWalletParams {}

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
  getPrices(params: GetPriceParams): Promise<GetPriceResponse>;

  getPositions(
    params: GetPositionsParams & { address: string },
  ): Promise<PredictPosition[]>;
  getActivity(params: { address: string }): Promise<PredictActivity[]>;
  getUnrealizedPnL(params: { address: string }): Promise<UnrealizedPnL>;

  previewOrder(
    params: PreviewOrderParams & {
      signer: Signer;
      feeCollection?: PredictFeeCollection;
    },
  ): Promise<OrderPreview>;
  placeOrder(
    params: PlaceOrderParams & { signer: Signer },
  ): Promise<OrderResult>;

  prepareClaim(params: ClaimOrderParams): Promise<ClaimOrderResponse>;
  confirmClaim?(params: { positions: PredictPosition[]; signer: Signer }): void;

  isEligible(): Promise<GeoBlockResponse>;

  prepareDeposit(params: PrepareDepositParams): Promise<PrepareDepositResponse>;
  getAccountState(params: GetAccountStateParams): Promise<AccountState>;
  prepareWithdraw(
    params: PrepareWithdrawParams,
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
