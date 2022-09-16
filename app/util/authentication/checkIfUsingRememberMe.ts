/* eslint-disable import/prefer-default-export */
import SecureKeychain from '../../core/SecureKeychain';
import Engine from '../../core/Engine';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  BIOMETRY_CHOICE,
  PASSCODE_CHOICE,
  TRUE,
} from '../../constants/storage';
import Logger from '../../util/Logger';

/**
 * Checks to see if the user has enabled Remember Me and logs
 * into the application if it is enabled.
 */
const checkIfUsingRememberMe = async (): Promise<boolean> => {
  const biometryChoice = await AsyncStorage.getItem(BIOMETRY_CHOICE);
  // since we do not allow remember me to be used with biometrics we can eagerly return false
  if (biometryChoice) {
    return false;
  }
  // since we do not allow remember me to be used with passcode we can eagerly return false
  const passcodeChoice = await AsyncStorage.getItem(PASSCODE_CHOICE);
  if (passcodeChoice !== '' && passcodeChoice === TRUE) {
    return false;
  }
  const credentials = await SecureKeychain.getGenericPassword();
  if (credentials) {
    // Restore vault with existing credentials
    const { KeyringController } = Engine.context as any;
    try {
      // this is being used a hack to verify that the credentials are valid
      await KeyringController.exportSeedPhrase(credentials.password);
      return true;
    } catch (error) {
      Logger.log(
        'Error in checkIfUsingRememberMe while calling KeyringController.exportSeedPhrase',
        error,
      );
      return false;
    }
  } else return false;
};

export default checkIfUsingRememberMe;
