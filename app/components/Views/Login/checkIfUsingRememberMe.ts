/* eslint-disable import/prefer-default-export */
import SecureKeychain from '../../../core/SecureKeychain';
import Engine from '../../../core/Engine';
/**
 * Checks to see if the user has enabled Remember Me and logs
 * into the application if it is enabled.
 */
export const checkIfRememberMeEnabled = async () => {
  const credentials = await SecureKeychain.getGenericPassword();
  if (credentials) {
    // Restore vault with existing credentials
    const { KeyringController } = Engine.context as any;
    try {
      await KeyringController.submitPassword(credentials.password);
      return true;
    } catch (error) {
      return false;
    }
  } else return false;
};
