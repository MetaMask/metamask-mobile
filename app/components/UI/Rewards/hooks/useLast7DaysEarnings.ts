import { useCallback, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  profileCacheKey,
  summaryScopeKey,
} from '../../../../core/Engine/controllers/rewards-money-controller/RewardsMoneyController';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RootState } from '../../../../reducers';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';

export interface Last7DaysEarningsState {
  data: EarningsSummaryDto | null;
  isLoading: boolean;
  error: boolean;
  retry: () => void;
}

/** UTC `YYYY-MM-DD`. */
function formatUtcDay(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * The seven UTC dates ending today, inclusive.
 *
 * The summary window is a closed range of earning days, so today and the six
 * days before it are seven days, not an instant range of 168 hours.
 */
export function last7DaysUtcWindow(now: Date = new Date()): {
  from: string;
  to: string;
} {
  const to = formatUtcDay(now);
  const fromDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6),
  );
  return { from: formatUtcDay(fromDate), to };
}

/**
 * Windowed `GET /earnings/summary` for the card's last-7-days total.
 *
 * Held in component state on purpose. The heroes read the unwindowed summary
 * from Redux, and a windowed payload omits `claimable`, so writing it under
 * the same profile key would blank the claimable balance. The total is still
 * tied to the profile that requested it: a switch drops it immediately, and a
 * response from an earlier profile cannot land on the new one.
 *
 * The dashboard unmounts the Earnings tab when another tab opens. Until the
 * focus fetch lands, the card shows this profile's window from the
 * controller's cache, so returning to the tab does not flash a skeleton.
 */
export const useLast7DaysEarnings = (
  profileId: string | undefined,
): Last7DaysEarningsState => {
  const [data, setData] = useState<EarningsSummaryDto | null>(null);
  const [ownedProfileId, setOwnedProfileId] = useState<string | undefined>(
    undefined,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const isLoadingRef = useRef(false);
  const inFlightProfileIdRef = useRef<string | undefined>(undefined);
  const requestIdRef = useRef(0);

  const fetchLast7Days = useCallback(
    async ({ forceFresh }: { forceFresh?: boolean } = {}): Promise<void> => {
      if (!profileId) {
        requestIdRef.current += 1;
        isLoadingRef.current = false;
        inFlightProfileIdRef.current = undefined;
        setOwnedProfileId(undefined);
        setData(null);
        setError(false);
        setIsLoading(false);
        return;
      }
      // A second call for this same profile waits. A different profile
      // supersedes the in-flight request instead of being dropped.
      if (isLoadingRef.current && inFlightProfileIdRef.current === profileId) {
        return;
      }
      const requestId = ++requestIdRef.current;
      const requestedProfileId = profileId;
      const switchingProfile =
        inFlightProfileIdRef.current !== requestedProfileId;
      inFlightProfileIdRef.current = requestedProfileId;
      isLoadingRef.current = true;
      setOwnedProfileId(requestedProfileId);
      if (switchingProfile) {
        setData(null);
        setError(false);
      }
      setIsLoading(true);

      try {
        const { from, to } = last7DaysUtcWindow();
        const summary: EarningsSummaryDto =
          await Engine.controllerMessenger.call(
            'RewardsMoneyController:getEarningsSummary',
            { from, to, includeClaimable: false, forceFresh },
          );
        if (requestId !== requestIdRef.current) {
          return;
        }
        setData(summary);
        setError(false);
      } catch (fetchError) {
        if (requestId !== requestIdRef.current) {
          return;
        }
        // This hook does not retry a busy read, so the failure is reported now.
        reportRewardsMoneyReadFailure(
          fetchError,
          'last7DaysEarnings.fetch_failed',
          true,
          'rewards-money',
        );
        // Leave the previous total in place. The banner shows only when this
        // failure also left no total.
        setError(true);
      } finally {
        if (requestId === requestIdRef.current) {
          isLoadingRef.current = false;
          setIsLoading(false);
        }
      }
    },
    [profileId],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchLast7Days();
    }, [fetchLast7Days]),
  );

  const retry = useCallback(() => {
    void fetchLast7Days({ forceFresh: true });
  }, [fetchLast7Days]);

  const { from, to } = last7DaysUtcWindow();
  const cached = useSelector((state: RootState) => {
    if (!profileId) {
      return null;
    }
    const key = profileCacheKey(
      profileId,
      summaryScopeKey(undefined, { from, to, includeClaimable: false }),
    );
    return (
      state.engine?.backgroundState?.RewardsMoneyController?.earningsSummary?.[
        key
      ]?.payload ?? null
    );
  });

  const showingThisProfile = ownedProfileId === profileId;
  return {
    data: (showingThisProfile ? data : null) ?? cached,
    isLoading: showingThisProfile ? isLoading : Boolean(profileId),
    error: showingThisProfile ? error : false,
    retry,
  };
};
