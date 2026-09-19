import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import {
  endTrace,
  trace,
  TraceName,
  TraceOperation,
} from '../../../../util/trace';
import { selectCandidateSubscriptionId } from '../../../../reducers/rewards/selectors';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { getRewardsTabContentState } from '../utils/rewardsTabContentState';
import type { RewardsMoneyTabRouting } from './useRewardsMoneyTabRouting';

interface UseRewardsTabPerformanceConfig extends RewardsMoneyTabRouting {
  /** True when RewardsHome shows the update-required screen. */
  isVersionBlocked: boolean;
}

/**
 * Rewards tab time-to-content telemetry.
 *
 * Starts {@link TraceName.RewardsTabTimeToContent} when RewardsHome mounts
 * (tab entry) and ends when the account-state content surface is ready:
 * onboarding (post-skeleton), enrolled dashboard shell, Money dashboard, or
 * update-required.
 *
 * The Money routing inputs are passed in rather than read here, so the trace
 * and RewardsHome's own branch always report the same content state — the
 * resolved flag is hook-local state that no selector can reproduce.
 *
 * Aligns with the Playwright `@PerformanceRewards` gate.
 */
export function useRewardsTabPerformance({
  isVersionBlocked,
  moneyEnabled,
  moneyReferralResolved,
  moneyVariant,
}: UseRewardsTabPerformanceConfig): void {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);

  const tabContent = getRewardsTabContentState({
    isVersionBlocked,
    subscriptionId,
    candidateSubscriptionId,
    moneyEnabled,
    moneyReferralResolved,
    moneyVariant,
  });
  const contentState =
    tabContent.status === 'ready' ? tabContent.variant : null;

  const ttcTraceId = useRef(uuidv4());
  const ttcStarted = useRef(false);
  const ttcEnded = useRef(false);

  useEffect(() => {
    ttcTraceId.current = uuidv4();
    ttcEnded.current = false;
    trace({
      name: TraceName.RewardsTabTimeToContent,
      op: TraceOperation.RewardsPerformance,
      id: ttcTraceId.current,
      tags: { feature: 'rewards' },
    });
    ttcStarted.current = true;

    return () => {
      if (ttcStarted.current && !ttcEnded.current) {
        endTrace({
          name: TraceName.RewardsTabTimeToContent,
          id: ttcTraceId.current,
          data: { success: false, reason: 'unmounted' },
        });
        ttcStarted.current = false;
      }
    };
  }, []);

  useEffect(() => {
    if (contentState && ttcStarted.current && !ttcEnded.current) {
      endTrace({
        name: TraceName.RewardsTabTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          content_state: contentState,
        },
      });
      ttcEnded.current = true;
    }
  }, [contentState]);
}
