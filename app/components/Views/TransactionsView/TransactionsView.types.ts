/**
 * Transactions view navigation parameters
 */
export interface TransactionsViewParams {
  redirectToOrders?: boolean;
  redirectToPerpsTransactions?: boolean;
}

/** Transaction details parameters */
export interface TransactionDetailsParams {
  transactionId?: string;
}
