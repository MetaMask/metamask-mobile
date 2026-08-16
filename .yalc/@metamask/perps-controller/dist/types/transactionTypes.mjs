/**
 * Shared transaction types for Perps deposits and withdrawals
 * Provides a unified structure while maintaining separate use cases
 */
import { hasProperty } from "@metamask/utils";
/**
 * Type guard to check if a transaction result is a TransactionRecord
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a TransactionRecord with id and status fields.
 */
export function isTransactionRecord(result) {
    return hasProperty(result, 'id') && hasProperty(result, 'status');
}
/**
 * Type guard to check if a transaction result is a LastTransactionResult
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a LastTransactionResult without id or status fields.
 */
export function isLastTransactionResult(result) {
    return !hasProperty(result, 'id') || !hasProperty(result, 'status');
}
//# sourceMappingURL=transactionTypes.mjs.map