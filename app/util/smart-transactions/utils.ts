/* eslint-disable import/prefer-default-export */
import { Fee } from '@metamask/smart-transactions-controller/dist/types';
import {
  TransactionController,
  TransactionMeta,
} from '@metamask/transaction-controller';
import { decimalToHex } from '../conversions';
import { Hex, TransactionParams } from './smart-tx';
import TransactionTypes from '../../core/TransactionTypes';
import {
  getIsSwapApproveTransaction,
  getIsInSwapFlowTransaction,
  getIsSwapTransaction,
  getIsNativeTokenTransferred,
} from '../transactions';

// It has to be 21000 for cancel transactions, otherwise the API would reject it.
const CANCEL_GAS = 21000;

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

  const signedTransactions =
    await transactionController.approveTransactionsWithSameNonce(
      unsignedTransactionsWithFees,
      { hasNonce: true },
    );

  return signedTransactions;
};

export const getTxType = (transactionMeta: TransactionMeta, chainId: Hex) => {
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

  return {
    isDapp,
    isSend,
    isInSwapFlow,
    isSwapApproveTx,
    isSwapTransaction,
    isNativeTokenTransferred,
  };
};

// Status modal start, update, and close conditions
// Swap txs are the 2nd in the swap flow, so we don't want to show another status page for that
export const getShouldStartFlow = (
  isDapp: boolean,
  isSend: boolean,
  isSwapApproveTx: boolean,
  isSwapTransaction: boolean,
  isNativeTokenTransferred: boolean,
): boolean =>
  isDapp ||
  isSend ||
  isSwapApproveTx ||
  (isSwapTransaction && isNativeTokenTransferred);

export const getShouldUpdateFlow = (
  isDapp: boolean,
  isSend: boolean,
  isSwapTransaction: boolean,
): boolean => isDapp || isSend || isSwapTransaction;

export const getShouldEndFlow = (
  isDapp: boolean,
  isSend: boolean,
  isSwapTransaction: boolean,
): boolean => isDapp || isSend || isSwapTransaction;
