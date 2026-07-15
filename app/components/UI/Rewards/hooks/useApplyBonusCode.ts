import { useCallback, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';

export interface UseApplyBonusCodeResult {
  /**
   * Function to apply a bonus code to the current subscription
   */
  applyBonusCode: (bonusCode: string) => Promise<void>;

  /**
   * Loading state for apply bonus code operation
   */
  isApplyingBonusCode: boolean;

  /**
   * Error message from apply bonus code process
   */
  applyBonusCodeError?: string;

  /**
   * Function to clear the apply bonus code error
   */
  clearApplyBonusCodeError: () => void;

  /**
   * Success state for apply bonus code process
   */
  applyBonusCodeSuccess: boolean;
}

export const useApplyBonusCode = (): UseApplyBonusCodeResult => {
  const subscriptionId = useSelector(selectRewardsSubscriptionId);
  const [applyBonusCodeError, setApplyBonusCodeError] = useState<
    string | undefined
  >(undefined);
  const [isApplyingBonusCode, setIsApplyingBonusCode] =
    useState<boolean>(false);
  const [applyBonusCodeSuccess, setApplyBonusCodeSuccess] =
    useState<boolean>(false);

  const handleApplyBonusCode = useCallback(
    async (bonusCode: string) => {
      if (!subscriptionId) {
        setApplyBonusCodeError('No subscription found. Please try again.');
        return;
      }

      if (!bonusCode.trim()) {
        setApplyBonusCodeError('Please enter a bonus code.');
        return;
      }

      try {
        setIsApplyingBonusCode(true);
        setApplyBonusCodeError(undefined);
        setApplyBonusCodeSuccess(false);
        await Engine.controllerMessenger.call(
          'RewardsController:applyBonusCode',
          bonusCode.trim().toUpperCase(),
          subscriptionId,
        );
        setApplyBonusCodeSuccess(true);
      } catch (error) {
        const errorMessage = handleRewardsErrorMessage(error);

        setApplyBonusCodeError(errorMessage);
        throw error;
      } finally {
        setIsApplyingBonusCode(false);
      }
    },
    [subscriptionId],
  );

  const clearApplyBonusCodeError = useCallback(
    () => setApplyBonusCodeError(undefined),
    [],
  );

  return {
    applyBonusCode: handleApplyBonusCode,
    isApplyingBonusCode,
    applyBonusCodeError,
    clearApplyBonusCodeError,
    applyBonusCodeSuccess,
  };
};

export default useApplyBonusCode;
