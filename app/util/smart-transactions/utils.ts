import { TransactionMeta } from '@metamask/transaction-controller';
import { Hex } from './smart-publish-hook';
import TransactionTypes from '../../core/TransactionTypes';
import {
  getIsSwapApproveTransaction,
  getIsInSwapFlowTransaction,
  getIsSwapTransaction,
  getIsNativeTokenTransferred,
} from '../transactions';

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
// If ERC20 if from token in swap and requires additional allowance, Swap txs are the 2nd in the swap flow, so we don't want to show another status page for that
export const getShouldStartFlow = (
  isDapp: boolean,
  isSend: boolean,
  isSwapApproveTx: boolean,
  hasPendingApprovalForSwapApproveTx: boolean,
): boolean =>
  isDapp || isSend || isSwapApproveTx || !hasPendingApprovalForSwapApproveTx;

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
