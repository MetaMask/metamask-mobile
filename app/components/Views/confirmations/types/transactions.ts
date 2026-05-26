import { Hex } from '@metamask/utils';

export interface UpdateTransactionPayAmountCall {
  nestedTransactionIndex: number;
  transactionData: Hex;
}

/**
 * Local declaration until @metamask/transaction-pay-controller exports it.
 */
export enum PaymentOverride {
  MoneyAccount = 'moneyAccount',
  Perps = 'perps',
  Predict = 'predict',
}
