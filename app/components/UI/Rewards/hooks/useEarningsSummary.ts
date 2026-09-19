import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setEarningsSummary,
  setEarningsSummaryError,
  setEarningsSummaryLoading,
} from '../../../../reducers/rewardsMoney';
import type { EarningsSummaryDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';

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
  fetchEarningsSummary: (options?: { forceFresh?: boolean }) => Promise<void>;
} => {
  const dispatch = useDispatch();

  const fetchEarningsSummary = useCallback(
    async ({ forceFresh }: { forceFresh?: boolean } = {}): Promise<void> => {
      if (!profileId) {
        return;
      }

      dispatch(setEarningsSummaryLoading({ profileId, loading: true }));
      dispatch(setEarningsSummaryError({ profileId, error: false }));

      try {
        const summary: EarningsSummaryDto =
          await Engine.controllerMessenger.call(
            'RewardsMoneyController:getEarningsSummary',
            { forceFresh },
          );
        dispatch(setEarningsSummary({ profileId, data: summary }));
      } catch (error) {
        dispatch(setEarningsSummaryError({ profileId, error: true }));
      } finally {
        dispatch(setEarningsSummaryLoading({ profileId, loading: false }));
      }
    },
    [dispatch, profileId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchEarningsSummary();
    }, [fetchEarningsSummary]),
  );

  return { fetchEarningsSummary };
};
