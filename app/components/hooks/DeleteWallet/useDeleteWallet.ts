import { useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Engine from '../../../core/Engine';
import Logger from '../../../util/Logger';
import { EXISTING_USER } from '../../../constants/storage';

const useDeleteWallet = () => {
  const { KeyringController } = Engine.context as any;
  const resetWalletState = useCallback(async () => {
    try {
      await Engine.resetState();
      await KeyringController.createNewVaultAndKeychain(`${Date.now()}`);
      await KeyringController.setLocked();
    } catch (error: any) {
      const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
      Logger.log(error, errorMsg);
    }
  }, [KeyringController]);

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
