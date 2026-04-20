import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

import { updatePredictDepositData } from '../../../../UI/Predict/providers/polymarket/pusd';
import { hasTransactionType } from '../transaction';

export function updateTransactionPayData({
  transactionId,
  transactionMeta,
  amountHex,
}: {
  transactionId: string;
  transactionMeta: TransactionMeta;
  amountHex: string;
}): boolean {
  if (
    hasTransactionType(transactionMeta, [
      TransactionType.predictDeposit,
      TransactionType.predictDepositAndOrder,
    ])
  ) {
    updatePredictDepositData({ transactionId, transactionMeta, amountHex });
    return true;
  }

  return false;
}
