import { RouteProp } from '@react-navigation/native';
import { PerpsNavigationParamList } from '../controllers/types';

export enum PerpsOrderTransactionStatus {
  Filled = 'Filled',
  Canceled = 'Canceled',
  Rejected = 'Rejected',
  Triggered = 'Triggered',
  Queued = 'Queued',
  Open = '',
}

export enum PerpsOrderTransactionStatusType {
  Filled = 'filled',
  Canceled = 'canceled',
  Pending = 'pending',
}

export interface PerpsTransaction {
  id: string;
  type: 'trade' | 'order' | 'funding';
  category: 'position_open' | 'position_close' | 'limit_order' | 'funding_fee';
  title: string;
  subtitle: string; // Asset amount (e.g., "2.01 ETH")
  timestamp: number;
  asset: string;
  // For trades: fill info
  fill?: {
    shortTitle: string; // e.g., "Opened long" or "Closed long"
    amount: string; // e.g., "+$43.99" or "-$400"
    amountNumber: number; // e.g., 43.99 or 400
    isPositive: boolean;
    size: string;
    entryPrice: string;
    points: string;
    pnl: string;
    fee: string;
    action: string;
    feeToken: string;
  };
  // For orders: order info
  order?: {
    text: PerpsOrderTransactionStatus;
    statusType: PerpsOrderTransactionStatusType;
    type: 'limit' | 'market';
    size: string;
    limitPrice: string;
    filled: string;
  };
  // For funding: funding info
  fundingAmount?: {
    isPositive: boolean;
    fee: string;
    feeNumber: number;
    rate: string;
  };
}

// Helper interface for date-grouped data
export interface TransactionSection {
  title: string; // "Today", "Jul 26", etc.
  data: PerpsTransaction[];
}

// Union type for FlashList items (headers + transactions)
export type ListItem =
  | { type: 'header'; title: string; id: string }
  | { type: 'transaction'; transaction: PerpsTransaction; id: string };

export type FilterTab = 'Trades' | 'Orders' | 'Funding';

export interface PerpsTransactionsViewProps {}

export type PerpsPositionTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsPositionTransaction'
>;
