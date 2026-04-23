import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectOndoCampaignParticipantOutcomeById } from '../../../../reducers/rewards/selectors';
import { setOndoCampaignParticipantOutcome } from '../../../../reducers/rewards';
import type { OndoGmCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseOndoCampaignParticipantOutcomeResult {
  outcome: OndoGmCampaignParticipantOutcomeDto | null;
  isLoading: boolean;
  hasError: boolean;
}

export function useOndoCampaignParticipantOutcome(
  campaignId: string | undefined,
): UseOndoCampaignParticipantOutcomeResult {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const outcome = useSelector(
    selectOndoCampaignParticipantOutcomeById(
      subscriptionId ?? undefined,
      campaignId,
    ),
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const fetchOutcome = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !campaignId) {
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
      if (result) {
        dispatch(
          setOndoCampaignParticipantOutcome({
            key: `${subscriptionId}:${campaignId}`,
            outcome: result,
          }),
        );
      }
    } catch {
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, campaignId, subscriptionId]);

  useEffect(() => {
    fetchOutcome();
  }, [fetchOutcome]);

  return { outcome, isLoading, hasError };
}

export default useOndoCampaignParticipantOutcome;
