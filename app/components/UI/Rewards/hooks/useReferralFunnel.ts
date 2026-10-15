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
import { reportRewardsMoneyReadFailure } from './reportRewardsMoneyReadFailure';
import { useOneShotBusyRefetch } from './useOneShotBusyRefetch';

export const useReferralFunnel = (
  profileId: string | undefined,
  { enabled = true }: { enabled?: boolean } = {},
): {
  fetchReferralFunnel: (options?: { forceFresh?: boolean }) => Promise<void>;
} => {
  const dispatch = useDispatch();
  const isLoadingRef = useRef(false);
  const { cancel: cancelBusyRefetch, arm: armBusyRefetch } =
    useOneShotBusyRefetch();
  const fetchRef = useRef<
    (options?: { forceFresh?: boolean; followUp?: boolean }) => Promise<void>
  >(() => Promise.resolve());

  const fetchReferralFunnel = useCallback(
    async ({
      forceFresh,
      followUp = false,
    }: { forceFresh?: boolean; followUp?: boolean } = {}): Promise<void> => {
      if (!profileId || !enabled) {
        return;
      }
      // The Performance tab stays mounted, so this instance is the only
      // caller. A second call waits until the in-flight one settles.
      if (isLoadingRef.current) {
        return;
      }
      isLoadingRef.current = true;
      cancelBusyRefetch();

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
      } catch (error) {
        reportRewardsMoneyReadFailure(
          error,
          'referralFunnel.fetch_failed',
          followUp,
          'rewards-money',
        );
        dispatch(setReferralFunnelError({ profileId, error: true }));
        if (!followUp) {
          armBusyRefetch(error, () => {
            void fetchRef.current({ forceFresh: true, followUp: true });
          });
        }
      } finally {
        isLoadingRef.current = false;
        dispatch(setReferralFunnelLoading({ profileId, loading: false }));
      }
    },
    [armBusyRefetch, cancelBusyRefetch, dispatch, enabled, profileId],
  );
  fetchRef.current = fetchReferralFunnel;

  useFocusEffect(
    useCallback(() => {
      void fetchReferralFunnel();
    }, [fetchReferralFunnel]),
  );

  return { fetchReferralFunnel };
};
