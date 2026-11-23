import type { TransactionMeta } from '@metamask/transaction-controller';

export enum MoneyActivityFilter {
  All = 'all',
  Deposits = 'deposits',
  Transfers = 'transfers',
  Purchases = 'purchases',
}

/**
 * When set on enriched {@link TransactionMeta}, overrides the default title from {@link TransactionType}.
 */
export type MoneyActivityTitleKey =
  | 'deposited'
  | 'received'
  | 'card_transaction'
  | 'converted'
  | 'sent';

/**
 * {@link TransactionMeta} plus optional Money activity presentation fields.
 */
export type MoneyActivityTransactionMeta = TransactionMeta & {
  moneySubtitle?: string;
  moneyActivityTitleKey?: MoneyActivityTitleKey;
};
