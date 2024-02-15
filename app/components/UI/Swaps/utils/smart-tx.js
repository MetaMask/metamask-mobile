import Logger from '../../../../util/Logger';
import { decimalToHex } from '../../../../util/conversions';

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
  } = request;

  Logger.log('STX - Executing publish hook', transactionMeta);

  const { chainId, transaction: txParams } = transactionMeta;

  if (!isSmartTransaction) {
    Logger.log('STX - Skipping hook as not enabled for chain', chainId);

    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
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

    Logger.log('STX - Received hash', transactionHash);

    return { transactionHash };
  } catch (error) {
    Logger.log('STX - publish hook Error', error);
    Logger.error(error);
    // Will cause TransactionController to publish to the RPC provider as normal.
    return { transactionHash: undefined };
  }
}
