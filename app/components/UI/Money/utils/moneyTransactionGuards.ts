import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';

/**
 * Returns the first nested transaction matching a given TransactionType,
 * or undefined if none exists.
 */
export const nestedTxWithType = (
  transactionMeta: TransactionMeta,
  targetType: TransactionType,
) =>
  transactionMeta.nestedTransactions?.find(
    (nested) => nested.type === targetType,
  );

export const isMoneyDepositTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountDeposit ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountDeposit),
  );

export const isMoneyWithdrawTx = (transactionMeta: TransactionMeta) =>
  transactionMeta.type === TransactionType.moneyAccountWithdraw ||
  Boolean(
    nestedTxWithType(transactionMeta, TransactionType.moneyAccountWithdraw),
  );

export const isMoneyAccountTx = (transactionMeta: TransactionMeta) =>
  isMoneyDepositTx(transactionMeta) || isMoneyWithdrawTx(transactionMeta);

/**
 * Resolves source and destination chain IDs for MM Pay transaction.
 *
 * `metamaskPay.chainId` is the payment-token chain. Its role flips based on
 * `isPostQuote`: for withdrawals (post-quote) it's the destination, for
 * deposits it's the source.
 */
export const getMMPayChainIds = (
  transactionMeta: TransactionMeta,
): { sourceChainId: Hex | undefined; destinationChainId: Hex | undefined } => {
  const local = transactionMeta.chainId;
  const pay = transactionMeta.metamaskPay?.chainId as Hex | undefined;

  return transactionMeta.metamaskPay?.isPostQuote
    ? { sourceChainId: local, destinationChainId: pay }
    : { sourceChainId: pay ?? local, destinationChainId: local };
};
