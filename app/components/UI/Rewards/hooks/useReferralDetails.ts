import { useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import {
  setReferralDetails,
  setReferralDetailsLoading,
} from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { SubscriptionReferralDetailsState } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';

export const useReferralDetails = (): null => {
  const dispatch = useDispatch();
  const subscriptionId = useSelector(selectRewardsSubscriptionId);

  const fetchReferralDetails = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
      Logger.log('useReferralDetails: No subscription ID available');
      return;
    }

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

      if (referralDetails) {
        Logger.log(
          'useReferralDetails: Successfully fetched referral details',
          {
            referralCode: referralDetails.referralCode,
            refereeCount: referralDetails.totalReferees,
          },
        );
      }
    } catch (fetchError) {
      Logger.log(
        'useReferralDetails: Failed to fetch referral details:',
        fetchError instanceof Error ? fetchError.message : 'Unknown error',
      );
    } finally {
      dispatch(setReferralDetailsLoading(false));
    }
  }, [dispatch, subscriptionId]);

  useEffect(() => {
    fetchReferralDetails();
  }, [fetchReferralDetails]);

  return null;
};
