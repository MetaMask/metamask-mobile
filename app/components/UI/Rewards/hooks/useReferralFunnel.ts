import { useCallback, useRef } from 'react';
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
  const isLoadingRef = useRef(false);

  const fetchReferralFunnel = useCallback(
    async ({ forceFresh }: { forceFresh?: boolean } = {}): Promise<void> => {
      if (!profileId || !enabled) {
        return;
      }
      // The Performance tab stays mounted, so this instance is the only
      // caller. A second call waits until the in-flight one settles.
      if (isLoadingRef.current) {
        return;
      }
      isLoadingRef.current = true;

      // Leave a previous error set while this request is in flight. The
      // Performance banner reads that flag, and clearing it here unmounts the
      // banner for the whole retry. A success clears it with the new funnel.
      dispatch(setReferralFunnelLoading({ profileId, loading: true }));

      try {
        const funnel: ReferralFunnelDto = await Engine.controllerMessenger.call(
          'RewardsMoneyController:getReferralFunnel',
          { forceFresh },
        );
        dispatch(setReferralFunnel({ profileId, data: funnel }));
      } catch {
        dispatch(setReferralFunnelError({ profileId, error: true }));
      } finally {
        isLoadingRef.current = false;
        dispatch(setReferralFunnelLoading({ profileId, loading: false }));
      }
    },
    [dispatch, enabled, profileId],
  );

  useFocusEffect(
    useCallback(() => {
      void fetchReferralFunnel();
    }, [fetchReferralFunnel]),
  );

  return { fetchReferralFunnel };
};
