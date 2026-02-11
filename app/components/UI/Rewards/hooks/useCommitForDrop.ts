import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import type { CommitDropPointsResponseDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { setRecentDropCommit } from '../../../../reducers/rewards';

export interface UseCommitForDropResult {
  /**
   * Function to commit points to a drop
   * @param dropId - The drop ID to commit points to
   * @param points - The number of points to commit
   * @param accountId - Optional account ID (required for first commitment)
   * @returns The commit response with commitment details and updated leaderboard position
   */
  commitForDrop: (
    dropId: string,
    points: number,
    accountId?: string,
  ) => Promise<CommitDropPointsResponseDto | null>;

  /**
   * Loading state for commit operation
   */
  isCommitting: boolean;

  /**
   * Error message from commit process
   */
  commitError: string | null;

  /**
   * Function to clear the commit error
   */
  clearCommitError: () => void;
}

/**
 * Custom hook to commit points to a drop.
 * Follows the pattern of useClaimReward for POST operations.
 * Stores the commit response in Redux state to handle backend caching delays.
 */
export const useCommitForDrop = (): UseCommitForDropResult => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  const handleCommitForDrop = useCallback(
    async (
      dropId: string,
      points: number,
      accountId?: string,
    ): Promise<CommitDropPointsResponseDto | null> => {
      if (!subscriptionId) {
        setCommitError('No subscription found. Please try again.');
        return null;
      }

      if (!dropId) {
        setCommitError('Drop ID is required.');
        return null;
      }

      if (points <= 0) {
        setCommitError('Points must be greater than 0.');
        return null;
      }

      try {
        setIsCommitting(true);
        setCommitError(null);

        const response = await Engine.controllerMessenger.call(
          'RewardsController:commitDropPoints',
          dropId,
          points,
          subscriptionId,
          accountId,
        );

        // Store the recent commit in Redux to handle backend caching delays
        dispatch(setRecentDropCommit({ dropId, response }));

        return response;
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);
        setCommitError(errorMessage);
        throw error;
      } finally {
        setIsCommitting(false);
      }
    },
    [dispatch, subscriptionId],
  );

  const clearCommitError = useCallback(() => setCommitError(null), []);

  return {
    commitForDrop: handleCommitForDrop,
    isCommitting,
    commitError,
    clearCommitError,
  };
};

export default useCommitForDrop;
