import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Logger from '../../../util/Logger';
import { EXISTING_USER } from '../../../constants/storage';
import { Authentication } from '../../../core';
import AUTHENTICATION_TYPE from '../../../constants/userProperties';
import Engine from '../../../core/Engine';

const useDeleteWallet = () => {
  const resetWalletState = useCallback(async () => {
    try {
      await Engine.resetState();
      await Authentication.newWalletAndKeychain(`${Date.now()}`, {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      await Authentication.lockApp();
    } catch (error: any) {
      const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
      Logger.log(error, errorMsg);
    }
  }, []);

  const deleteUser = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(EXISTING_USER);
    } catch (error: any) {
      const errorMsg = `Failed to remove key: ${EXISTING_USER} from AsyncStorage`;
      Logger.log(error, errorMsg);
    }
  }, []);

  return [resetWalletState, deleteUser];
};

export default useDeleteWallet;
