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
   * Single source of truth for pending state.
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
 * Only includes the most recent conversion for each token + chain combination.
 * Pending is relay-aware: a conversion is no longer pending once a newer
 * confirmed relay deposit exists for the same sender address.
 *
 * Useful for efficiently rendering status indicators on a list of tokens.
 */
export const selectMusdConversionStatuses = createSelector(
  [selectTransactions],
  (transactions): Record<string, ConversionStatusInfo> => {
    const conversions = transactions.filter(
      (tx) => tx.type === TransactionType.musdConversion,
    );
    const statusMap: Record<string, ConversionStatusInfo> = {};
    const latestTimeByKey: Record<string, number> = {};
    const latestConfirmedRelayTimeByFromAddress: Record<string, number> = {};

    for (const tx of transactions) {
      if (tx.type !== TransactionType.relayDeposit) {
        continue;
      }

      if (tx.status !== TransactionStatus.confirmed) {
        continue;
      }

      const fromAddress = tx.txParams?.from?.toLowerCase();
      if (!fromAddress) {
        continue;
      }

      const relayConfirmedTime = tx.time ?? 0;
      const existingRelayConfirmedTime =
        latestConfirmedRelayTimeByFromAddress[fromAddress];

      if (
        existingRelayConfirmedTime === undefined ||
        relayConfirmedTime > existingRelayConfirmedTime
      ) {
        latestConfirmedRelayTimeByFromAddress[fromAddress] = relayConfirmedTime;
      }
    }

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
      const transactionFromAddress = tx.txParams?.from?.toLowerCase();
      const latestConfirmedRelayTime = transactionFromAddress
        ? latestConfirmedRelayTimeByFromAddress[transactionFromAddress]
        : undefined;
      const relayConfirmedAfterConversionStarted =
        latestConfirmedRelayTime !== undefined &&
        latestConfirmedRelayTime >= txTime;
      const isPending =
        IN_FLIGHT_STATUSES.includes(status) &&
        !relayConfirmedAfterConversionStarted;

      statusMap[key] = {
        txId: tx.id,
        status,
        isPending,
        isConfirmed: status === TransactionStatus.confirmed,
        isFailed: status === TransactionStatus.failed,
      };
    }

    return statusMap;
  },
);

/**
 * True when any conversion is pending.
 * Uses the same relay-aware pending logic as selectMusdConversionStatuses.
 */
export const selectHasPendingMusdConversion = createSelector(
  [selectMusdConversionStatuses],
  (conversionStatusesByTokenChainKey): boolean =>
    Object.values(conversionStatusesByTokenChainKey).some(
      (conversionStatus) => conversionStatus.isPending,
    ),
);
