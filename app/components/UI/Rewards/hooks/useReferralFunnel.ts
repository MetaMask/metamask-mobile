import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import Engine from '../../../../core/Engine';
import {
  setReferralFunnel,
  setReferralFunnelError,
  setReferralFunnelLoading,
} from '../../../../reducers/rewardsMoney';
import type { ReferralFunnelDto } from '../../../../core/Engine/controllers/rewards-money-controller/types';

/**
 * Latest request generation per profile. Kept at module scope, not in a ref,
 * because the Performance tab unmounts on tab change and a request started by
 * the previous mount must still lose to one started by the next mount.
 */
const requestGenerationByProfile = new Map<string, number>();

export const useReferralFunnel = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): {
  fetchReferralFunnel: (options?: { forceFresh?: boolean }) => Promise<void>;
} => {
  const dispatch = useDispatch();

  const fetchReferralFunnel = useCallback(
    async ({ forceFresh }: { forceFresh?: boolean } = {}): Promise<void> => {
      if (!profileId || !enabled) {
        return;
      }

      const generation = (requestGenerationByProfile.get(profileId) ?? 0) + 1;
      requestGenerationByProfile.set(profileId, generation);
      const isLatest = () =>
        requestGenerationByProfile.get(profileId) === generation;

      // Leave a previous error in place until this request settles so the
      // error banner (and its retry spinner) stays visible while retrying.
      dispatch(setReferralFunnelLoading({ profileId, loading: true }));

      try {
        const funnel: ReferralFunnelDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getReferralFunnel',
          { forceFresh },
        );
        if (!isLatest()) {
          return;
        }
        dispatch(setReferralFunnel({ profileId, data: funnel }));
      } catch {
        if (!isLatest()) {
          return;
        }
        dispatch(setReferralFunnelError({ profileId, error: true }));
        dispatch(setReferralFunnelLoading({ profileId, loading: false }));
      }
    },
    [dispatch, enabled, profileId],
  );

  useFocusEffect(
    useCallback(() => {
      fetchReferralFunnel();
    }, [fetchReferralFunnel]),
  );

  return { fetchReferralFunnel };
};
