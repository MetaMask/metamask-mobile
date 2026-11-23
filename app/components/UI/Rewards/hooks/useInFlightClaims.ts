import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Engine from '../../../../core/Engine';
import type { ClaimDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';
import type { RootState } from '../../../../reducers';
import { setInFlightClaims } from '../../../../reducers/rewardsMoney';
import { selectInFlightClaims } from '../../../../reducers/rewardsMoney/selectors';
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

/**
 * Per profile: how many post-claim refreshes have started, the number of the
 * newest one that stored a page, and how many are still running. A refresh
 * stores only if no later one has. A cache read stores only when none is still
 * running and none has stored a page since this read started. A refresh that
 * fails stores nothing, so a cache read that was already waiting can publish.
 */
const forceFreshStartedByProfile = new Map<string, number>();
const forceFreshStoredByProfile = new Map<string, number>();
const forceFreshInFlightByProfile = new Map<string, number>();

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
  const { cancel: cancelBusyRefetch, arm: armBusyRefetch } =
    useOneShotBusyRefetch();
  const refreshRef = useRef<
    (options?: { forceFresh?: boolean; followUp?: boolean }) => Promise<void>
  >(async () => undefined);
  const storedClaims = useSelector((state: RootState) =>
    selectInFlightClaims(state, profileId),
  );
  const claims = storedClaims ?? EMPTY_IN_FLIGHT_CLAIMS;

  const refresh = useCallback(
    async (options?: { forceFresh?: boolean; followUp?: boolean }) => {
      if (!profileId) {
        cancelBusyRefetch();
        return;
      }
      const followUp = options?.followUp === true;
      const forceFresh = options?.forceFresh === true;
      cancelBusyRefetch();
      const storedAtStart = forceFreshStoredByProfile.get(profileId) ?? 0;
      let started = forceFreshStartedByProfile.get(profileId) ?? 0;
      if (forceFresh) {
        started += 1;
        forceFreshStartedByProfile.set(profileId, started);
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
          if (started <= (forceFreshStoredByProfile.get(profileId) ?? 0)) {
            return;
          }
          forceFreshStoredByProfile.set(profileId, started);
        } else if (
          (forceFreshInFlightByProfile.get(profileId) ?? 0) > 0 ||
          (forceFreshStoredByProfile.get(profileId) ?? 0) > storedAtStart
        ) {
          return;
        }
        dispatch(setInFlightClaims({ profileId, claims: nextClaims }));
      } catch (error) {
        // Keep the last list. The ledger banner already covers a failed history read.
        reportRewardsMoneyReadFailure(
          error,
          'inFlightClaims.fetch_failed',
          followUp,
          'rewards-money',
        );
        if (!followUp) {
          armBusyRefetch(error, () => {
            void refreshRef.current({ forceFresh: true, followUp: true });
          });
        }
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
    [armBusyRefetch, cancelBusyRefetch, dispatch, profileId],
  );
  refreshRef.current = refresh;

  useFocusEffect(
    useCallback(() => {
      // Focus reads through the controller cache. A claim that just opened
      // passes forceFresh from the Earnings tab, which writes this slice.
      refresh().catch(() => undefined);
    }, [refresh]),
  );

  return { claims, refresh };
}
