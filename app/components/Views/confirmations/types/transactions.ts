import { Hex } from '@metamask/utils';

export interface UpdateTransactionPayAmountCall {
  nestedTransactionIndex: number;
  transactionData: Hex;
}
