import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

export const getIsBridgeApprovalOrBridgeTransaction = (
  txMeta: TransactionMeta,
) =>
  txMeta.type === TransactionType.bridgeApproval ||
  txMeta.type === TransactionType.bridge;
