import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignsRewardsEnabledFlag } from '../../../../selectors/featureFlagController/rewards';
import type { CampaignParticipantStatusDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseGetCampaignParticipantStatusResult {
  /** Participant status, or null when flag is disabled / not yet loaded */
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
 * Returns null status and skips the API call when the campaigns feature flag is off.
 * Results are cached for 5 minutes by the RewardsController.
 */
export const useGetCampaignParticipantStatus = (
  campaignId: string | undefined,
): UseGetCampaignParticipantStatusResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isCampaignsEnabled = useSelector(selectCampaignsRewardsEnabledFlag);
  const [status, setStatus] = useState<CampaignParticipantStatusDto | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchStatus = useCallback(async (): Promise<void> => {
    if (!isCampaignsEnabled || !subscriptionId || !campaignId) {
      setStatus(null);
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
      setStatus(result);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId, isCampaignsEnabled, campaignId]);

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
