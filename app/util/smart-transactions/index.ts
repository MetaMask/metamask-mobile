import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import TransactionTypes from '../../core/TransactionTypes';
import {
  getIsSwapApproveTransaction,
  getIsSwapApproveOrSwapTransaction,
  getIsSwapTransaction,
  getIsNativeTokenTransferred,
} from '../transactions';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import {
  SmartTransaction,
  Fees,
} from '@metamask/smart-transactions-controller/dist/types';
import Engine, { type BaseControllerMessenger } from '../../core/Engine';
import { isProduction } from '../environment';

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
  mobileReturnTxHashAsap: boolean,
): boolean =>
  !mobileReturnTxHashAsap &&
  (isDapp || isSend || isSwapApproveTx || !hasPendingApprovalForSwapApproveTx);

export const getShouldUpdateApprovalRequest = (
  isDapp: boolean,
  isSend: boolean,
  isSwapTransaction: boolean,
  mobileReturnTxHashAsap: boolean,
): boolean =>
  !mobileReturnTxHashAsap && (isDapp || isSend || isSwapTransaction);

const waitForSmartTransactionConfirmationDone = (
  controllerMessenger: BaseControllerMessenger,
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
  controllerMessenger?: BaseControllerMessenger,
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

export type GasIncludedQuote = Fees & { isGasIncludedTrade?: boolean };

// Currently, we take the first token for gas fee payment, but later, a user can choose which token to use for gas payment.
export const getTradeTxTokenFee = (quote: GasIncludedQuote) =>
  // @ts-expect-error Property 'tokenFees' does not exist on type 'Fee'. Need to update the type.
  quote?.tradeTxFees?.fees?.[0]?.tokenFees?.[0];

// We get gas included fees from a swap quote now. In a future iteration we will have a universal
// implementation that works for non-swaps transactions as well.
export const getGasIncludedTransactionFees = (quote: GasIncludedQuote) => {
  const tradeTxTokenFee = getTradeTxTokenFee(quote);
  let transactionFees;
  if (tradeTxTokenFee && quote?.isGasIncludedTrade) {
    transactionFees = {
      approvalTxFees: quote?.approvalTxFees,
      tradeTxFees: quote?.tradeTxFees,
    };
  }
  return transactionFees;
};

export const getIsAllowedRpcUrlForSmartTransactions = (rpcUrl?: string) => {
  // Allow in non-production environments.
  if (!isProduction()) {
    return true;
  }

  const hostname = rpcUrl && new URL(rpcUrl).hostname;

  return (
    hostname?.endsWith('.infura.io') ||
    hostname?.endsWith('.binance.org') ||
    false
  );
};

/**
 * Wipes smart transactions from the SmartTransactionsController state.
 * This should be called when resetting an account to clear smart transaction history for a specific address.
 * @param address - The address whose smart transactions should be wiped
 */
export function wipeSmartTransactions(address: string) {
  const { SmartTransactionsController: controller } = Engine.context;
  controller.wipeSmartTransactions({
    address,
    ignoreNetwork: true,
  });
}
