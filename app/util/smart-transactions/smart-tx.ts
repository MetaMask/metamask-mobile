import { ApprovalController } from '@metamask/approval-controller';
import SmartTransactionsController from '@metamask/smart-transactions-controller';
import {
  Fee,
  SmartTransaction,
} from '@metamask/smart-transactions-controller/dist/types';
import {
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import Logger from '../Logger';
import { decimalToHex } from '../conversions';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';
import TransactionTypes from '../../core/TransactionTypes';
import {
  getIsSwapApproveTransaction,
  getIsInSwapFlowTransaction,
  getIsSwapTransaction,
  getIsNativeTokenTransferred,
} from '../transactions';

// TODO import these from tx controller
export declare type Hex = `0x${string}`;
export interface TransactionParams {
  chainId?: Hex;
  data?: string;
  from: string;
  gas?: string;
  gasPrice?: string;
  gasUsed?: string;
  nonce?: string;
  to?: string;
  value?: string;
  maxFeePerGas?: string;
  maxPriorityFeePerGas?: string;
  estimatedBaseFee?: string;
  estimateGasError?: string;
  type?: string;
}

export const createSignedTransactions = async (
  unsignedTransaction: TransactionParams,
  fees: Fee[],
  areCancelTransactions: boolean,
  transactionController: TransactionController,
) => {
  const unsignedTransactionsWithFees = fees.map((fee) => {
    const unsignedTransactionWithFees = {
      ...unsignedTransaction,
      maxFeePerGas: decimalToHex(fee.maxFeePerGas).toString(),
      maxPriorityFeePerGas: decimalToHex(fee.maxPriorityFeePerGas).toString(),
      gas: areCancelTransactions
        ? decimalToHex(21000).toString() // It has to be 21000 for cancel transactions, otherwise the API would reject it.
        : unsignedTransaction.gas?.toString(),
      value: unsignedTransaction.value,
    };
    if (areCancelTransactions) {
      unsignedTransactionWithFees.to = unsignedTransactionWithFees.from;
      unsignedTransactionWithFees.data = '0x';
    }

    return unsignedTransactionWithFees;
  });

  Logger.log(
    'STX createSignedTransactions, unsignedTransactionsWithFees',
    unsignedTransactionsWithFees,
  );

  const signedTransactions =
    await transactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
      { hasNonce: true },
    );

  Logger.log(
    'STX createSignedTransactions signedTransactions',
    signedTransactions,
  );

  return signedTransactions;
};

interface Request {
  transactionMeta: TransactionMeta;
  smartTransactionsController: SmartTransactionsController;
  transactionController: TransactionController;
  isSmartTransaction: boolean;
  approvalController: ApprovalController;
  featureFlags: {
    isLive: boolean;
    mobile_active: boolean;
    extension_active: boolean;
    fallback_to_v1: boolean;
    fallbackToV1: boolean;
    mobileActive: boolean;
    extensionActive: boolean;
    mobileActiveIOS: boolean;
    mobileActiveAndroid: boolean;
    smartTransactions:
      | {
          expectedDeadline: number;
          maxDeadline: number;
          returnTxHashAsap: boolean;
        }
      | Record<string, never>;
  };
}

const LOG_PREFIX = 'STX publishHook';

export async function publishHook(request: Request) {
  const {
    transactionMeta,
    smartTransactionsController,
    transactionController,
    isSmartTransaction,
    approvalController,
    featureFlags,
  } = request;
  // transaction field is used for TxController v8
  // will become txParams in TxController v11 https://github.com/MetaMask/core/blob/main/packages/transaction-controller/CHANGELOG.md#1100
  // TODO update once Mobile is on v11+, remove STX patch, and change all transaction to txParams
  const { chainId, transaction, origin } = transactionMeta;

  Logger.log('STX featureflags', featureFlags);

  if (!isSmartTransaction) {
    Logger.log(LOG_PREFIX, 'Skipping hook as not enabled for chain', chainId);

    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
  }

  Logger.log(
    LOG_PREFIX,
    'Executing publish hook with transactionMeta:',
    transactionMeta,
  );

  // Determine tx type
  // If it isn't a dapp tx, check if it's MM Swaps or Send
  // process.env.MM_FOX_CODE is from MM Swaps
  const isDapp =
    transactionMeta?.origin !== TransactionTypes.MMM &&
    transactionMeta?.origin !== process.env.MM_FOX_CODE;

  const to = transactionMeta.transaction.to?.toLowerCase();
  const data = transactionMeta.transaction.data; // undefined for send txs of gas tokens

  const isInSwapFlow = getIsInSwapFlowTransaction(
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
    transactionMeta.transaction,
  );

  const isSend = !isDapp && !isInSwapFlow;

  // Status modal start, update, and close conditions
  // Swap txs are the 2nd in the swap flow, so we don't want to show another status page for that
  const shouldStartFlow =
    isDapp ||
    isSend ||
    isSwapApproveTx ||
    (isSwapTransaction && isNativeTokenTransferred);
  const shouldUpdateFlow = isDapp || isSend || isSwapTransaction;
  const shouldEndFlow = isDapp || isSend || isSwapTransaction;

  Logger.log(
    LOG_PREFIX,
    'isDapp',
    isDapp,
    'isInSwapFlow',
    isInSwapFlow,
    'isSwapApproveTx',
    isSwapApproveTx,
    'isSwapTransaction',
    isSwapTransaction,
    'isNativeTokenTransferred',
    isNativeTokenTransferred,
    'shouldStartFlow',
    shouldStartFlow,
    'shouldUpdateFlow',
    shouldUpdateFlow,
    'shouldEndFlow',
    shouldEndFlow,
  );

  let smartTransactionStatusApprovalId: string | undefined;
  if (shouldStartFlow) {
    const { id } = approvalController.startFlow(); // this triggers a small loading spinner to pop up at bottom of page
    smartTransactionStatusApprovalId = id;
  } else {
    Logger.log(
      LOG_PREFIX,
      'approvalController.state',
      approvalController.state,
    );

    // Looking for a pendingApproval that's a swap approve tx
    const pendingApprovals = Object.values(
      approvalController.state.pendingApprovals,
    ).filter(
      ({ origin: pendingApprovalOrigin, type, requestState }) =>
        pendingApprovalOrigin === process.env.MM_FOX_CODE &&
        type === ApprovalTypes.SMART_TRANSACTION_STATUS &&
        requestState?.isInSwapFlow &&
        requestState?.isSwapApproveTx,
    );

    if (pendingApprovals.length !== 1) {
      throw new Error(
        `${LOG_PREFIX} - No pending approval found for swap approve tx`,
      );
    }

    smartTransactionStatusApprovalId = pendingApprovals[0].id;
  }

  Logger.log(
    LOG_PREFIX,
    'Started approval flow',
    'smartTransactionStatusApprovalId',
    smartTransactionStatusApprovalId,
  );

  try {
    Logger.log(LOG_PREFIX, 'Fetching fees', transaction, chainId);
    const feesResponse = await smartTransactionsController.getFees(
      { ...transaction, chainId },
      undefined,
    );

    Logger.log(LOG_PREFIX, 'Retrieved fees', feesResponse);

    const signedTransactions = (await createSignedTransactions(
      transaction,
      feesResponse.tradeTxFees?.fees ?? [],
      false,
      transactionController,
    )) as string[];

    const signedCanceledTransactions = (await createSignedTransactions(
      transaction,
      feesResponse.tradeTxFees?.cancelFees || [],
      true,
      transactionController,
    )) as string[];

    Logger.log(LOG_PREFIX, 'Generated signed transactions', {
      signedTransactions,
      signedCanceledTransactions,
    });

    Logger.log(LOG_PREFIX, 'Submitting signed transactions');

    const submitTransactionResponse =
      await smartTransactionsController.submitSignedTransactions({
        signedTransactions,
        signedCanceledTransactions,
        transaction,
        transactionMeta,
      });

    const uuid = submitTransactionResponse?.uuid;
    const returnTxHashAsap = featureFlags?.smartTransactions.returnTxHashAsap;

    if (!uuid) {
      throw new Error(`${LOG_PREFIX} - No smart transaction UUID`);
    }

    Logger.log(LOG_PREFIX, 'Received UUID', uuid);
    Logger.log(
      LOG_PREFIX,
      'returnTxHashAsap',
      returnTxHashAsap,
      submitTransactionResponse.txHash,
    );

    // For MM Swaps, the user just confirms the ERC20 approval tx, then the actual swap tx is auto confirmed, so 2 stx's are sent through in quick succession
    if (!origin) throw new Error('Origin is required');
    if (shouldStartFlow) {
      // Do not await on this, since it will not progress any further if so
      approvalController.addAndShowApprovalRequest({
        id: smartTransactionStatusApprovalId,
        origin,
        type: ApprovalTypes.SMART_TRANSACTION_STATUS,
        // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
        // can also be read from approvalController.state.pendingApprovals[approvalId].requestState
        requestState: {
          smartTransaction: {
            status: 'pending',
          },
          creationTime: Date.now(),
          isDapp,
          isInSwapFlow,
          isSwapApproveTx,
          isSwapTransaction,
        },
      });
      Logger.log(
        LOG_PREFIX,
        'Added approval',
        smartTransactionStatusApprovalId,
      );
    }

    // undefined for init state
    // null for error
    // string for success
    let transactionHash: string | null | undefined;
    if (returnTxHashAsap && submitTransactionResponse?.txHash) {
      transactionHash = submitTransactionResponse.txHash;
    }

    // All tx types must eventually return a transaction hash, TransactionController is expecting it
    if (smartTransactionStatusApprovalId) {
      smartTransactionsController.eventEmitter.on(
        `${uuid}:smartTransaction`,
        async (smartTransaction: SmartTransaction) => {
          Logger.log(LOG_PREFIX, 'smartTransaction event', smartTransaction);

          const { status, statusMetadata } = smartTransaction;
          if (!status || status === 'pending') {
            return;
          }

          try {
            if (shouldUpdateFlow) {
              await approvalController.updateRequestState({
                id: smartTransactionStatusApprovalId as string,
                requestState: {
                  smartTransaction: smartTransaction as any,
                  isDapp,
                  isInSwapFlow,
                  isSwapApproveTx,
                  isSwapTransaction,
                },
              });
            }
          } catch (e) {
            // Could get here if user closes the status modal
            Logger.log(LOG_PREFIX, 'Error updating approval request state', e);
          }

          if (statusMetadata?.minedHash) {
            Logger.log(
              LOG_PREFIX,
              'Received tx hash',
              statusMetadata?.minedHash,
            );
            transactionHash = statusMetadata.minedHash;
          } else {
            transactionHash = null;
          }
        },
      );
    }

    const waitForTransactionHashChange = () =>
      new Promise((resolve) => {
        const checkVariable = () => {
          if (transactionHash === undefined) {
            setTimeout(checkVariable, 100); // Check again after 100ms
          } else {
            resolve(`transactionHash has changed to: ${transactionHash}`);
          }
        };

        checkVariable();
      });

    await waitForTransactionHashChange();

    if (transactionHash === null) {
      throw new Error(
        `${LOG_PREFIX} - Transaction does not have a transaction hash, there was a problem`,
      );
    }

    Logger.log(LOG_PREFIX, 'Returning tx hash', transactionHash);

    return { transactionHash };
  } catch (error) {
    Logger.log(LOG_PREFIX, 'publish hook error', error);
    Logger.error(error, '');

    // TODO
    // Handle this error "'[MetaMask DEBUG]:', 'STX - publish hook Error', [Error: Fetch error:{\"status\":400,\"balanceNeededWei\":46537225590111300,\"currentBalanceWei\":41178644117206340,\"error\":\"not_enough_funds\",\"errorDetails\":\"'Not enough funds. Balance is only 41178644117206340 wei and we need 46537225590111300 wei at the very least.'\"}]"

    throw error;
  } finally {
    try {
      // This removes the loading spinner, does not close modal
      if (shouldEndFlow && smartTransactionStatusApprovalId) {
        approvalController.endFlow({
          id: smartTransactionStatusApprovalId,
        });
        Logger.log(
          LOG_PREFIX,
          'Ended approval flow',
          smartTransactionStatusApprovalId,
        );
      }
    } catch (e) {
      Logger.log(LOG_PREFIX, 'publish hook error 2', e);
    }
  }
}
