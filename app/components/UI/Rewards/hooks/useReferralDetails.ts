import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setReferralDetails,
  setReferralDetailsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { SubscriptionReferralDetailsState } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';

export const useReferralDetails = (): null => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const isLoadingRef = useRef(false);

  const fetchReferralDetails = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
      return;
    }
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    try {
      dispatch(setReferralDetailsLoading(true));

      const referralDetails: SubscriptionReferralDetailsState | null =
        await Engine.controllerMessenger.call(
          'RewardsController:getReferralDetails',
          subscriptionId,
        );

      dispatch(
        setReferralDetails({
          referralCode: referralDetails?.referralCode,
          refereeCount: referralDetails?.totalReferees,
        }),
      );
    } catch (error) {
      // Silently handle errors - the loading state will be reset in finally
      console.error('Failed to fetch referral details:', error);
    } finally {
      isLoadingRef.current = false;
      dispatch(setReferralDetailsLoading(false));
    }
  }, [dispatch, subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      fetchReferralDetails();
    }, [fetchReferralDetails]),
  );

  return null;
};
