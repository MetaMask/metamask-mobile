import type { TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../core/Engine';
import type { BridgeToken } from '../../components/UI/Bridge/types';
import { MoneyAccountAction } from '@metamask/bridge-controller';

export const isBridgeDepositTx = (transaction: TransactionMeta): boolean =>
  Boolean(
    Object.values(Engine.context.BridgeStatusController.state.txHistory).some(
      ({ depositTxMeta }) =>
        depositTxMeta?.batchId && depositTxMeta.batchId === transaction.batchId,
    ),
  );

export const isBridgeWithdrawTx = (transaction: TransactionMeta): boolean =>
  Boolean(
    Object.values(Engine.context.BridgeStatusController.state.txHistory).some(
      ({ withdrawTxMeta }) =>
        withdrawTxMeta?.batchId &&
        withdrawTxMeta.batchId === transaction.batchId,
    ),
  );

export const resolveMoneyAccountOperation = (
  srcToken?: BridgeToken,
  destToken?: BridgeToken,
): MoneyAccountAction | undefined => {
  const depositOperation = destToken?.isMoneyToken
    ? MoneyAccountAction.Deposit
    : undefined;
  return srcToken?.isMoneyToken
    ? MoneyAccountAction.Withdraw
    : depositOperation;
};
