import { TransactionMeta } from '@metamask/transaction-controller';
import { cloneDeep } from 'lodash';
import TransactionTypes from '../../../core/TransactionTypes';
import {
  getIsSwapApproveOrSwapTransaction,
  isHardwareSwapApproveOrSwapTransaction,
} from '../../../util/transactions';
import {
  getIsBridgeTransaction,
  isHardwareBridgeTransaction,
} from '../../UI/Bridge/utils/transaction';

interface OnUnapprovedTransactionCallbacks {
  watchSwapBridgeTransaction: (transactionMeta: TransactionMeta) => void;
  autoSign: (transactionMeta: TransactionMeta) => void;
}

/**
 * Handles an unapproved transaction event.
 *
 * - For all swap/bridge transactions: sets up transaction notification watching.
 * - For hardware wallet swap/bridge transactions only: triggers auto-sign.
 */
export function onUnapprovedTransaction(
  transactionMetaOriginal: TransactionMeta,
  callbacks: OnUnapprovedTransactionCallbacks,
) {
  const transactionMeta = cloneDeep(transactionMetaOriginal);

  if (transactionMeta.origin === TransactionTypes.MMM) return;

  const to = transactionMeta.txParams.to?.toLowerCase();
  const data = transactionMeta.txParams.data as string;

  const isSwapTransaction = getIsSwapApproveOrSwapTransaction(
    data,
    transactionMeta.origin,
    to,
    transactionMeta.chainId,
  );
  const isBridgeTransaction = getIsBridgeTransaction(transactionMeta);

  if (isSwapTransaction || isBridgeTransaction) {
    callbacks.watchSwapBridgeTransaction(transactionMeta);
  }

  if (
    isHardwareSwapApproveOrSwapTransaction(
      data,
      transactionMeta.origin,
      to,
      transactionMeta.chainId,
      transactionMeta.txParams.from,
    ) ||
    isHardwareBridgeTransaction(transactionMeta)
  ) {
    callbacks.autoSign(transactionMeta);
  }
}
