import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatuses } from '../../../../reducers/rewards/selectors';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export interface UseMoneyAccountSweepstakesParticipationResult {
  optedInAny: boolean;
  optedInByCampaignId: Record<string, boolean>;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

/**
 * Aggregate opt-in status across all Money Account Sweepstakes campaigns in the series.
 * A user is a participant if opted into any campaign in the series.
 */
export function useMoneyAccountSweepstakesParticipation(
  enabled: boolean = true,
): UseMoneyAccountSweepstakesParticipationResult {
  const dispatch = useDispatch();
  const series = useMoneyAccountSweepstakesSeries();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const statuses = useSelector(selectCampaignParticipantStatuses);
  const [isLoading, setIsLoading] = useState(false);

  const campaignIdsKey = series.campaigns.map((c) => c.id).join(',');

  const refetch = useCallback(async (): Promise<void> => {
    if (!enabled || !subscriptionId || series.campaigns.length === 0) {
      return;
    }

    setIsLoading(true);
    try {
      await Promise.all(
        series.campaigns.map(async (campaign) => {
          const result = await Engine.controllerMessenger.call(
            'RewardsController:getCampaignParticipantStatus',
            campaign.id,
            subscriptionId,
          );
          dispatch(
            setCampaignParticipantStatus({
              subscriptionId,
              campaignId: campaign.id,
              status: result,
            }),
          );
        }),
      );
    } finally {
      setIsLoading(false);
    }
    // campaignIdsKey captures series.campaigns identity without unstable array ref
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, subscriptionId, campaignIdsKey, dispatch]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const campaignOptedInEvents = useMemo(
    () => ['RewardsController:campaignOptedIn'] as const,
    [],
  );
  useInvalidateByRewardEvents(campaignOptedInEvents, refetch);

  const optedInByCampaignId = useMemo(() => {
    const map: Record<string, boolean> = {};
    if (!subscriptionId) {
      return map;
    }
    for (const campaign of series.campaigns) {
      const key = `${subscriptionId}:${campaign.id}`;
      map[campaign.id] = statuses[key]?.optedIn === true;
    }
    return map;
  }, [series.campaigns, subscriptionId, statuses]);

  const optedInAny = useMemo(
    () => Object.values(optedInByCampaignId).some(Boolean),
    [optedInByCampaignId],
  );

  return {
    optedInAny,
    optedInByCampaignId,
    isLoading,
    refetch,
  };
}

export default useMoneyAccountSweepstakesParticipation;
