import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { hasTransactionType } from '../../components/Views/confirmations/utils/transaction';

type MetaMaskPayUseCase =
  | 'perps_deposit'
  | 'predict_deposit'
  | 'predict_withdraw';

export const PERPS_DEPOSIT_TRANSACTION_TYPES = [
  TransactionType.perpsDeposit,
  TransactionType.perpsDepositAndOrder,
  TransactionType.perpsRelayDeposit,
  TransactionType.perpsAcrossDeposit,
] as const;

export const PREDICT_DEPOSIT_TRANSACTION_TYPES = [
  TransactionType.predictDeposit,
  TransactionType.predictDepositAndOrder,
  TransactionType.predictRelayDeposit,
  TransactionType.predictAcrossDeposit,
] as const;

export const PREDICT_WITHDRAW_TRANSACTION_TYPES = [
  TransactionType.predictWithdraw,
] as const;

export const MM_PAY_DEPOSIT_CHILD_TRANSACTION_TYPES = [
  TransactionType.relayDeposit,
  TransactionType.perpsRelayDeposit,
  TransactionType.predictRelayDeposit,
  TransactionType.perpsAcrossDeposit,
  TransactionType.predictAcrossDeposit,
] as const;

export const MM_PAY_POSITIVE_TRANSFER_TRANSACTION_TYPES = [
  TransactionType.musdConversion,
  TransactionType.perpsWithdraw,
  ...PERPS_DEPOSIT_TRANSACTION_TYPES,
  ...PREDICT_DEPOSIT_TRANSACTION_TYPES,
  ...PREDICT_WITHDRAW_TRANSACTION_TYPES,
] as const;

export const MM_PAY_DETAIL_TRANSACTION_TYPES = [
  TransactionType.musdClaim,
  TransactionType.musdConversion,
  TransactionType.predictClaim,
  TransactionType.perpsWithdraw,
  ...PERPS_DEPOSIT_TRANSACTION_TYPES,
  ...PREDICT_DEPOSIT_TRANSACTION_TYPES,
  ...PREDICT_WITHDRAW_TRANSACTION_TYPES,
] as const;

export function hasPerpsDepositTransactionType(
  transactionMeta: TransactionMeta | undefined,
) {
  return hasTransactionType(
    transactionMeta,
    PERPS_DEPOSIT_TRANSACTION_TYPES as unknown as readonly TransactionType[],
  );
}

export function hasPredictDepositTransactionType(
  transactionMeta: TransactionMeta | undefined,
) {
  return hasTransactionType(
    transactionMeta,
    PREDICT_DEPOSIT_TRANSACTION_TYPES as unknown as readonly TransactionType[],
  );
}

export function hasPredictWithdrawTransactionType(
  transactionMeta: TransactionMeta | undefined,
) {
  return hasTransactionType(
    transactionMeta,
    PREDICT_WITHDRAW_TRANSACTION_TYPES as unknown as readonly TransactionType[],
  );
}

export function hasMetaMaskPayDepositChildTransactionType(
  transactionMeta: TransactionMeta | undefined,
) {
  return hasTransactionType(
    transactionMeta,
    MM_PAY_DEPOSIT_CHILD_TRANSACTION_TYPES as unknown as readonly TransactionType[],
  );
}

export function getMetaMaskPayUseCase(
  transactionMeta: TransactionMeta | undefined,
): MetaMaskPayUseCase | undefined {
  if (hasPerpsDepositTransactionType(transactionMeta)) {
    return 'perps_deposit';
  }

  if (hasPredictDepositTransactionType(transactionMeta)) {
    return 'predict_deposit';
  }

  if (hasPredictWithdrawTransactionType(transactionMeta)) {
    return 'predict_withdraw';
  }

  return undefined;
}

export function getMetaMaskPayRouteTransactionType(
  transactionMeta: TransactionMeta | undefined,
): TransactionType | undefined {
  if (!transactionMeta) {
    return undefined;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.musdClaim])) {
    return TransactionType.musdClaim;
  }

  if (hasTransactionType(transactionMeta, [TransactionType.musdConversion])) {
    return TransactionType.musdConversion;
  }

  if (hasPerpsDepositTransactionType(transactionMeta)) {
    return TransactionType.perpsDeposit;
  }

  if (hasPredictDepositTransactionType(transactionMeta)) {
    return TransactionType.predictDeposit;
  }

  if (hasPredictWithdrawTransactionType(transactionMeta)) {
    return TransactionType.predictWithdraw;
  }

  return undefined;
}
