import { Fee } from '@metamask/smart-transactions-controller/dist/types';
import { TransactionController } from '@metamask/transaction-controller';
import Logger from '../Logger';
import { decimalToHex } from '../conversions';

// It has to be 21000 for cancel transactions, otherwise the API would reject it.
const CANCEL_GAS = 21000;

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
        ? decimalToHex(CANCEL_GAS).toString()
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
