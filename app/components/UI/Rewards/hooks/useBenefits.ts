import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setBenefits,
  setBenefitsError,
  setBenefitsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { SubscriptionBenefitsState } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

const GET_ALL_BENEFITS_LIMIT = 200;

export const useBenefits = (): {
  getAllBenefits: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isLoadingRef = useRef(false);

  const getAllBenefits = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
      dispatch(
        setBenefits({
          benefits: [],
          limit: GET_ALL_BENEFITS_LIMIT,
          lastFetched: Date.now(),
        }),
      );
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
          GET_ALL_BENEFITS_LIMIT,
        );

      dispatch(setBenefits(benefitsState));
    } catch (error) {
      dispatch(setBenefitsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setBenefitsLoading(false));
    }
  }, [dispatch, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      getAllBenefits().then();
    }, [getAllBenefits]),
  );

  useInvalidateByRewardEvents(
    ['RewardsController:accountLinked'],
    getAllBenefits,
  );

  return { getAllBenefits };
};
