import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';

export interface UseApplyReferralCodeResult {
  /**
   * Function to apply a referral code to the current subscription
   */
  applyReferralCode: (referralCode: string) => Promise<void>;

  /**
   * Loading state for apply referral code operation
   */
  isApplyingReferralCode: boolean;

  /**
   * Error message from apply referral code process
   */
  applyReferralCodeError?: string;

  /**
   * Function to clear the apply referral code error
   */
  clearApplyReferralCodeError: () => void;
}

export const useApplyReferralCode = (): UseApplyReferralCodeResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [applyReferralCodeError, setApplyReferralCodeError] = useState<
    string | undefined
  >(undefined);
  const [isApplyingReferralCode, setIsApplyingReferralCode] =
    useState<boolean>(false);

  const handleApplyReferralCode = useCallback(
    async (referralCode: string) => {
      if (!subscriptionId) {
        setApplyReferralCodeError('No subscription found. Please try again.');
        return;
      }

      if (!referralCode.trim()) {
        setApplyReferralCodeError('Please enter a referral code.');
        return;
      }

      try {
        setIsApplyingReferralCode(true);
        setApplyReferralCodeError(undefined);

        await Engine.controllerMessenger.call(
          'RewardsController:applyReferralCode',
          referralCode.trim().toUpperCase(),
          subscriptionId,
        );
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);

        setApplyReferralCodeError(errorMessage);
        throw error;
      } finally {
        setIsApplyingReferralCode(false);
      }
    },
    [subscriptionId],
  );

  const clearApplyReferralCodeError = useCallback(
    () => setApplyReferralCodeError(undefined),
    [],
  );

  return {
    applyReferralCode: handleApplyReferralCode,
    isApplyingReferralCode,
    applyReferralCodeError,
    clearApplyReferralCodeError,
  };
};

export default useApplyReferralCode;
