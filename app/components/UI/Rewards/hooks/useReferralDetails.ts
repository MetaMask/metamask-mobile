import { useCallback, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { selectSeasonId } from '../../../../reducers/rewards/selectors';
import {
  setReferralDetails,
  setReferralDetailsError,
  setReferralDetailsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { SubscriptionSeasonReferralDetailState } from '../../../../core/Engine/controllers/rewards-controller/types';
import { useFocusEffect } from '@react-navigation/native';
import { useInvalidateByRewardEvents } from './useInvalidateByRewardEvents';

export const useReferralDetails = (): {
  fetchReferralDetails: () => Promise<void>;
} => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const seasonId = useSelector(selectSeasonId);
  const isLoadingRef = useRef(false);

  const fetchReferralDetails = useCallback(async (): Promise<void> => {
    if (!subscriptionId || !seasonId) {
      dispatch(setReferralDetailsError(false));
      dispatch(setReferralDetailsLoading(false));
      return;
    }
    if (isLoadingRef.current) {
      return;
    }
    isLoadingRef.current = true;

    try {
      dispatch(setReferralDetailsLoading(true));
      dispatch(setReferralDetailsError(false));

      const referralDetails: SubscriptionSeasonReferralDetailState | null =
        await Engine.controllerMessenger.call(
          'RewardsController:getReferralDetails',
          subscriptionId,
          seasonId,
        );

      dispatch(
        setReferralDetails({
          referralCode: referralDetails?.referralCode,
          refereeCount: referralDetails?.totalReferees,
          referredByCode: referralDetails?.referredByCode,
          referralPoints: referralDetails?.referralPoints,
        }),
      );
    } catch (error) {
      dispatch(setReferralDetailsError(true));
    } finally {
      isLoadingRef.current = false;
      dispatch(setReferralDetailsLoading(false));
    }
  }, [dispatch, subscriptionId, seasonId]);

  useFocusEffect(
    useCallback(() => {
      fetchReferralDetails();
    }, [fetchReferralDetails]),
  );

  // Listen for events that should trigger a refetch of referral details
  useInvalidateByRewardEvents(
    [
      'RewardsController:accountLinked',
      'RewardsController:rewardClaimed',
      'RewardsController:balanceUpdated',
    ],
    fetchReferralDetails,
  );

  return { fetchReferralDetails };
};
