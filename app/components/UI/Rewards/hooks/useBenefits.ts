import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
} from '../../../../reducers/benefits';
import Engine from '../../../../core/Engine';
import type { SubscriptionBenefitsState } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export const useBenefits = (): {
  initBenefits: (refreshCache?: boolean) => Promise<void>;
  getAllBenefits: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isLoadingRef = useRef(false);

  const fetchBenefits = useCallback(
    async (limit: number, refresh: boolean) => {
      if (!subscriptionId) {
        dispatch(setBenefitsError(false));
        dispatch(setBenefitsLoading(false));
        return;
      }
      if (isLoadingRef.current) {
        return;
      }
      isLoadingRef.current = true;

      try {
        dispatch(setBenefitsLoading(true));
        dispatch(setBenefitsError(false));

        const benefitsState: SubscriptionBenefitsState =
          await Engine.controllerMessenger.call(
            'RewardsController:getBenefits',
            subscriptionId,
            limit,
            refresh
          );

        dispatch(setBenefits(benefitsState));
      } catch (error) {
        dispatch(setBenefitsError(true));
      } finally {
        isLoadingRef.current = false;
        dispatch(setBenefitsLoading(false));
      }
    },
    [dispatch, subscriptionId],
  );

  const initBenefits = useCallback(async (): Promise<void> => {
    await fetchBenefits(10, false);
  }, [fetchBenefits]);

  const getAllBenefits = useCallback(async (): Promise<void> => {
    await fetchBenefits(200, true);
  }, [fetchBenefits]);

  useFocusEffect(
    useCallback(() => {
      initBenefits().then();
    }, [initBenefits]),
  );

  // Listen for events that should trigger a refetch of referral details
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:benefitClaimed'],
    initBenefits,
  );

  return { initBenefits, getAllBenefits };
};
