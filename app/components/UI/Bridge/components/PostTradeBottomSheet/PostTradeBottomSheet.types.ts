import type { TransactionStatus } from '@metamask/transaction-controller';
import type { BridgeToken } from '../../types';

export enum PostTradeStatus {
  InProgress = 'in_progress',
  Success = 'success',
  Failed = 'failed',
}

export interface PostTradeBottomSheetParams {
  status: PostTradeStatus;
  transactionMetaId?: string;
  transactionHash?: string;
  initialTransactionStatus?: TransactionStatus;
  sourceAmount?: string;
  destAmount?: string;
  sourceToken?: BridgeToken;
  destToken?: BridgeToken;
}

