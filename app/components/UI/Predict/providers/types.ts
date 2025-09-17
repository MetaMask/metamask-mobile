import { KeyringController } from '@metamask/keyring-controller';
import {
  OffchainTradeParams,
  PredictActivity,
  PredictCategory,
  PredictMarket,
  PredictOrder,
  PredictPosition,
  Result,
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
}

export interface BuyOrderParams {
  signer: Signer;
  market: PredictMarket;
  outcomeId: string;
  outcomeTokenId: string;
  size: number;
}

export interface SellOrderParams {
  signer: Signer;
  position: PredictPosition;
}

export interface PredictProvider {
  // Market data
  getMarkets(params: GetMarketsParams): Promise<PredictMarket[]>;
  getMarketDetails(params: { marketId: string }): Promise<PredictMarket>;

  // User information
  getPositions(params: { address: string }): Promise<PredictPosition[]>;
  getActivity(params: { address: string }): Promise<PredictActivity[]>;

  // Order management
  prepareBuyOrder(params: BuyOrderParams): Promise<PredictOrder>;
  prepareSellOrder(params: SellOrderParams): Promise<PredictOrder>;

  submitOffchainTrade?(params: OffchainTradeParams): Promise<Result>;
  claimWinnings(/* TBD */): Promise<void>;

  // Eligibility (Geo-Blocking)
  isEligible(): Promise<boolean>;
}
