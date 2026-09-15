export interface DecodedTransactionElement {
  actionKey: string;
  value?: string;
  fiatValue?: string | false;
  transactionType?: string;
}

export type DecodedTransactionDetails = Record<string, unknown>;

export type DecodedTransaction = [
  DecodedTransactionElement,
  DecodedTransactionDetails,
];
