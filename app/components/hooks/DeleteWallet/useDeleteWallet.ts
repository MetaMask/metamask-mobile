import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import Logger from '../../../util/Logger';
import { setExistingUser } from '../../../actions/user';
import { Authentication } from '../../../core';
import { useMetrics } from '../useMetrics';

const useDeleteWallet = () => {
  const metrics = useMetrics();
  const dispatch = useDispatch();

  // maybe we can just remove this function and use the resetWalletState function from the Authentication service
  const resetWalletState = useCallback(async () => {
    await Authentication.resetWalletState();
  }, []);

  const deleteUser = async () => {
    try {
      dispatch(setExistingUser(false));
      await metrics.createDataDeletionTask();
    } catch (error) {
      const errorMsg = `Failed to reset existingUser state in Redux`;
      Logger.log(error, errorMsg);
    }
  };

  return [resetWalletState, deleteUser];
};

export default useDeleteWallet;
