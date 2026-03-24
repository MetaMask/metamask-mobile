import { ORIGIN_METAMASK } from '@metamask/controller-utils';
import {
  TransactionMeta,
  TransactionType,
} from '@metamask/transaction-controller';
import { isHardwareAccount } from '../../../../util/address';

export const getIsBridgeTransaction = (txMeta: TransactionMeta) => {
  const { origin } = txMeta;

  return (
    origin === ORIGIN_METAMASK &&
    (txMeta.type === TransactionType.bridgeApproval ||
      txMeta.type === TransactionType.bridge)
  );
};

/**
 * Determines if the transaction is a bridge transaction
 * from a hardware wallet (Ledger or QR).
 * Used as an additional guard at the call site before invoking autoSign.
 */
export const isHardwareBridgeTransaction = (txMeta: TransactionMeta) =>
  isHardwareAccount(txMeta.txParams.from as string) &&
  getIsBridgeTransaction(txMeta);
