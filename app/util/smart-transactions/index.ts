import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from './smart-publish-hook';
import TransactionTypes from '../../core/TransactionTypes';
import {
  getIsSwapApproveTransaction,
  getIsSwapApproveOrSwapTransaction,
  getIsSwapTransaction,
  getIsNativeTokenTransferred,
} from '../transactions';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import { SmartTransaction } from '@metamask/smart-transactions-controller/dist/types';
import type { ControllerMessenger } from '../../core/Engine';

const TIMEOUT_FOR_SMART_TRANSACTION_CONFIRMATION_DONE_EVENT = 10000;

export const getTransactionType = (
  transactionMeta: TransactionMeta,
  chainId: Hex,
) => {
  // Determine tx type
  // If it isn't a dapp tx, check if it's MM Swaps or Send
  // process.env.MM_FOX_CODE is from MM Swaps
  const isDapp =
    transactionMeta?.origin !== TransactionTypes.MMM &&
    transactionMeta?.origin !== process.env.MM_FOX_CODE;

  const to = transactionMeta.txParams.to?.toLowerCase();
  const data = transactionMeta.txParams.data; // undefined for send txs of gas tokens

  const isSwapApproveOrSwapTransaction = getIsSwapApproveOrSwapTransaction(
    data,
    transactionMeta.origin,
    to,
    chainId,
  );
  const isSwapApproveTx = getIsSwapApproveTransaction(
    data,
    transactionMeta.origin,
    to,
    chainId,
  );
  const isSwapTransaction = getIsSwapTransaction(
    data,
    transactionMeta.origin,
    to,
    chainId,
  );

  const isNativeTokenTransferred = getIsNativeTokenTransferred(
    transactionMeta.txParams,
  );

  const isSend = !isDapp && !isSwapApproveOrSwapTransaction;

  return {
    isDapp,
    isSend,
    isInSwapFlow: isSwapApproveOrSwapTransaction,
    isSwapApproveTx,
    isSwapTransaction,
    isNativeTokenTransferred,
  };
};

// Status modal start, update, and close conditions
// If ERC20 if from token in swap and requires additional allowance, Swap txs are the 2nd in the swap flow, so we don't want to show another status page for that
export const getShouldStartApprovalRequest = (
  isDapp: boolean,
  isSend: boolean,
  isSwapApproveTx: boolean,
  hasPendingApprovalForSwapApproveTx: boolean,
): boolean =>
  isDapp || isSend || isSwapApproveTx || !hasPendingApprovalForSwapApproveTx;

export const getShouldUpdateApprovalRequest = (
  isDapp: boolean,
  isSend: boolean,
  isSwapTransaction: boolean,
): boolean => isDapp || isSend || isSwapTransaction;

const waitForSmartTransactionConfirmationDone = (
  controllerMessenger: ControllerMessenger,
): Promise<SmartTransaction | undefined> =>
  new Promise((resolve) => {
    controllerMessenger.subscribe(
      'SmartTransactionsController:smartTransactionConfirmationDone',
      async (smartTransaction: SmartTransaction) => {
        resolve(smartTransaction);
      },
    );
    setTimeout(() => {
      resolve(undefined); // In a rare case we don't get the "smartTransactionConfirmationDone" event within 10 seconds, we resolve with undefined to continue.
    }, TIMEOUT_FOR_SMART_TRANSACTION_CONFIRMATION_DONE_EVENT);
  });

export const getSmartTransactionMetricsProperties = async (
  smartTransactionsController: SmartTransactionsController,
  transactionMeta: TransactionMeta | undefined,
  waitForSmartTransaction: boolean,
  controllerMessenger?: ControllerMessenger,
) => {
  if (!transactionMeta) return {};
  let smartTransaction =
    smartTransactionsController.getSmartTransactionByMinedTxHash(
      transactionMeta.hash,
    );
  const shouldWaitForSmartTransactionConfirmationDoneEvent =
    waitForSmartTransaction &&
    !smartTransaction?.statusMetadata && // We get this after polling for a status for a Smart Transaction.
    controllerMessenger;
  if (shouldWaitForSmartTransactionConfirmationDoneEvent) {
    smartTransaction = await waitForSmartTransactionConfirmationDone(
      controllerMessenger,
    );
  }
  if (!smartTransaction?.statusMetadata) {
    return {};
  }
  const { timedOut, proxied } = smartTransaction.statusMetadata;
  return {
    smart_transaction_timed_out: timedOut,
    smart_transaction_proxied: proxied,
  };
};
