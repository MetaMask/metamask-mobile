import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatus } from '../../../../reducers/rewards/selectors';
import type { OndoGmCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseOndoCampaignParticipantOutcomeResult {
  outcome: OndoGmCampaignParticipantOutcomeDto | null;
  isLoading: boolean;
  hasError: boolean;
}

export function useOndoCampaignParticipantOutcome(
  campaignId: string | undefined,
): UseOndoCampaignParticipantOutcomeResult {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn =
    useSelector(selectCampaignParticipantStatus(subscriptionId, campaignId))
      ?.optedIn === true;
  const [outcome, setOutcome] =
    useState<OndoGmCampaignParticipantOutcomeDto | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchOutcome = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId || !isOptedIn) {
      setOutcome(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    try {
      setIsLoading(true);
      setHasError(false);
      const result = await Engine.controllerMessenger.call(
        'RewardsController:getOndoCampaignParticipantOutcome',
        campaignId,
        subscriptionId,
      );
      setOutcome(result);
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, subscriptionId, isOptedIn]);

  useEffect(() => {
    fetchOutcome();
  }, [fetchOutcome]);

  return { outcome, isLoading, hasError };
}

export default useOndoCampaignParticipantOutcome;
