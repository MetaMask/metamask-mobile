import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';
import { hasTransactionType } from './transaction';

export function getRequiredBalance(
  transactionMeta: TransactionMeta,
): number | undefined {
  if (hasTransactionType(transactionMeta, [TransactionType.perpsDeposit])) {
    return PERPS_MINIMUM_DEPOSIT;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.predictDeposit])) {
    return PREDICT_MINIMUM_DEPOSIT;
  }

  return undefined;
}
