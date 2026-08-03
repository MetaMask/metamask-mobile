import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  selectCampaignParticipantStatuses,
  selectPendingMasSeriesOptIn,
} from '../../../../reducers/rewards/selectors';
import {
  clearPendingMasSeriesOptIn,
  setCampaignParticipantStatus,
  setPendingMasSeriesOptIn,
} from '../../../../reducers/rewards';
import { useMoneyAccountSweepstakesSeries } from './useMoneyAccountSweepstakesSeries';
import { useMoneyAccountSweepstakesBinding } from './useMoneyAccountSweepstakesBinding';
import { getCampaignStatus } from '../components/Campaigns/CampaignTile.utils';
import type { CampaignDto } from '../../../../core/Engine/controllers/rewards-controller/types';

export interface MoneyAccountSweepstakesOptInResult {
  success: boolean;
  reason?: 'binding-conflict';
}

export interface UseMoneyAccountSweepstakesOptInResult {
  ensureOptedIn: () => Promise<MoneyAccountSweepstakesOptInResult>;
  isOptingIn: boolean;
}

function isEligibleSeriesCampaign(campaign: CampaignDto): boolean {
  const status = getCampaignStatus(campaign);
  return status === 'active' || status === 'upcoming';
}

/**
 * Opt the user into every non-ended Money Account Sweepstakes campaign they
 * have not yet opted into (active first, then upcoming) via a single batched
 * controller call. Partial failures do not abort the batch; success means the
 * active week is opted in. Remaining gaps set a Redux pending flag for
 * dashboard-focus resume.
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

  const updatePendingFlag = useCallback(
    (resolvedOptedIn: Record<string, boolean>) => {
      if (!subscriptionId) {
        return;
      }
      const hasPendingEligible = series.campaigns.some(
        (campaign) =>
          isEligibleSeriesCampaign(campaign) && !resolvedOptedIn[campaign.id],
      );
      if (hasPendingEligible) {
        dispatch(
          setPendingMasSeriesOptIn({
            needsRetry: true,
            subscriptionId,
          }),
        );
      } else {
        dispatch(clearPendingMasSeriesOptIn());
      }
    },
    [dispatch, series.campaigns, subscriptionId],
  );

  const isActiveOptedIn = useCallback(
    (resolvedOptedIn: Record<string, boolean>): boolean => {
      const activeId = series.activeCampaign?.id;
      if (!activeId) {
        return true;
      }
      return resolvedOptedIn[activeId] === true;
    },
    [series.activeCampaign],
  );

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
        .filter(isEligibleSeriesCampaign)
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
        updatePendingFlag(optedInByCampaignId);
        return { success: isActiveOptedIn(optedInByCampaignId) };
      }

      setIsOptingIn(true);
      try {
        const results = await Engine.controllerMessenger.call(
          'RewardsController:optInToCampaigns',
          targets.map((campaign) => campaign.id),
          subscriptionId,
        );

        const resolvedOptedIn: Record<string, boolean> = {
          ...optedInByCampaignId,
        };
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
            resolvedOptedIn[campaign.id] = status.optedIn === true;
          } else {
            resolvedOptedIn[campaign.id] = false;
          }
        }

        updatePendingFlag(resolvedOptedIn);
        return { success: isActiveOptedIn(resolvedOptedIn) };
      } catch {
        updatePendingFlag(optedInByCampaignId);
        return { success: isActiveOptedIn(optedInByCampaignId) };
      } finally {
        setIsOptingIn(false);
      }
    }, [
      series.campaigns,
      optedInByCampaignId,
      subscriptionId,
      dispatch,
      ensureBound,
      updatePendingFlag,
      isActiveOptedIn,
    ]);

  return {
    ensureOptedIn,
    isOptingIn,
  };
}

/**
 * Quietly resume incomplete Money Account Sweepstakes series opt-in when the
 * Rewards dashboard gains focus. One attempt per focus entry; targets are
 * re-derived inside ensureOptedIn from participation status.
 */
export function useResumePendingMasSeriesOptIn(): void {
  const pending = useSelector(selectPendingMasSeriesOptIn);
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const { ensureOptedIn } = useMoneyAccountSweepstakesOptIn();
  const ensureOptedInRef = useRef(ensureOptedIn);
  ensureOptedInRef.current = ensureOptedIn;

  useFocusEffect(
    useCallback(() => {
      if (
        !pending.needsRetry ||
        !subscriptionId ||
        pending.subscriptionId !== subscriptionId
      ) {
        return;
      }

      ensureOptedInRef.current().catch(() => {
        // Quiet resume — failures remain pending for a later focus.
      });
    }, [pending.needsRetry, pending.subscriptionId, subscriptionId]),
  );
}

export default useMoneyAccountSweepstakesOptIn;
