import type { TransactionMeta } from '@metamask/transaction-controller';
import Engine from '../../core/Engine';
import type { BridgeToken } from '../../components/UI/Bridge/types';
import { MoneyAccountAction } from '@metamask/bridge-controller';

export const isBridgeDepositTx = (transaction: TransactionMeta): boolean =>
  Boolean(
    Object.values(Engine.context.BridgeStatusController.state.txHistory).find(
      ({ depositTxMeta }) => depositTxMeta?.batchId === transaction.batchId,
    ),
  );

export const isBridgeWithdrawTx = (transaction: TransactionMeta): boolean =>
  Boolean(
    Object.values(Engine.context.BridgeStatusController.state.txHistory).find(
      ({ withdrawTxMeta }) => withdrawTxMeta?.batchId === transaction.batchId,
    ),
  );

export const resolveMoneyAccountOperation = (
  srcToken?: BridgeToken,
  destToken?: BridgeToken,
): MoneyAccountAction | undefined =>
  srcToken?.isMoneyToken
    ? MoneyAccountAction.Withdraw
    : destToken?.isMoneyToken
      ? MoneyAccountAction.Deposit
      : undefined;
