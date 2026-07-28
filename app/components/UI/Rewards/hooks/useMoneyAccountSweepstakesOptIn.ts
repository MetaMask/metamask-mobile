import { useCallback, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectCampaignParticipantStatuses } from '../../../../reducers/rewards/selectors';
import { setCampaignParticipantStatus } from '../../../../reducers/rewards';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesBinding } from './useMoneyAccountSweepstakesBinding';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';

export interface MoneyAccountSweepstakesOptInResult {
  success: boolean;
  reason?: 'binding-conflict';
}

export interface UseMoneyAccountSweepstakesOptInResult {
  ensureOptedIn: () => Promise<MoneyAccountSweepstakesOptInResult>;
  isOptingIn: boolean;
}

/**
 * Opt the user into every non-ended Money Account Sweepstakes campaign they
 * have not yet opted into (active first, then upcoming) via a single batched
 * controller call that defers cache invalidation and campaignOptedIn until
 * all POSTs complete.
 *
 * Binding is asserted first: a 409 conflict blocks opt-in. Missing Money
 * Account address is non-fatal (binding is re-asserted later).
 */
export function useMoneyAccountSweepstakesOptIn(): UseMoneyAccountSweepstakesOptInResult {
  const dispatch = useDispatch();
  const series = useMoneyAccountSweepstakesSeries();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const statuses = useSelector(selectCampaignParticipantStatuses);
  const { ensureBound } = useMoneyAccountSweepstakesBinding();
  const [isOptingIn, setIsOptingIn] = useState(false);

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

  const ensureOptedIn =
    useCallback(async (): Promise<MoneyAccountSweepstakesOptInResult> => {
      if (!subscriptionId) {
        return { success: false };
      }

      const bindingResult = await ensureBound();
      if (bindingResult === 'conflict') {
        return { success: false, reason: 'binding-conflict' };
      }

      const targets = series.campaigns
        .filter((campaign) => {
          const status = getCampaignStatus(campaign);
          return status === 'active' || status === 'upcoming';
        })
        .filter((campaign) => !optedInByCampaignId[campaign.id])
        .sort((a, b) => {
          const aActive = getCampaignStatus(a) === 'active' ? 0 : 1;
          const bActive = getCampaignStatus(b) === 'active' ? 0 : 1;
          if (aActive !== bActive) {
            return aActive - bActive;
          }
          return (
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
          );
        });

      if (targets.length === 0) {
        return { success: true };
      }

      setIsOptingIn(true);
      try {
        const results = await Engine.controllerMessenger.call(
          'RewardsController:optInToCampaigns',
          targets.map((campaign) => campaign.id),
          subscriptionId,
        );

        let allOptedIn = true;
        for (const campaign of targets) {
          const status = results[campaign.id];
          if (status) {
            dispatch(
              setCampaignParticipantStatus({
                subscriptionId,
                campaignId: campaign.id,
                status,
              }),
            );
          }
          if (!status?.optedIn) {
            allOptedIn = false;
          }
        }
        return { success: allOptedIn };
      } catch {
        return { success: false };
      } finally {
        setIsOptingIn(false);
      }
    }, [
      series.campaigns,
      optedInByCampaignId,
      subscriptionId,
      dispatch,
      ensureBound,
    ]);

  return {
    ensureOptedIn,
    isOptingIn,
  };
}

export default useMoneyAccountSweepstakesOptIn;
