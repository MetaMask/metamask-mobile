import { ORIGIN_METAMASK } from '@metamask/approval-controller';
import Logger from '../Logger';
import { decimalToHex } from '../conversions';
import { ApprovalTypes } from '../../core/RPCMethods/RPCMethodMiddleware';

export const createSignedTransactions = async (
  unsignedTransaction,
  fees,
  areCancelTransactions,
  TransactionController,
) => {
  const unsignedTransactionsWithFees = fees.map((fee) => {
    const unsignedTransactionWithFees = {
      ...unsignedTransaction,
      maxFeePerGas: decimalToHex(fee.maxFeePerGas),
      maxPriorityFeePerGas: decimalToHex(fee.maxPriorityFeePerGas),
      gas: areCancelTransactions
        ? decimalToHex(21000) // It has to be 21000 for cancel transactions, otherwise the API would reject it.
        : unsignedTransaction.gas,
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
    await TransactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
      { hasNonce: true },
    );

  Logger.log(
    'STX createSignedTransactions signedTransactions',
    signedTransactions,
  );

  return signedTransactions;
};

export const signAndSendSmartTransaction = async (
  SmartTransactionsController,
  unsignedTransaction,
  smartTransactionFees,
  TransactionController,
) => {
  Logger.log('STX signAndSendSmartTransaction signedTransactions start');
  const signedTransactions = await createSignedTransactions(
    unsignedTransaction,
    smartTransactionFees.fees,
    false,
    TransactionController,
  );
  Logger.log(
    'STX signAndSendSmartTransaction signedTransactions end',
    signedTransactions,
  );

  Logger.log(
    'STX signAndSendSmartTransaction signedCanceledTransactions start',
  );
  const signedCanceledTransactions = await createSignedTransactions(
    unsignedTransaction,
    smartTransactionFees.cancelFees,
    true,
    TransactionController,
  );
  Logger.log(
    'STX signAndSendSmartTransaction signedCanceledTransactions end',
    signedCanceledTransactions,
  );

  Logger.log(
    'STX signAndSendSmartTransaction SmartTransactionsController.submitSignedTransactions start',
  );
  const res = await SmartTransactionsController.submitSignedTransactions({
    signedTransactions,
    signedCanceledTransactions,
    txParams: unsignedTransaction,
  });
  Logger.log(
    'STX signAndSendSmartTransaction SmartTransactionsController.submitSignedTransactions end',
    res.uuid,
  );

  return res.uuid;
};

export async function publishHook(request) {
  const {
    transactionMeta,
    smartTransactionsController,
    transactionController,
    isSmartTransaction,
    approvalController,
  } = request;
  Logger.log('STX - Executing publish hook', transactionMeta);

  const { chainId, transaction: txParams, origin } = transactionMeta;

  const isDapp = origin !== ORIGIN_METAMASK;

  if (!isSmartTransaction) {
    Logger.log('STX - Skipping hook as not enabled for chain', chainId);

    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
  }

  let smartTransactionStatusApprovalId;
  if (isDapp) {
    const { id } = approvalController.startFlow(); // this triggers a small loading spinner to pop up at bottom of page
    smartTransactionStatusApprovalId = id;
    Logger.log('STX - Started approval flow', smartTransactionStatusApprovalId);
  }

  let creationTime;

  try {
    Logger.log('STX - Fetching fees', txParams, chainId);
    const feesResponse = await smartTransactionsController.getFees(
      { ...txParams, chainId },
      undefined,
    );

    Logger.log('STX - Retrieved fees', feesResponse);

    const signedTransactions = await createSignedTransactions(
      txParams,
      feesResponse.tradeTxFees?.fees ?? [],
      false,
      transactionController,
    );

    const signedCanceledTransactions = await createSignedTransactions(
      txParams,
      feesResponse.tradeTxFees?.cancelFees || [],
      true,
      transactionController,
    );

    Logger.log('STX - Generated signed transactions', {
      signedTransactions,
      signedCanceledTransactions,
    });

    Logger.log('STX - Submitting signed transactions');

    const response = await smartTransactionsController.submitSignedTransactions(
      {
        signedTransactions,
        signedCanceledTransactions,
        txParams,
        // Patched into controller to skip unnecessary call to confirmExternalTransaction.
        skipConfirm: true,
      },
    );

    const uuid = response?.uuid;

    if (!uuid) {
      throw new Error('No smart transaction UUID');
    }

    Logger.log('STX - Received UUID', uuid);

    creationTime = Date.now();

    if (isDapp) {
      approvalController.addAndShowApprovalRequest({
        id: smartTransactionStatusApprovalId,
        origin,
        type: ApprovalTypes.SMART_TRANSACTION_STATUS,
        // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
        requestState: {
          smartTransaction: {
            status: 'pending',
            creationTime,
          },
        },
      });
      Logger.log('STX - Added approval', smartTransactionStatusApprovalId);
    }

    // status type
    // { cancellationFeeWei: 0,
    //   cancellationReason: 'not_cancelled',
    //   deadlineRatio: 0,
    //   isSettled: false,
    //   minedTx: 'not_mined',
    //   wouldRevertMessage: null,
    //   minedHash: '',
    //   type: 'sentinel' }

    // undefined for init state
    // null for error
    // string for success
    let transactionHash;

    smartTransactionsController.eventEmitter.on(
      // TODO this is from Ext but don't see the event uuid:smartTransaction in stx controller repo yet
      // `${uuid}:smartTransaction`,
      // TODO use uuid:status for now
      `${uuid}:status`,
      // TODO needs uuid:smartTransaction event
      // async (smartTransaction) => {
      async (status) => {
        Logger.log('STX - Status update', status);

        // TODO needs uuid:smartTransaction event
        // if (!status || status === 'pending') {
        //   return;
        // }

        if (status?.isSettled) {
          if (status?.minedHash !== '') {
            // STX has landed on chain, tx is successful
            Logger.log('STX - Received tx hash: ', status?.minedHash);
            transactionHash = status.minedHash;

            if (isDapp) {
              await approvalController.updateRequestState({
                id: smartTransactionStatusApprovalId,
                requestState: {
                  // TODO needs uuid:smartTransaction event
                  // smartTransaction,
                  smartTransaction: {
                    status: 'success',
                    creationTime,
                    transactionHash,
                  },
                },
              });
            }
          } else if (
            status.minedTx === 'cancelled' ||
            status.minedTx === 'unknown'
          ) {
            // minedTx types: not_mined, cancelled, unknown
            // cancelled: STX has exceeded deadline, tx is cancelled, never processed on chain
            // unknown: tx reverted on chain
            transactionHash = null;
          }
        }
      },
    );

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
        'Transaction does not have a transaction hash, there was a problem',
      );
    }

    Logger.log('STX - Received hash', transactionHash);

    return { transactionHash };
  } catch (error) {
    Logger.log('STX - publish hook Error', error);
    Logger.error(error);

    if (isDapp) {
      await approvalController.updateRequestState({
        id: smartTransactionStatusApprovalId,
        requestState: {
          // TODO needs uuid:smartTransaction event
          // smartTransaction,
          smartTransaction: {
            status: 'error',
            creationTime,
          },
        },
      });
    }

    // Will cause TransactionController to publish to the RPC provider as normal.
    // return { transactionHash: undefined };

    // TODO throw error for now
    // throw error;
  } finally {
    if (isDapp) {
      // This removes the loading spinner
      approvalController.endFlow({
        id: smartTransactionStatusApprovalId,
      });
      Logger.log('STX - Ended approval flow', smartTransactionStatusApprovalId);
    }
  }
}
