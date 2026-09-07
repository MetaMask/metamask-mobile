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

interface UseRewardsTabPerformanceConfig {
  /** True when RewardsHome shows the update-required screen. */
  isVersionBlocked: boolean;
}

/**
 * Rewards tab time-to-content telemetry.
 *
 * Starts {@link TraceName.RewardsTabTimeToContent} when RewardsHome mounts
 * (tab entry) and ends when the account-state content surface is ready:
 * onboarding (post-skeleton), enrolled dashboard shell, or update-required.
 *
 * Aligns with the Playwright `@PerformanceRewards` gate.
 */
export function useRewardsTabPerformance({
  isVersionBlocked,
}: UseRewardsTabPerformanceConfig): void {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const candidateSubscriptionId = useSelector(selectCandidateSubscriptionId);

  const { contentReady, variant } = getRewardsTabContentState({
    isVersionBlocked,
    subscriptionId,
    candidateSubscriptionId,
  });

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
    if (contentReady && ttcStarted.current && !ttcEnded.current) {
      endTrace({
        name: TraceName.RewardsTabTimeToContent,
        id: ttcTraceId.current,
        data: {
          success: true,
          content_state: variant,
        },
      });
      ttcEnded.current = true;
    }
  }, [contentReady, variant]);
}
