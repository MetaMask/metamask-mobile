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

      dispatch(setReferralFunnelLoading({ profileId, loading: true }));
      dispatch(setReferralFunnelError({ profileId, error: false }));

      try {
        const funnel: ReferralFunnelDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getReferralFunnel',
          { forceFresh },
        );
        dispatch(setReferralFunnel({ profileId, data: funnel }));
      } catch {
        dispatch(setReferralFunnelError({ profileId, error: true }));
      } finally {
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
