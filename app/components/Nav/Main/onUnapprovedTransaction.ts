import { TransactionMeta } from '@metamask/transaction-controller';
import { cloneDeep } from 'lodash';
import TransactionTypes from '../../../core/TransactionTypes';
import { isHardwareSwapApproveOrSwapTransaction } from '../../../util/transactions';
import { isHardwareBridgeTransaction } from '../../UI/Bridge/utils/transaction';

interface OnUnapprovedTransactionCallbacks {
  autoSign: (transactionMeta: TransactionMeta) => void;
}

/**
 * Handles an unapproved transaction event.
 *
 * For hardware wallet swap/bridge transactions only: triggers auto-sign.
 */
export function onUnapprovedTransaction(
  transactionMetaOriginal: TransactionMeta,
  callbacks: OnUnapprovedTransactionCallbacks,
) {
  const transactionMeta = cloneDeep(transactionMetaOriginal);

  if (transactionMeta.origin === TransactionTypes.MMM) return;

  const to = transactionMeta.txParams.to?.toLowerCase();
  const data = transactionMeta.txParams.data as string;

  if (
    isHardwareSwapApproveOrSwapTransaction(
      data,
      to,
      transactionMeta.chainId,
      transactionMeta.type,
      transactionMeta.txParams.from,
    ) ||
    isHardwareBridgeTransaction(transactionMeta)
  ) {
    callbacks.autoSign(transactionMeta);
  }
}
