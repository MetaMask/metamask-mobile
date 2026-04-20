import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatus } from '../../../../reducers/rewards/selectors';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
import type { CampaignParticipantStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetCampaignParticipantStatusResult {
  /** Participant status, or null when not yet loaded */
  status: CampaignParticipantStatusDto | null;
  /** Whether the status is being fetched */
  isLoading: boolean;
  /** Whether there was an error fetching the status */
  hasError: boolean;
  /** Manually re-fetch the status (also invalidates the cache via controller TTL) */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch the campaign participant status for the current subscription.
 * Results are cached for 5 minutes by the RewardsController.
 */
export const useGetCampaignParticipantStatus = (
  campaignId: string | undefined,
): UseGetCampaignParticipantStatusResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const status = useSelector(
    selectCampaignParticipantStatus(subscriptionId, campaignId),
  );
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(
    () => !status && Boolean(subscriptionId) && Boolean(campaignId),
  );
  const [hasError, setHasError] = useState(false);

  const fetchStatus = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId) {
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getCampaignParticipantStatus',
        campaignId,
        subscriptionId,
      );
      dispatch(
        setCampaignParticipantStatus({
          subscriptionId,
          campaignId,
          status: result,
        }),
      );
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, subscriptionId, campaignId]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Refetch whenever a successful opt-in invalidates the cached status
  const campaignOptedInEvents = useMemo(
    () => ['RewardsController:campaignOptedIn'] as const,
    [],
  );
  useInvalidateByRewardEvents(campaignOptedInEvents, fetchStatus);

  return { status, isLoading, hasError, refetch: fetchStatus };
};

export default useGetCampaignParticipantStatus;
