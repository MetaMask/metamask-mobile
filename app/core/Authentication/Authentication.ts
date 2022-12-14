import SecureKeychain from '../SecureKeychain';
import Engine from '../Engine';
import { recreateVaultWithSamePassword } from '../Vault';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ENCRYPTION_LIB,
  ORIGINAL,
  EXISTING_USER,
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  SEED_PHRASE_HINTS,
} from '../../constants/storage';
import Logger from '../../util/Logger';
import { logIn, logOut } from '../../actions/user';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import { Store } from 'redux';
import AuthenticationError from './AuthenticationError';
import { BIOMETRY_TYPE } from 'react-native-keychain';

/**
 * Holds auth data used to determine auth configuration
 */
export interface AuthData {
  type: AUTHENTICATION_TYPE; //Enum used to show type for authentication
  biometryType?: BIOMETRY_TYPE;
}

class AuthenticationService {
  private authData: AuthData = { type: AUTHENTICATION_TYPE.UNKNOWN };
  private store: Store | undefined = undefined;
  private static isInitialized = false;

  /**
   * This method creates the instance of the authentication class
   * @param {Store} store - A redux function that will dispatch global state actions
   */
  init(store: Store) {
    if (!AuthenticationService.isInitialized) {
      AuthenticationService.isInitialized = true;
      this.store = store;
    } else {
      Logger.log(
        'Attempted to call init on AuthenticationService but an instance has already been initialized',
      );
    }
  }

  private dispatchLogin(): void {
    if (this.store) {
      this.store.dispatch(logIn());
    } else {
      Logger.log(
        'Attempted to dispatch logIn action but dispatch was not initialized',
      );
    }
  }

  private dispatchLogout(): void {
    if (this.store) {
      this.store.dispatch(logOut());
    } else
      Logger.log(
        'Attempted to dispatch logOut action but dispatch was not initialized',
      );
  }

  /**
   * This method recreates the vault upon login if user is new and is not using the latest encryption lib
   * @param password - password entered on login
   * @param selectedAddress - current address pulled from persisted state
   */
  private loginVaultCreation = async (
    password: string,
    selectedAddress: string,
  ): Promise<void> => {
    // Restore vault with user entered password
    const { KeyringController }: any = Engine.context;
    await KeyringController.submitPassword(password);
    const encryptionLib = await AsyncStorage.getItem(ENCRYPTION_LIB);
    const existingUser = await AsyncStorage.getItem(EXISTING_USER);
    if (encryptionLib !== ORIGINAL && existingUser) {
      try {
        await recreateVaultWithSamePassword(password, selectedAddress);
        await AsyncStorage.setItem(ENCRYPTION_LIB, ORIGINAL);
      } catch (e: any) {
        throw new AuthenticationError(
          e,
          'Unable to recreate vault',
          this.authData,
        );
      }
    }
    password = this.wipeSensitiveData();
    selectedAddress = this.wipeSensitiveData();
  };

  /**
   * This method creates a new vault and restores with seed phrase and existing user data
   * @param password - password provided by user, biometric, pincode
   * @param parsedSeed - provided seed
   * @param clearEngine - clear the engine state before restoring vault
   */
  private newWalletVaultAndRestore = async (
    password: string,
    parsedSeed: string,
    clearEngine: boolean,
  ): Promise<void> => {
    // Restore vault with user entered password
    const { KeyringController }: any = Engine.context;
    if (clearEngine) await Engine.resetState();
    await KeyringController.createNewVaultAndRestore(password, parsedSeed);
    password = this.wipeSensitiveData();
    parsedSeed = this.wipeSensitiveData();
  };

  /**
   * This method creates a new wallet with all new data
   * @param password - password provided by user, biometric, pincode
   */
  private createWalletVaultAndKeychain = async (
    password: string,
  ): Promise<void> => {
    const { KeyringController }: any = Engine.context;
    await Engine.resetState();
    await KeyringController.createNewVaultAndKeychain(password);
    password = this.wipeSensitiveData();
  };

  /**
   * This method is used for password memory obfuscation
   * It simply returns an empty string so we can reset all the sensitive params like passwords and SRPs.
   * Since we cannot control memory in JS the best we can do is remove the pointer to sensitive information in memory
   *    - see this thread for more details: https://security.stackexchange.com/questions/192387/how-to-securely-erase-javascript-parameters-after-use
   * [Future improvement] to fully remove these values from memory we can convert these params to Buffers or UInt8Array as is done in extension
   *    - see: https://github.com/MetaMask/metamask-extension/commit/98f187c301176152a7f697e62e2ba6d78b018b68
   */
  private wipeSensitiveData = () => '';

  /**
   * Reset vault will empty password used to clear/reset vault upon errors during login/creation
   */
  resetVault = async (): Promise<void> => {
    const { KeyringController }: any = Engine.context;
    // Restore vault with empty password
    await KeyringController.submitPassword('');
    await SecureKeychain.resetGenericPassword();
  };

  /**
   * Stores a user password in the secure keychain with a specific auth type
   * @param password - password provided by user
   * @param authType - type of authentication required to fetch password from keychain
   */
  storePassword = async (
    password: string,
    authType: AUTHENTICATION_TYPE,
  ): Promise<void> => {
    try {
      switch (authType) {
        case AUTHENTICATION_TYPE.BIOMETRIC:
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.BIOMETRICS,
          );
          break;
        case AUTHENTICATION_TYPE.PASSCODE:
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.PASSCODE,
          );
          break;
        case AUTHENTICATION_TYPE.REMEMBER_ME:
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.REMEMBER_ME,
          );
          break;
      }
    } catch (error) {
      throw new AuthenticationError(
        (error as Error).message,
        'Authentication.storePassword failed',
        this.authData,
      );
    }
    password = this.wipeSensitiveData();
  };

  /**
   * Fetches the password from the keychain using the auth method it was origonally stored
   */
  getPassword = async () => await SecureKeychain.getGenericPassword();

  /**
   * Checks the authetincation type configured in the previous login
   * @returns @AuthData
   */
  checkAuthenticationMethod = async (): Promise<AuthData> => {
    const biometryType: any = await SecureKeychain.getSupportedBiometryType();
    const biometryPreviouslyDisabled = await AsyncStorage.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await AsyncStorage.getItem(
      PASSCODE_DISABLED,
    );

    if (
      biometryType &&
      !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)
    ) {
      return { type: AUTHENTICATION_TYPE.BIOMETRIC, biometryType };
    } else if (
      biometryType &&
      !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
    ) {
      return { type: AUTHENTICATION_TYPE.PASSCODE, biometryType };
    } else if (await SecureKeychain.getGenericPassword()) {
      return { type: AUTHENTICATION_TYPE.REMEMBER_ME, biometryType };
    }
    return { type: AUTHENTICATION_TYPE.PASSWORD, biometryType };
  };

  /**
   * Takes a component's input to determine what @enum {AuthData} should be provided when creating a new password, wallet, etc..
   * @param biometryChoice - type of biometric choice selected
   * @param rememberMe - remember me setting (//TODO: to be removed)
   * @returns @AuthData
   */
  componentAuthenticationType = async (
    biometryChoice: boolean,
    rememberMe: boolean,
  ) => {
    const biometryType: any = await SecureKeychain.getSupportedBiometryType();
    const biometryPreviouslyDisabled = await AsyncStorage.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await AsyncStorage.getItem(
      PASSCODE_DISABLED,
    );

    if (
      biometryType &&
      biometryChoice &&
      !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)
    ) {
      return { type: AUTHENTICATION_TYPE.BIOMETRIC, biometryType };
    } else if (rememberMe) {
      return { type: AUTHENTICATION_TYPE.REMEMBER_ME, biometryType };
    } else if (
      biometryType &&
      biometryChoice &&
      !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
    ) {
      return { type: AUTHENTICATION_TYPE.PASSCODE, biometryType };
    }
    return { type: AUTHENTICATION_TYPE.PASSWORD, biometryType };
  };

  /**
   * Setting up a new wallet for new users
   * @param password - password provided by user
   * @param authData - type of authentication required to fetch password from keychain
   */
  newWalletAndKeyChain = async (
    password: string,
    authData: AuthData,
  ): Promise<void> => {
    try {
      await this.createWalletVaultAndKeychain(password);
      await this.storePassword(password, authData?.type);
      await AsyncStorage.setItem(EXISTING_USER, TRUE);
      await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
      this.dispatchLogin();
      this.authData = authData;
    } catch (e: any) {
      this.lockApp(false);
      throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
    }
    password = this.wipeSensitiveData();
  };

  /**
   * This method is used when a user is creating a new wallet in onboarding flow or resetting their password
   * @param password - password provided by user
   * @param authData - type of authentication required to fetch password from keychain
   * @param parsedSeed - provides the parsed SRP
   * @param clearEngine - this boolean clears the engine data on new wallet
   */
  newWalletAndRestore = async (
    password: string,
    authData: AuthData,
    parsedSeed: string,
    clearEngine: boolean,
  ): Promise<void> => {
    try {
      await this.storePassword(password, authData.type);
      await this.newWalletVaultAndRestore(password, parsedSeed, clearEngine);
      await AsyncStorage.setItem(EXISTING_USER, TRUE);
      await AsyncStorage.removeItem(SEED_PHRASE_HINTS);
      this.dispatchLogin();
      this.authData = authData;
    } catch (e: any) {
      this.lockApp(false);
      throw new AuthenticationError(e, 'Failed wallet creation', this.authData);
    }
    password = this.wipeSensitiveData();
    parsedSeed = this.wipeSensitiveData();
  };

  /**
   * Manual user password entry for login
   * @param selectedAddress - current address pulled from persisted state
   * @param password - password provided by user
   * @param authData - type of authentication required to fetch password from keychain
   */
  userEntryAuth = async (
    password: string,
    authData: AuthData,
    selectedAddress: string,
  ): Promise<void> => {
    try {
      await this.loginVaultCreation(password, selectedAddress);
      await this.storePassword(password, authData.type);
      this.dispatchLogin();
      this.authData = authData;
    } catch (e: any) {
      this.lockApp(false);
      throw new AuthenticationError(e, 'Failed to login', this.authData);
    }
    password = this.wipeSensitiveData();
  };

  /**
   * Attempts to use biometric/pin code/remember me to login
   * @param selectedAddress - current address pulled from persisted state
   */
  appTriggeredAuth = async (selectedAddress: string): Promise<void> => {
    const credentials: any = await SecureKeychain.getGenericPassword();
    try {
      const password = credentials?.password;
      await this.loginVaultCreation(password, selectedAddress);
      if (!password) await this.storePassword(password, this.authData.type);
      this.dispatchLogin();
    } catch (e: any) {
      this.lockApp(false);
      throw new AuthenticationError(
        e,
        'appTriggeredAuth failed to login',
        this.authData,
      );
    }
    selectedAddress = this.wipeSensitiveData();
  };

  /**
   * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
   */
  lockApp = async (reset = true): Promise<void> => {
    const { KeyringController }: any = Engine.context;
    if (reset) await SecureKeychain.resetGenericPassword();
    if (KeyringController.isUnlocked()) {
      await KeyringController.setLocked();
    }
    this.authData = { type: AUTHENTICATION_TYPE.UNKNOWN };
    this.dispatchLogout();
  };

  getType = async (): Promise<AuthData> =>
    await this.checkAuthenticationMethod();
}
// eslint-disable-next-line import/prefer-default-export
export const Authentication = new AuthenticationService();
