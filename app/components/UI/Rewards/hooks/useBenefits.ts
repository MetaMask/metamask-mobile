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
  fetchBenefits: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isLoadingRef = useRef(false);

  const fetchBenefits = useCallback(async (): Promise<void> => {
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

      const benefitsState: SubscriptionBenefitsState | null =
        await Engine.controllerMessenger.call(
          'RewardsController:getBenefits',
          subscriptionId
        );

      dispatch(
        setBenefits(benefitsState?.benefits ?? []),
      );
    } catch (error) {
      dispatch(setBenefitsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setBenefitsLoading(false));
    }
  }, [dispatch, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchBenefits();
    }, [fetchBenefits]),
  );

  // Listen for events that should trigger a refetch of referral details
  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:benefitClaimed',
    ],
    fetchBenefits,
  );

  return { fetchBenefits };
};
