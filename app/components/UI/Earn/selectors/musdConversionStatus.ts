import { createSelector } from 'reselect';
import {
  TransactionMeta,
  TransactionStatus,
  TransactionType,
} from '@metamask/transaction-controller';
import { selectTransactions } from '../../../../selectors/transactionController';

interface ConversionStatusInfo {
  txId: string;
  status: TransactionStatus;
  /**
   * True when the conversion is in-flight (not yet in a terminal state).
   * Used to drive loading UI and disable actions.
   */
  isPending: boolean;
  isConfirmed: boolean;
  isFailed: boolean;
}

/**
 * UI status for a token row in the Quick Convert list.
 */
export type ConversionUIStatus = 'idle' | 'pending' | 'confirmed' | 'failed';

/**
 * Transaction statuses that indicate an in-flight conversion.
 */
const IN_FLIGHT_STATUSES: TransactionStatus[] = [
  TransactionStatus.unapproved,
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
 * Selects in-flight mUSD conversions (for loading states).
 * These are conversions that have been submitted/approved and not yet terminal.
 */
const selectInFlightMusdConversions = createSelector(
  [selectMusdConversions],
  (conversions): TransactionMeta[] =>
    conversions.filter((tx) =>
      IN_FLIGHT_STATUSES.includes(tx.status as TransactionStatus),
    ),
);

/**
 * True when any in-flight mUSD conversion exists.
 * Used to globally disable quick-convert actions.
 */
export const selectHasInFlightMusdConversion = createSelector(
  [selectInFlightMusdConversions],
  (inFlight): boolean => inFlight.length > 0,
);

/**
 * Creates a composite key from token address and chain ID.
 * Used to uniquely identify a token on a specific chain.
 */
export const createTokenChainKey = (
  tokenAddress: string,
  chainId: string,
): string => `${tokenAddress.toLowerCase()}-${chainId.toLowerCase()}`;

/**
 * Selects all mUSD conversion statuses as a map.
 * Key is "tokenAddress-chainId" to handle same token on different chains.
 * Important:Only includes the most recent conversion for each token + chain combination.
 *
 * Useful for efficiently rendering status indicators on a list of tokens.
 */
export const selectMusdConversionStatuses = createSelector(
  [selectMusdConversions],
  (conversions): Record<string, ConversionStatusInfo> => {
    const statusMap: Record<string, ConversionStatusInfo> = {};
    const latestTimeByKey: Record<string, number> = {};

    for (const tx of conversions) {
      const tokenAddress = tx.metamaskPay?.tokenAddress?.toLowerCase();
      const chainId = tx.metamaskPay?.chainId;

      // Skip if missing required data
      if (!tokenAddress || !chainId) {
        continue;
      }

      // Key includes BOTH address AND chainId to handle same token on different chains
      const key = createTokenChainKey(tokenAddress, chainId);
      const txTime = tx.time ?? 0;
      const existingTime = latestTimeByKey[key];

      if (existingTime !== undefined && existingTime >= txTime) {
        continue;
      }

      latestTimeByKey[key] = txTime;

      const status = tx.status as TransactionStatus;

      statusMap[key] = {
        txId: tx.id,
        status,
        isPending: IN_FLIGHT_STATUSES.includes(status),
        isConfirmed: status === TransactionStatus.confirmed,
        isFailed: status === TransactionStatus.failed,
      };
    }

    return statusMap;
  },
);
