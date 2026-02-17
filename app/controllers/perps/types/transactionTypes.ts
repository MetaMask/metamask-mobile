/**
 * Shared transaction types for Perps deposits and withdrawals
 * Provides a unified structure while maintaining separate use cases
 */

/**
 * Base type with core properties shared between all transaction results
 * All properties are JSON serializable for controller state compatibility
 */
export type BaseTransactionResult = {
  amount: string;
  asset: string;
  txHash?: string;
  timestamp: number;
  success: boolean; // explicit to avoid regressions
};

/**
 * For transient UI feedback (toasts, progress indicators)
 * Used for immediate success/failure notifications
 * JSON serializable for controller state
 */
export type LastTransactionResult = {
  amount: string;
  asset: string;
  txHash: string;
  timestamp: number;
  success: boolean;
  error: string;
  [key: string]: string | number | boolean;
};

/**
 * For persistent transaction history tracking
 * Used for transaction history display and detailed status tracking
 * JSON serializable for controller state
 */
export type TransactionStatus = 'pending' | 'bridging' | 'completed' | 'failed';

export type TransactionRecord = {
  id: string;
  amount: string;
  asset: string;
  txHash?: string;
  timestamp: number;
  success: boolean;
  status: TransactionStatus;
  destination?: string; // mainly for withdrawals
  source?: string; // mainly for deposits
  transactionId?: string; // generic - could be withdrawalId or depositId
  // Legacy fields for backward compatibility
  withdrawalId?: string; // for withdrawals
  depositId?: string; // for deposits
};

/**
 * Type guard to check if a transaction result is a TransactionRecord
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a TransactionRecord with id and status fields.
 */
export function isTransactionRecord(
  result: LastTransactionResult | TransactionRecord,
): result is TransactionRecord {
  return 'id' in result && 'status' in result;
}

/**
 * Type guard to check if a transaction result is a LastTransactionResult
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a LastTransactionResult without id or status fields.
 */
export function isLastTransactionResult(
  result: LastTransactionResult | TransactionRecord,
): result is LastTransactionResult {
  return !('id' in result) || !('status' in result);
}
