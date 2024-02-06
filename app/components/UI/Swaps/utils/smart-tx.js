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

  Logger.log('STX', process.env.DEBUG);

  const signedTransactions =
    await TransactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
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
  await SmartTransactionsController.submitSignedTransactions({
    signedTransactions,
    signedCanceledTransactions,
    txParams: unsignedTransaction,
  });
  Logger.log(
    'STX signAndSendSmartTransaction SmartTransactionsController.submitSignedTransactions end',
  );
};
