import { ORIGIN_METAMASK } from '@metamask/approval-controller';
import Logger from '../../../../util/Logger';
import { decimalToHex } from '../../../../util/conversions';
import { ApprovalTypes } from '../../../../core/RPCMethods/RPCMethodMiddleware';

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

    if (isDapp) {
      approvalController.addAndShowApprovalRequest({
        id: smartTransactionStatusApprovalId,
        origin,
        type: ApprovalTypes.SMART_TRANSACTION_STATUS,
        // requestState gets passed to app/components/Views/confirmations/components/Approval/TemplateConfirmation/Templates/SmartTransactionStatus.ts
        requestState: {
          smartTransaction: {
            status: 'pending',
            creationTime: Date.now(),
          },
        },
      });
      Logger.log('STX - Added approval', smartTransactionStatusApprovalId);
    }

    smartTransactionsController.eventEmitter.on(`${uuid}:status`, (status) => {
      Logger.log('STX - Status update', status);
    });

    const transactionHash = await new Promise((resolve) => {
      smartTransactionsController.eventEmitter.once(
        `${uuid}:transaction-hash`,
        (hash) => {
          resolve(hash);
        },
      );
    });

    // TODO this is from Ext but don't see the event in stx controller repo
    // (smartTransactionsController as any).eventEmitter.on(
    //   `${uuid}:smartTransaction`,
    //   async (smartTransaction: any) => {
    //     log.info('Smart Transaction: ', smartTransaction);
    //     const { status, statusMetadata } = smartTransaction;
    //     if (!status || status === 'pending') {
    //       return;
    //     }

    //     if (isDapp) {
    //       await controllerMessenger.call(
    //         'ApprovalController:updateRequestState',
    //         {
    //           id: smartTransactionStatusApprovalId,
    //           requestState: {
    //             smartTransaction,
    //           },
    //         },
    //       );
    //     }

    //     if (statusMetadata?.minedHash) {
    //       log.info(
    //         'Smart Transaction - Received tx hash: ',
    //         statusMetadata?.minedHash,
    //       );
    //       transactionHash = statusMetadata.minedHash;
    //     } else {
    //       transactionHash = null;
    //     }
    //   },
    // );

    // const waitForTransactionHashChange = () => {
    //   return new Promise((resolve) => {
    //     const checkVariable = () => {
    //       if (transactionHash === undefined) {
    //         setTimeout(checkVariable, 100); // Check again after 100ms
    //       } else {
    //         resolve(`transactionHash has changed to: ${transactionHash}`);
    //       }
    //     };

    //     checkVariable();
    //   });
    // };
    // await waitForTransactionHashChange();
    // if (transactionHash === null) {
    //   throw new Error(
    //     'Transaction does not have a transaction hash, there was a problem',
    //   );
    // }
    // return { transactionHash };

    Logger.log('STX - Received hash', transactionHash);

    // TODO STX remove this, just testing the status page
    if (isDapp) {
      approvalController.updateRequestState({
        id: smartTransactionStatusApprovalId,
        requestState: {
          smartTransaction: {
            status: 'success',
            creationTime: Date.now(),
            transactionHash,
          },
        },
      });
      Logger.log('STX - Updated approval', smartTransactionStatusApprovalId);
    }

    return { transactionHash };
  } catch (error) {
    Logger.log('STX - publish hook Error', error);
    Logger.error(error);

    // Will cause TransactionController to publish to the RPC provider as normal.
    // return { transactionHash: undefined };

    // TODO throw error for now
    throw error;
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
