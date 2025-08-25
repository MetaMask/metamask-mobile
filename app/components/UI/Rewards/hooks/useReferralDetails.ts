import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectSubscriptionId } from '../../../../reducers/rewards/selectors';
import { setReferralDetails } from '../../../../reducers/rewards';
import Engine from '../../../../core/Engine';
import type { SubscriptionReferralDetailsDto } from '../../../../core/Engine/controllers/rewards-controller/types';
import Logger from '../../../../util/Logger';

export interface UseReferralDetailsResult {
  isLoading: boolean;
  error: string | null;
  fetchReferralDetails: () => Promise<void>;
}

export const useReferralDetails = (): UseReferralDetailsResult => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionId = useSelector(selectSubscriptionId);

  const fetchReferralDetails = useCallback(async (): Promise<void> => {
    if (!subscriptionId) {
      Logger.log('useReferralDetails: No subscription ID available');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const referralDetails: SubscriptionReferralDetailsDto =
        await Engine.controllerMessenger.call(
          'RewardsDataService:getReferralDetails',
          subscriptionId,
        );

      dispatch(
        setReferralDetails({
          referralCode: referralDetails.referralCode,
          refereeCount: referralDetails.totalReferees,
        }),
      );

      Logger.log('useReferralDetails: Successfully fetched referral details');
    } catch (fetchError) {
      const errorMessage =
        fetchError instanceof Error ? fetchError.message : 'Unknown error';
      Logger.log(
        'useReferralDetails: Failed to fetch referral details:',
        errorMessage,
      );
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [dispatch, subscriptionId]);

  return {
    isLoading,
    error,
    fetchReferralDetails,
  };
};
