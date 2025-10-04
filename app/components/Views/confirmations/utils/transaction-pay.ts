import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { PERPS_MINIMUM_DEPOSIT } from '../constants/perps';
import { PREDICT_MINIMUM_DEPOSIT } from '../constants/predict';

export function getRequiredBalance(
  transactionMeta: TransactionMeta,
): number | undefined {
  const nestedTypes =
    transactionMeta.nestedTransactions?.map((t) => t.type) ?? [];

  if (transactionMeta.type === TransactionType.perpsDeposit) {
    return PERPS_MINIMUM_DEPOSIT;
  }

  if (nestedTypes.includes(TransactionType.predictDeposit)) {
    return PREDICT_MINIMUM_DEPOSIT;
  }

  return undefined;
}
