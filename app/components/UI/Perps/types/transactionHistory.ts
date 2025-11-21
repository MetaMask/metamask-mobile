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

export enum FillType {
  Standard = 'standard',
  Liquidation = 'liquidation',
  TakeProfit = 'take_profit',
  StopLoss = 'stop_loss',
  AutoDeleveraging = 'auto_deleveraging',
}

/**
 * Base transaction fields shared by all transaction types
 */
interface BasePerpsTransaction {
  id: string;
  title: string;
  subtitle: string; // Asset amount (e.g., "2.01 ETH") or status
  timestamp: number;
  asset: string;
}

/**
 * Trade transaction (position open/close)
 * Uses category to distinguish between opening and closing positions
 */
interface TradeTransaction extends BasePerpsTransaction {
  type: 'trade';
  category: 'position_open' | 'position_close';
  fill: {
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
    liquidation?: {
      liquidatedUser: string; // Address of the liquidated user
      markPx: string; // Mark price at liquidation
      method: string; // Liquidation method (e.g., 'market')
    };
    fillType: FillType;
  };
}

/**
 * Order transaction (limit orders)
 * No category needed - all orders use the same category
 */
interface OrderTransaction extends BasePerpsTransaction {
  type: 'order';
  category: 'limit_order';
  order: {
    text: PerpsOrderTransactionStatus;
    statusType: PerpsOrderTransactionStatusType;
    type: 'limit' | 'market';
    size: string;
    limitPrice: string;
    filled: string;
  };
}

/**
 * Funding fee transaction
 * No category needed - all funding uses the same category
 */
interface FundingTransaction extends BasePerpsTransaction {
  type: 'funding';
  category: 'funding_fee';
  fundingAmount: {
    isPositive: boolean;
    fee: string;
    feeNumber: number;
    rate: string;
  };
}

/**
 * Deposit transaction
 * No category field - type is sufficient
 * No depositWithdrawal.type field - redundant with main type
 */
interface DepositTransaction extends BasePerpsTransaction {
  type: 'deposit';
  depositWithdrawal: {
    amount: string;
    amountNumber: number;
    isPositive: boolean;
    asset: string;
    txHash: string;
    status: 'completed' | 'failed' | 'pending' | 'bridging';
  };
}

/**
 * Withdrawal transaction
 * No category field - type is sufficient
 * No depositWithdrawal.type field - redundant with main type
 */
interface WithdrawalTransaction extends BasePerpsTransaction {
  type: 'withdrawal';
  depositWithdrawal: {
    amount: string;
    amountNumber: number;
    isPositive: boolean;
    asset: string;
    txHash: string;
    status: 'completed' | 'failed' | 'pending' | 'bridging';
  };
}

/**
 * Discriminated union of all transaction types
 * TypeScript can now narrow the type based on the 'type' field
 */
export type PerpsTransaction =
  | TradeTransaction
  | OrderTransaction
  | FundingTransaction
  | DepositTransaction
  | WithdrawalTransaction;

// Helper interface for date-grouped data
export interface TransactionSection {
  title: string; // "Today", "Jul 26", etc.
  data: PerpsTransaction[];
}

// Union type for FlashList items (headers + transactions)
export type ListItem =
  | { type: 'header'; title: string; id: string }
  | { type: 'transaction'; transaction: PerpsTransaction; id: string };

export type FilterTab = 'Trades' | 'Orders' | 'Funding' | 'Deposits';

export interface PerpsTransactionsViewProps {}

export type PerpsPositionTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsPositionTransaction'
>;

export type PerpsOrderTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsOrderTransaction'
>;

export type PerpsFundingTransactionRouteProp = RouteProp<
  PerpsNavigationParamList,
  'PerpsFundingTransaction'
>;
