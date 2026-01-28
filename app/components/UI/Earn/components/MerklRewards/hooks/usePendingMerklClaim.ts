import { useMemo, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { TransactionStatus } from '@metamask/transaction-controller';
import { selectTransactions } from '../../../../../../selectors/transactionController';
import { MERKL_CLAIM_ORIGIN } from '../constants';

/**
 * Transaction statuses that indicate a claim is "in flight"
 * - approved: User confirmed in wallet, waiting for submission
 * - signed: Transaction signed, waiting for broadcast
 * - submitted: Transaction submitted to network, waiting for confirmation
 */
const IN_FLIGHT_STATUSES = [
  TransactionStatus.approved,
  TransactionStatus.signed,
  TransactionStatus.submitted,
];

interface UsePendingMerklClaimOptions {
  onClaimConfirmed?: () => void;
}

/**
 * Hook to check if there's a pending Merkl claim transaction in flight.
 *
 * This is used to show a loading state on the claim button when the user
 * navigates back to the asset details page while a claim transaction is
 * still being processed.
 *
 * @param options.onClaimConfirmed - Optional callback fired when a pending claim is confirmed
 * @returns hasPendingClaim - true if there's an in-flight Merkl claim transaction
 */
export const usePendingMerklClaim = (
  options: UsePendingMerklClaimOptions = {},
) => {
  const { onClaimConfirmed } = options;
  const transactions = useSelector(selectTransactions);

  // Track the IDs of pending claims we've seen
  const pendingClaimIdsRef = useRef<Set<string>>(new Set());

  const hasPendingClaim = useMemo(
    () =>
      transactions.some(
        (tx) =>
          tx.origin === MERKL_CLAIM_ORIGIN &&
          IN_FLIGHT_STATUSES.includes(tx.status),
      ),
    [transactions],
  );

  // Stable callback ref to avoid effect re-running
  const onClaimConfirmedRef = useRef(onClaimConfirmed);
  useEffect(() => {
    onClaimConfirmedRef.current = onClaimConfirmed;
  }, [onClaimConfirmed]);

  // Detect when a pending claim becomes confirmed
  useEffect(() => {
    const merklClaimTxs = transactions.filter(
      (tx) => tx.origin === MERKL_CLAIM_ORIGIN,
    );

    // Get current pending claim IDs
    const currentPendingIds = new Set(
      merklClaimTxs
        .filter((tx) => IN_FLIGHT_STATUSES.includes(tx.status))
        .map((tx) => tx.id),
    );

    // Check if any previously pending claims are now confirmed
    const confirmedIds = merklClaimTxs
      .filter(
        (tx) =>
          tx.status === TransactionStatus.confirmed ||
          tx.status === TransactionStatus.dropped,
      )
      .map((tx) => tx.id);

    const hadPendingThatConfirmed = confirmedIds.some((id) =>
      pendingClaimIdsRef.current.has(id),
    );

    // Update our tracking set
    pendingClaimIdsRef.current = currentPendingIds;

    // Fire callback if a pending claim was confirmed
    if (hadPendingThatConfirmed && onClaimConfirmedRef.current) {
      onClaimConfirmedRef.current();
    }
  }, [transactions]);

  return { hasPendingClaim };
};
