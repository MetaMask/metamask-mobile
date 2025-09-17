import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import type { ClaimRewardDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseClaimRewardResult {
  /**
   * Function to initiate the claim reward process
   */
  claimReward: (rewardId: string, dto?: ClaimRewardDto) => Promise<void>;

  /**
   * Loading state for claim reward operation
   */
  isClaimingReward: boolean;

  /**
   * Error message from claim reward process
   */
  claimRewardError?: string;

  /**
   * Function to clear the claim reward error
   */
  clearClaimRewardError: () => void;
}

export const useClaimReward = (): UseClaimRewardResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [claimRewardError, setClaimRewardError] = useState<string | undefined>(
    undefined,
  );
  const [isClaimingReward, setIsClaimingReward] = useState<boolean>(false);

  const handleClaimReward = useCallback(
    async (rewardId: string, dto: ClaimRewardDto = {}) => {
      if (!subscriptionId) {
        setClaimRewardError('No subscription found. Please try again.');
        return;
      }

      try {
        setIsClaimingReward(true);
        setClaimRewardError(undefined);

        // Call the RewardsController method directly since the action handler is not registered yet
        await Engine.controllerMessenger.call(
          'RewardsController:claimReward',
          rewardId,
          subscriptionId,
          dto,
        );
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);

        setClaimRewardError(errorMessage);
        throw error;
      } finally {
        setIsClaimingReward(false);
      }
    },
    [subscriptionId],
  );

  const clearClaimRewardError = useCallback(
    () => setClaimRewardError(undefined),
    [],
  );

  return {
    claimReward: handleClaimReward,
    isClaimingReward,
    claimRewardError,
    clearClaimRewardError,
  };
};

export default useClaimReward;
