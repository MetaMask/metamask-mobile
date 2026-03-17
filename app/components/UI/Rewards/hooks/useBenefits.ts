import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  appendBenefits,
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
} from '../../../../reducers/benefits';
import Engine from '../../../../core/Engine';
import type { SubscriptionBenefitsState } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';
import {
  selectBenefitsHasNextPage,
  selectCurrentBenefitsPage,
} from '../../../../reducers/benefits/selectors.ts';

export const useBenefits = (): {
  initBenefits: (refreshCache?: boolean) => Promise<void>;
  getMoreBenefits: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const currentPage = useSelector(selectCurrentBenefitsPage);
  const hasNextPage = useSelector(selectBenefitsHasNextPage);
  const isLoadingRef = useRef(false);

  const initBenefits = useCallback(async (refreshCache = false): Promise<void> => {
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
          0,
        );

      dispatch(setBenefits(benefitsState));
    } catch (error) {
      dispatch(setBenefitsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setBenefitsLoading(false));
    }
  }, [dispatch, subscriptionId]);

  const getMoreBenefits = useCallback(
    async (): Promise<void> => {
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
            currentPage + 1,
          );

        dispatch(appendBenefits(benefitsState));
      } catch (error) {
        dispatch(setBenefitsError(true));
      } finally {
        isLoadingRef.current = false;
        dispatch(setBenefitsLoading(false));
      }
    },
    [dispatch, hasNextPage, currentPage, subscriptionId],
  );

  useFocusEffect(
    useCallback(() => {
      initBenefits();
    }, [initBenefits]),
  );

  // Listen for events that should trigger a refetch of referral details
  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked', 'RewardsController:benefitClaimed'],
    initBenefits,
  );

  return { initBenefits, getMoreBenefits };
};
