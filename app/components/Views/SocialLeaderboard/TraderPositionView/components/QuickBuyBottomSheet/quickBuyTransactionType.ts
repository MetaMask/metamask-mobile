import { TransactionType } from '@metamask/transaction-controller';

/**
 * Type discriminator for Quick Buy Pay transactions.
 *
 * The upstream `@metamask/transaction-controller` enum does not yet include
 * this value, so we use a string literal and cast to `TransactionType` at the
 * boundary. The runtime comparison works because `TransactionType` is a string
 * enum and `transactionMeta.type` is stored as its string value.
 */
export const QUICK_BUY_TRANSACTION_TYPE = 'quickBuy' as const;

/**
 * Cast of the string literal to `TransactionType` for use where the controller
 * API requires the enum type at compile time.
 */
export const QUICK_BUY_TX_TYPE =
  QUICK_BUY_TRANSACTION_TYPE as unknown as TransactionType;

export const isQuickBuyTransactionType = (
  type: string | TransactionType | undefined,
): boolean => type === QUICK_BUY_TRANSACTION_TYPE;
