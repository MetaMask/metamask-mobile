"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isLastTransactionResult = exports.isTransactionRecord = void 0;
/**
 * Shared transaction types for Perps deposits and withdrawals
 * Provides a unified structure while maintaining separate use cases
 */
const utils_1 = require("@metamask/utils");
/**
 * Type guard to check if a transaction result is a TransactionRecord
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a TransactionRecord with id and status fields.
 */
function isTransactionRecord(result) {
    return (0, utils_1.hasProperty)(result, 'id') && (0, utils_1.hasProperty)(result, 'status');
}
exports.isTransactionRecord = isTransactionRecord;
/**
 * Type guard to check if a transaction result is a LastTransactionResult
 *
 * @param result - The transaction result to check.
 * @returns True if the result is a LastTransactionResult without id or status fields.
 */
function isLastTransactionResult(result) {
    return !(0, utils_1.hasProperty)(result, 'id') || !(0, utils_1.hasProperty)(result, 'status');
}
exports.isLastTransactionResult = isLastTransactionResult;
//# sourceMappingURL=transactionTypes.cjs.map