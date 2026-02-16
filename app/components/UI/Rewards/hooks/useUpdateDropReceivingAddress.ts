import { useCallback, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectRewardsSubscriptionId } from '../../../../selectors/rewards';
import { handleRewardsErrorMessage } from '../utils';
import Engine from '../../../../core/Engine';
import { setRecentDropAddressCommit } from '../../../../reducers/rewards';

export interface UseUpdateDropReceivingAddressResult {
  /**
   * Function to update the receiving address for a drop
   * @param dropId - The drop ID to update the receiving address for
   * @param address - The new blockchain address for the receiving chain
   */
  updateDropReceivingAddress: (
    dropId: string,
    address: string,
  ) => Promise<boolean>;

  /**
   * Loading state for the update operation
   */
  isUpdating: boolean;

  /**
   * Error message from the update process
   */
  updateError: string | null;

  /**
   * Function to clear the update error
   */
  clearUpdateError: () => void;
}

/**
 * Custom hook to update the receiving address for a drop.
 * Follows the pattern of useCommitForDrop for POST operations.
 */
export const useUpdateDropReceivingAddress =
  (): UseUpdateDropReceivingAddressResult => {
    const dispatch = useDispatch();
    const subscriptionId = useSelector(selectRewardsSubscriptionId);
    const [updateError, setUpdateError] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState<boolean>(false);

    const handleUpdateDropReceivingAddress = useCallback(
      async (dropId: string, address: string): Promise<boolean> => {
        if (!subscriptionId) {
          setUpdateError('No subscription found. Please try again.');
          return false;
        }

        if (!dropId) {
          setUpdateError('Drop ID is required.');
          return false;
        }

        if (!address) {
          setUpdateError('Address is required.');
          return false;
        }

        try {
          setIsUpdating(true);
          setUpdateError(null);

          await Engine.controllerMessenger.call(
            'RewardsController:updateDropReceivingAddress',
            dropId,
            address,
            subscriptionId,
          );

          // Update the committed address in Redux for immediate UI feedback
          dispatch(setRecentDropAddressCommit({ dropId, address }));

          return true;
        } catch (error) {
          const errorMessage = handleRewardsErrorMessage(error);
          setUpdateError(errorMessage);
          return false;
        } finally {
          setIsUpdating(false);
        }
      },
      [dispatch, subscriptionId],
    );

    const clearUpdateError = useCallback(() => setUpdateError(null), []);

    return {
      updateDropReceivingAddress: handleUpdateDropReceivingAddress,
      isUpdating,
      updateError,
      clearUpdateError,
    };
  };

export default useUpdateDropReceivingAddress;
