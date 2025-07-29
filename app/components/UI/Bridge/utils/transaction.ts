import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';

export const getIsBridgeTransaction = (txMeta: TransactionMeta) => {
  const { origin } = txMeta;

  return (
    origin === ORIGIN_METAMASK &&
    (txMeta.type === TransactionType.bridgeApproval ||
      txMeta.type === TransactionType.bridge)
  );
};
