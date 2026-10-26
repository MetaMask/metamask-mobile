import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
} from '../../../../reducers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

/**
 * Reads of one profile that are in flight together. `isLoadingRef` is per
 * hook instance, and the hero and the Earnings tab each mount one, so two
 * requests for the same profile can overlap. A rejection applies only while
 * none of those reads has stored a summary.
 */
interface EarningsSummaryFlight {
  pending: number;
  stored: boolean;
}

const earningsSummaryFlightsByProfile = new Map<
  string,
  EarningsSummaryFlight
>();

function joinEarningsSummaryFlight(profileId: string): EarningsSummaryFlight {
  const existing = earningsSummaryFlightsByProfile.get(profileId);
  if (existing) {
    existing.pending += 1;
    return existing;
  }
  const created: EarningsSummaryFlight = { pending: 1, stored: false };
  earningsSummaryFlightsByProfile.set(profileId, created);
  return created;
}

function leaveEarningsSummaryFlight(profileId: string): void {
  const flight = earningsSummaryFlightsByProfile.get(profileId);
  if (!flight) {
    return;
  }
  flight.pending -= 1;
  if (flight.pending === 0) {
    earningsSummaryFlightsByProfile.delete(profileId);
  }
}

/**
 * Fetches the unnarrowed `GET /earnings/summary` into the profile-keyed
 * `rewardsMoney` slice, for the hero totals on the Money dashboard.
 *
 * The profile id is passed in rather than resolved here: the dashboard already
 * resolved the session to read referral me, and a second resolution could
 * disagree with the one the screen is rendering. Writing under that id is also
 * what makes a late response harmless — it lands under the profile that asked
 * for it, and a screen on a different profile reads a different key.
 *
 * One call covers both heroes. Narrowing by origin type would split the
 * response across cache buckets for no gain: the summary carries every family
 * either card needs, and the controller caches it per profile.
 */
export const useEarningsSummary = (
  profileId: string | undefined,
): {
  fetchEarningsSummary: (options?: {
    forceFresh?: boolean;
  }) => Promise<EarningsSummaryDto | undefined>;
} => {
  const dispatch = useDispatch();
  const { cancel: cancelBusyRefetch, arm: armBusyRefetch } =
    useOneShotBusyRefetch();
  const fetchRef = useRef<
    (options?: {
      forceFresh?: boolean;
      followUp?: boolean;
    }) => Promise<EarningsSummaryDto | undefined>
  >(() => Promise.resolve(undefined));
  // The promise for this instance's current read. A later caller that does
  // not need a newer summary shares it. A forceFresh caller does not: the
  // read already running may be the pre-claim cache, and returning nothing
  // would look like that refresh had finished.
  const inFlightRef = useRef<{
    promise: Promise<EarningsSummaryDto | undefined>;
  } | null>(null);

  const fetchEarningsSummary = useCallback(
    async ({
      forceFresh,
      followUp = false,
    }: { forceFresh?: boolean; followUp?: boolean } = {}): Promise<
      EarningsSummaryDto | undefined
    > => {
      if (!profileId) {
        return undefined;
      }
      const current = inFlightRef.current;
      if (current) {
        if (!forceFresh) {
          return current.promise;
        }
        await current.promise.catch(() => undefined);
        return fetchRef.current({ forceFresh: true, followUp });
      }

      const promise = (async (): Promise<EarningsSummaryDto | undefined> => {
        const flight = joinEarningsSummaryFlight(profileId);

        cancelBusyRefetch();
        // Leave a previous error set while this request is in flight. The
        // Earnings banner reads that flag, and clearing it here unmounts the
        // banner for the whole retry. A success clears it with the new summary.
        dispatch(setEarningsSummaryLoading({ profileId, loading: true }));

        try {
          const summary: EarningsSummaryDto =
            await Engine.controllerMessenger.call(
              'RewardsMoneyController:getEarningsSummary',
              { forceFresh },
            );
          flight.stored = true;
          dispatch(setEarningsSummary({ profileId, data: summary }));
          return summary;
        } catch (error) {
          // A faster duplicate already stored this profile's summary. Applying
          // this rejection would mark that stored read as failed.
          if (!flight.stored) {
            reportRewardsMoneyReadFailure(
              error,
              'earningsSummary.fetch_failed',
              followUp,
              'rewards-money',
            );
            dispatch(setEarningsSummaryError({ profileId, error: true }));
            if (!followUp) {
              armBusyRefetch(error, () => {
                // The slice already holds the error, and this retry has no caller.
                void fetchRef
                  .current({ forceFresh: true, followUp: true })
                  .catch(() => undefined);
              });
            }
          }
          throw error;
        } finally {
          leaveEarningsSummaryFlight(profileId);
          dispatch(setEarningsSummaryLoading({ profileId, loading: false }));
        }
      })();
      inFlightRef.current = { promise };
      try {
        return await promise;
      } finally {
        if (inFlightRef.current?.promise === promise) {
          inFlightRef.current = null;
        }
      }
    },
    [armBusyRefetch, cancelBusyRefetch, dispatch, profileId],
  );
  fetchRef.current = fetchEarningsSummary;

  useFocusEffect(
    useCallback(() => {
      // The error is already on the slice. A focus refresh has no caller to
      // tell, so the rejection stops here.
      void fetchEarningsSummary().catch(() => undefined);
    }, [fetchEarningsSummary]),
  );

  return { fetchEarningsSummary };
};
