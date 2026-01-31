import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';

/**
 * Predict transaction types that the provider tracks
 */
export type PredictTransactionType = 'deposit' | 'claim' | 'withdraw';

/**
 * Event emitted when a Predict-related transaction status changes
 */
export interface PredictTransactionEvent {
  /** The full transaction metadata from TransactionController */
  transactionMeta: TransactionMeta;
  /** The type of Predict transaction */
  type: PredictTransactionType;
  /** The current status of the transaction */
  status: TransactionStatus;
  /** Timestamp when this event was processed */
  timestamp: number;
}

/**
 * Callback function type for transaction event subscribers
 */
export type PredictTransactionEventCallback = (
  event: PredictTransactionEvent,
) => void;

/**
 * Unsubscribe function returned when subscribing to events
 */
export type Unsubscribe = () => void;

/**
 * Context value provided by PredictProvider
 */
export interface PredictContextValue {
  /**
   * Subscribe to deposit transaction events.
   * Returns an unsubscribe function.
   */
  subscribeToDepositEvents: (
    callback: PredictTransactionEventCallback,
  ) => Unsubscribe;

  /**
   * Subscribe to claim transaction events.
   * Returns an unsubscribe function.
   */
  subscribeToClaimEvents: (
    callback: PredictTransactionEventCallback,
  ) => Unsubscribe;

  /**
   * Subscribe to withdraw transaction events.
   * Returns an unsubscribe function.
   */
  subscribeToWithdrawEvents: (
    callback: PredictTransactionEventCallback,
  ) => Unsubscribe;
}

/**
 * Props for PredictProvider component
 */
export interface PredictProviderProps {
  children: React.ReactNode;
}

/**
 * Mapping from TransactionType to PredictTransactionType
 */
export const PREDICT_TRANSACTION_TYPE_MAP: Record<
  string,
  PredictTransactionType
> = {
  [TransactionType.predictDeposit]: 'deposit',
  [TransactionType.predictClaim]: 'claim',
  [TransactionType.predictWithdraw]: 'withdraw',
};

/**
 * Array of all Predict transaction types for filtering
 */
export const PREDICT_TRANSACTION_TYPES = [
  TransactionType.predictDeposit,
  TransactionType.predictClaim,
  TransactionType.predictWithdraw,
] as const;
