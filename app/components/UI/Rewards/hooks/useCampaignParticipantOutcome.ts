import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatus } from '../../../../reducers/rewards/selectors';
import type { BaseCampaignParticipantOutcomeDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface UseCampaignParticipantOutcomeResult<
  T extends BaseCampaignParticipantOutcomeDto,
> {
  outcome: T | null;
  isLoading: boolean;
  hasError: boolean;
}

export interface CampaignOutcomeFetchConfig {
  messengerAction: string;
}

export function useCampaignParticipantOutcome<
  T extends BaseCampaignParticipantOutcomeDto,
>(
  campaignId: string | undefined,
  config: CampaignOutcomeFetchConfig,
): UseCampaignParticipantOutcomeResult<T> {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isOptedIn =
    useSelector(selectCampaignParticipantStatus(subscriptionId, campaignId))
      ?.optedIn === true;
  const [outcome, setOutcome] = useState<T | null>(null);
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
        config.messengerAction as Parameters<
          typeof Engine.controllerMessenger.call
        >[0],
        campaignId,
        subscriptionId,
      );
      setOutcome(result as T);
    } catch {
      setOutcome(null);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, subscriptionId, isOptedIn, config.messengerAction]);

  useEffect(() => {
    fetchOutcome();
  }, [fetchOutcome]);

  return { outcome, isLoading, hasError };
}

export default useCampaignParticipantOutcome;
