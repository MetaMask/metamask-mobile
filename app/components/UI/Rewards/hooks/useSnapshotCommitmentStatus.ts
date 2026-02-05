import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import type { CommitmentStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';

interface UseSnapshotCommitmentStatusReturn {
  /** The commitment status data */
  commitmentStatus: CommitmentStatusDto | null;
  /** Whether the commitment status is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Function to refetch the commitment status */
  refetch: () => Promise<void>;
}

/**
 * Custom hook to fetch the user's commitment status for a snapshot.
 * Includes existing commitments and receiving address.
 * @param snapshotId - The ID of the snapshot to get commitment status for
 */
export const useSnapshotCommitmentStatus = (
  snapshotId: string,
): UseSnapshotCommitmentStatusReturn => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [commitmentStatus, setCommitmentStatus] =
    useState<CommitmentStatusDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLoadingRef = useRef(false);

  const refetch = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !snapshotId) {
      setCommitmentStatus(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    if (isLoadingRef.current) {
      return;
    }

    try {
      isLoadingRef.current = true;
      setIsLoading(true);
      setError(null);

      const status = await Engine.controllerMessenger.call(
        'RewardsController:getSnapshotCommitmentStatus',
        snapshotId,
        subscriptionId,
      );

      setCommitmentStatus(status);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to fetch commitment status',
      );
      console.error('Error fetching snapshot commitment status', err);
    } finally {
      isLoadingRef.current = false;
      setIsLoading(false);
    }
  }, [snapshotId, subscriptionId]);

  return {
    commitmentStatus,
    isLoading,
    error,
    refetch,
  };
};
