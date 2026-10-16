import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RootState } from '../../../../reducers';
import { setInFlightClaims } from '../../../../reducers/rewardsMoney';
import { selectInFlightClaims } from '../../../../reducers/rewardsMoney/selectors';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';

/**
 * How many post-claim refreshes are still running for a profile, and how many
 * have stored a page. A cache read must not replace a page one of those
 * refreshes stored, or store its own page while one is still running.
 */
const forceFreshInFlightByProfile = new Map<string, number>();
const completedForceFreshByProfile = new Map<string, number>();

const EMPTY_IN_FLIGHT_CLAIMS: ClaimDto[] = [];

/**
 * In-flight claims from `GET /earnings/claim/me`. The ledger only carries
 * settled claims, so History reads this beside it.
 *
 * The list lives on the `rewardsMoney` slice. The Earnings tab and the
 * history screen each mount this hook, and a post-claim refresh writes the
 * slice both of them read.
 */
export function useInFlightClaims(profileId: string | undefined): {
  claims: ClaimDto[];
  refresh: (options?: { forceFresh?: boolean }) => Promise<void>;
} {
  const dispatch = useDispatch();
  const storedClaims = useSelector((state: RootState) =>
    selectInFlightClaims(state, profileId),
  );
  const claims = storedClaims ?? EMPTY_IN_FLIGHT_CLAIMS;

  const refresh = useCallback(
    async (options?: { forceFresh?: boolean }) => {
      if (!profileId) {
        return;
      }
      const forceFresh = options?.forceFresh === true;
      const seenCompleted = completedForceFreshByProfile.get(profileId) ?? 0;
      if (forceFresh) {
        forceFreshInFlightByProfile.set(
          profileId,
          (forceFreshInFlightByProfile.get(profileId) ?? 0) + 1,
        );
      }
      try {
        const page = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getClaimHistory',
          { forceFresh },
        );
        const nextClaims = page?.results ?? [];
        if (forceFresh) {
          completedForceFreshByProfile.set(profileId, seenCompleted + 1);
        } else if (
          (forceFreshInFlightByProfile.get(profileId) ?? 0) > 0 ||
          (completedForceFreshByProfile.get(profileId) ?? 0) !== seenCompleted
        ) {
          return;
        }
        dispatch(setInFlightClaims({ profileId, claims: nextClaims }));
      } catch (error) {
        // Keep the last list. The ledger banner already covers a failed history read.
        reportRewardsMoneyReadFailure(
          error,
          'inFlightClaims.fetch_failed',
          true,
          'rewards-money',
        );
      } finally {
        if (forceFresh) {
          const left = (forceFreshInFlightByProfile.get(profileId) ?? 1) - 1;
          if (left <= 0) {
            forceFreshInFlightByProfile.delete(profileId);
          } else {
            forceFreshInFlightByProfile.set(profileId, left);
          }
        }
      }
    },
    [dispatch, profileId],
  );

  useFocusEffect(
    useCallback(() => {
      // Focus reads through the controller cache. A claim that just opened
      // passes forceFresh from the Earnings tab, which writes this slice.
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  return { claims, refresh };
}
