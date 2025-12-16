import { createSelector } from 'reselect';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { Hex } from '@metamask/utils';
import { selectTransactions } from '../../../../selectors/transactionController';
import { RootState } from '../../../../reducers';

export interface ConversionStatusInfo {
  txId: string;
  status: TransactionStatus;
  isPending: boolean;
  isConfirmed: boolean;
  isFailed: boolean;
}

/**
 * UI status for a token row in the Quick Convert list.
 */
export type ConversionUIStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

/**
 * Pending transaction statuses that indicate an in-flight conversion.
 */
const PENDING_STATUSES: TransactionStatus[] = [
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
];

/**
 * Selects all mUSD conversion transactions.
 */
export const selectMusdConversions = createSelector(
  [selectTransactions],
  (transactions): TransactionMeta[] =>
    transactions.filter((tx) => tx.type === TransactionType.musdConversion),
);

/**
 * Selects pending mUSD conversions (for loading states).
 * These are transactions that are in-flight and not yet confirmed.
 */
export const selectPendingMusdConversions = createSelector(
  [selectMusdConversions],
  (conversions): TransactionMeta[] =>
    conversions.filter((tx) =>
      PENDING_STATUSES.includes(tx.status as TransactionStatus),
    ),
);

/**
 * Selects completed mUSD conversions.
 */
export const selectCompletedMusdConversions = createSelector(
  [selectMusdConversions],
  (conversions): TransactionMeta[] =>
    conversions.filter((tx) => tx.status === TransactionStatus.confirmed),
);

/**
 * Creates a composite key from token address and chain ID.
 * Used to uniquely identify a token on a specific chain.
 */
export const createTokenChainKey = (
  tokenAddress: string,
  chainId: string,
): string => `${tokenAddress.toLowerCase()}-${chainId}`;

/**
 * Selects conversion status for a specific payment token address and chain ID.
 * Returns the most recent conversion status for the given token + chain combination.
 *
 * @param state - Redux state
 * @param tokenAddress - The payment token address
 * @param chainId - The chain ID where the token exists
 */
// TODO: Reminder that this list can grow indefinitely and we need to be careful about performance.
export const selectConversionStatusByPaymentToken = createSelector(
  [
    selectMusdConversions,
    (_: RootState, tokenAddress: string, chainId: Hex) => ({
      tokenAddress: tokenAddress.toLowerCase(),
      chainId,
    }),
  ],
  (conversions, { tokenAddress, chainId }): ConversionStatusInfo | null => {
    // Sort by time descending to get most recent first
    const sortedConversions = [...conversions].sort(
      (a, b) => (b.time ?? 0) - (a.time ?? 0),
    );

    // Find the most recent conversion for this token + chain combination
    const conversion = sortedConversions.find(
      (tx) =>
        tx.metamaskPay?.tokenAddress?.toLowerCase() === tokenAddress &&
        tx.metamaskPay?.chainId === chainId,
    );

    if (!conversion) {
      return null;
    }

    const status = conversion.status as TransactionStatus;

    return {
      txId: conversion.id,
      status,
      isPending: PENDING_STATUSES.includes(status),
      isConfirmed: status === TransactionStatus.confirmed,
      isFailed: status === TransactionStatus.failed,
    };
  },
);

/**
 * Selects all mUSD conversion statuses as a map.
 * Key is "tokenAddress-chainId" to handle same token on different chains.
 * Only includes the most recent conversion for each token + chain combination.
 *
 * Useful for efficiently rendering status indicators on a list of tokens.
 */
// TODO: Reminder to circle back in case only including the most recent conversion for each token + chain combination is not enough.
export const selectMusdConversionStatuses = createSelector(
  [selectMusdConversions],
  (conversions): Record<string, ConversionStatusInfo> => {
    const statusMap: Record<string, ConversionStatusInfo> = {};

    // Sort by time descending to get most recent first
    const sorted = [...conversions].sort(
      (a, b) => (b.time ?? 0) - (a.time ?? 0),
    );

    for (const tx of sorted) {
      const tokenAddress = tx.metamaskPay?.tokenAddress?.toLowerCase();
      const chainId = tx.metamaskPay?.chainId;

      // Skip if missing required data
      if (!tokenAddress || !chainId) {
        continue;
      }

      // Key includes BOTH address AND chainId to handle same token on different chains
      const key = createTokenChainKey(tokenAddress, chainId);

      // Only store the first (most recent) conversion for each key
      if (!statusMap[key]) {
        const status = tx.status as TransactionStatus;

        statusMap[key] = {
          txId: tx.id,
          status,
          isPending: PENDING_STATUSES.includes(status),
          isConfirmed: status === TransactionStatus.confirmed,
          isFailed: status === TransactionStatus.failed,
        };
      }
    }

    return statusMap;
  },
);

/**
 * Derives the UI status for a token row from conversion status info.
 */
export const deriveConversionUIStatus = (
  statusInfo: ConversionStatusInfo | null,
): ConversionUIStatus => {
  if (!statusInfo) {
    return 'idle';
  }
  if (statusInfo.isPending) {
    return 'pending';
  }
  if (statusInfo.isConfirmed) {
    return 'confirmed';
  }
  if (statusInfo.isFailed) {
    return 'failed';
  }
  return 'idle';
};
