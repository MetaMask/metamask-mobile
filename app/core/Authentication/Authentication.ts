import SecureKeychain from '../SecureKeychain';
import Engine from '../Engine';
import {
  EXISTING_USER,
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  SEED_PHRASE_HINTS,
} from '../../constants/storage';
import {
  authSuccess,
  authError,
  logIn,
  logOut,
  passwordSet,
  UserActionType,
} from '../../actions/user';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
import AuthenticationError from './AuthenticationError';
import { UserCredentials, BIOMETRY_TYPE } from 'react-native-keychain';
import {
  AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
  AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
  AUTHENTICATION_FAILED_TO_LOGIN,
  AUTHENTICATION_FAILED_WALLET_CREATION,
  AUTHENTICATION_RESET_PASSWORD_FAILED,
  AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE,
  AUTHENTICATION_STORE_PASSWORD_FAILED,
} from '../../constants/error';
import StorageWrapper from '../../store/storage-wrapper';
import NavigationService from '../NavigationService';
import Routes from '../../constants/navigation/Routes';
import { TraceName, TraceOperation, endTrace, trace } from '../../util/trace';
import ReduxService from '../redux';
import { getSeedPhrase } from '../Vault';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { uint8ArrayToMnemonic } from '../../util/mnemonic';
import Logger from '../../util/Logger';
import Oauth2LoginService  from '../Oauth2Login/Oauth2loginService';
import { resetVaultBackup } from '../BackupVault/backupVault';

/**
 * Holds auth data used to determine auth configuration
 */
export interface AuthData {
  currentAuthType: AUTHENTICATION_TYPE; //Enum used to show type for authentication
  availableBiometryType?: BIOMETRY_TYPE;
  oauth2Login?: boolean;
}

class AuthenticationService {
  private authData: AuthData = { currentAuthType: AUTHENTICATION_TYPE.UNKNOWN };

  private dispatchLogin(): void {
    ReduxService.store.dispatch(logIn());
  }

  private dispatchPasswordSet(): void {
    ReduxService.store.dispatch(passwordSet());
  }

  private dispatchLogout(): void {
    ReduxService.store.dispatch(logOut());
  }

  private dispatchOauth2Reset(): void {
    ReduxService.store.dispatch({
      type: UserActionType.OAUTH2_LOGIN_RESET,
    });
  }

  /**
   * This method recreates the vault upon login if user is new and is not using the latest encryption lib
   * @param password - password entered on login
   */
  private loginVaultCreation = async (password: string): Promise<void> => {
    // Restore vault with user entered password
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController }: any = Engine.context;
    await KeyringController.submitPassword(password);
    password = this.wipeSensitiveData();
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController }: any = Engine.context;
    await Engine.resetState();
    await KeyringController.createNewVaultAndKeychain(password);
    password = this.wipeSensitiveData();
  };

  /**
   * This method is used for password memory obfuscation
   * It simply returns an empty string so we can reset all the sensitive params like passwords and SRPs.
   * Since we cannot control memory in JS the best we can do is remove the pointer to sensitive information in memory
   * - see this thread for more details: https://security.stackexchange.com/questions/192387/how-to-securely-erase-javascript-parameters-after-use
   * [Future improvement] to fully remove these values from memory we can convert these params to Buffers or UInt8Array as is done in extension
   * - see: https://github.com/MetaMask/metamask-extension/commit/98f187c301176152a7f697e62e2ba6d78b018b68
   */
  private wipeSensitiveData = () => '';

  /**
   * Checks the authetincation type configured in the previous login
   * @returns @AuthData
   */
  private checkAuthenticationMethod = async (): Promise<AuthData> => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableBiometryType: any =
      await SecureKeychain.getSupportedBiometryType();
    const biometryPreviouslyDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await StorageWrapper.getItem(
      PASSCODE_DISABLED,
    );

    if (
      availableBiometryType &&
      !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType,
      };
    } else if (
      availableBiometryType &&
      !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType,
      };
    }
    const existingUser = await StorageWrapper.getItem(EXISTING_USER);
    if (existingUser) {
      if (await SecureKeychain.getGenericPassword()) {
        return {
          currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
          availableBiometryType,
        };
      }
    }
    return {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType,
    };
  };

  /**
   * Reset vault will empty password used to clear/reset vault upon errors during login/creation
   */
  resetVault = async (): Promise<void> => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { KeyringController }: any = Engine.context;
    // Restore vault with empty password
    await KeyringController.submitPassword('');
    await this.resetPassword();
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
        case AUTHENTICATION_TYPE.PASSWORD:
          await SecureKeychain.setGenericPassword(password, undefined);
          break;
        default:
          await SecureKeychain.setGenericPassword(password, undefined);
          break;
      }
    } catch (error) {
      throw new AuthenticationError(
        (error as Error).message,
        AUTHENTICATION_STORE_PASSWORD_FAILED,
        this.authData,
      );
    }
    password = this.wipeSensitiveData();
  };

  resetPassword = async () => {
    try {
      await SecureKeychain.resetGenericPassword();
    } catch (error) {
      throw new AuthenticationError(
        `${AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE} ${
          (error as Error).message
        }`,
        AUTHENTICATION_RESET_PASSWORD_FAILED,
        this.authData,
      );
    }
  };

  /**
   * Fetches the password from the keychain using the auth method it was originally stored
   */
  getPassword: () => Promise<false | UserCredentials | null> = async () =>
    await SecureKeychain.getGenericPassword();

  /**
   * Takes a component's input to determine what @enum {AuthData} should be provided when creating a new password, wallet, etc..
   * @param biometryChoice - type of biometric choice selected
   * @param rememberMe - remember me setting (//TODO: to be removed)
   * @returns @AuthData
   */
  componentAuthenticationType = async (
    biometryChoice: boolean,
    rememberMe: boolean,
  ): Promise<AuthData> => {
    // TODO: Replace "any" with type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const availableBiometryType: any =
      await SecureKeychain.getSupportedBiometryType();
    const biometryPreviouslyDisabled = await StorageWrapper.getItem(
      BIOMETRY_CHOICE_DISABLED,
    );
    const passcodePreviouslyDisabled = await StorageWrapper.getItem(
      PASSCODE_DISABLED,
    );

    if (
      availableBiometryType &&
      biometryChoice &&
      !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType,
      };
    } else if (
      rememberMe &&
      ReduxService.store.getState().security.allowLoginWithRememberMe
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
        availableBiometryType,
      };
    } else if (
      availableBiometryType &&
      biometryChoice &&
      !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType,
      };
    }
    return {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      availableBiometryType,
    };
  };

  /**
   * Setting up a new wallet for new users
   * @param password - password provided by user
   * @param authData - type of authentication required to fetch password from keychain
   */
  newWalletAndKeychain = async (
    password: string,
    authData: AuthData,
  ): Promise<void> => {
    try {
      // check for oauth2 login
      if (authData.oauth2Login) {
        await this.createAndBackupSeedPhrase(password);
      } else {
        await this.createWalletVaultAndKeychain(password);
      }

      await this.storePassword(password, authData?.currentAuthType);
      await StorageWrapper.setItem(EXISTING_USER, TRUE);
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);

      this.dispatchLogin();
      this.authData = authData;
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      this.lockApp({ reset: false });
      throw new AuthenticationError(
        (e as Error).message,
        AUTHENTICATION_FAILED_WALLET_CREATION,
        this.authData,
      );
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
      await this.newWalletVaultAndRestore(password, parsedSeed, clearEngine);
      await this.storePassword(password, authData.currentAuthType);
      await StorageWrapper.setItem(EXISTING_USER, TRUE);
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      this.dispatchLogin();
      this.authData = authData;
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      this.lockApp({ reset: false });
      throw new AuthenticationError(
        (e as Error).message,
        AUTHENTICATION_FAILED_WALLET_CREATION,
        this.authData,
      );
    }
    password = this.wipeSensitiveData();
    parsedSeed = this.wipeSensitiveData();
  };

  /**
   * Manual user password entry for login
   * @param password - password provided by user
   * @param authData - type of authentication required to fetch password from keychain
   */
  userEntryAuth = async (
    password: string,
    authData: AuthData,
  ): Promise<void> => {
    try {
      trace({
        name: TraceName.VaultCreation,
        op: TraceOperation.VaultCreation,
      });
      await this.loginVaultCreation(password);
      endTrace({ name: TraceName.VaultCreation });

      await this.storePassword(password, authData.currentAuthType);
      this.dispatchLogin();
      this.authData = authData;
      this.dispatchPasswordSet();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new AuthenticationError(
        (e as Error).message,
        AUTHENTICATION_FAILED_TO_LOGIN,
        this.authData,
      );
    }
    password = this.wipeSensitiveData();
  };

  /**
   * Attempts to use biometric/pin code/remember me to login
   * @param bioStateMachineId - ID associated with each biometric session.
   * @param disableAutoLogout - Boolean that determines if the function should auto-lock when error is thrown.
   */
  appTriggeredAuth = async (
    options: {
      bioStateMachineId?: string;
      disableAutoLogout?: boolean;
    } = {},
  ): Promise<void> => {
    const bioStateMachineId = options?.bioStateMachineId;
    const disableAutoLogout = options?.disableAutoLogout;
    try {
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const credentials: any = await SecureKeychain.getGenericPassword();

      const password = credentials?.password;
      if (!password) {
        throw new AuthenticationError(
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
          AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
          this.authData,
        );
      }
      trace({
        name: TraceName.VaultCreation,
        op: TraceOperation.VaultCreation,
      });
      await this.loginVaultCreation(password);
      endTrace({ name: TraceName.VaultCreation });

      this.dispatchLogin();
      ReduxService.store.dispatch(authSuccess(bioStateMachineId));
      this.dispatchPasswordSet();
      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      ReduxService.store.dispatch(authError(bioStateMachineId));
      !disableAutoLogout && this.lockApp({ reset: false });
      throw new AuthenticationError(
        (e as Error).message,
        AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
        this.authData,
      );
    }
  };

  /**
   * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
   */
  lockApp = async ({ reset = true, locked = false } = {}): Promise<void> => {
    const { KeyringController } = Engine.context;
    if (reset) await this.resetPassword();
    if (KeyringController.isUnlocked()) {
      await KeyringController.setLocked();
    }
    this.authData = { currentAuthType: AUTHENTICATION_TYPE.UNKNOWN };
    this.dispatchLogout();
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked } }],
    });
  };

  getType = async (): Promise<AuthData> =>
    await this.checkAuthenticationMethod();

  createAndBackupSeedPhrase = async(
    password: string,
  ): Promise<void> => {
    const { SeedlessOnboardingController } = Engine.context;
    // rollback on fail ( reset wallet )
    await this.createWalletVaultAndKeychain(password);
    try {
      const seedPhrase =  await getSeedPhrase(password);

      Logger.log('SeedlessOnboardingController state', SeedlessOnboardingController.state);

      await SeedlessOnboardingController.createToprfKeyAndBackupSeedPhrase(
        password,
        seedPhrase,
      );
    } catch(error) {
        await this.newWalletAndKeychain(`${Date.now()}`, {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        });
        await resetVaultBackup();
        throw error;
    } finally {
      this.dispatchOauth2Reset();
    }

    Logger.log('SeedlessOnboardingController state', SeedlessOnboardingController.state);
  };

  rehydrateSeedPhrase = async(
    password: string,
    authData: AuthData,
  ): Promise<void> => {
    try {
      const { SeedlessOnboardingController } = Engine.context;

      const result = await SeedlessOnboardingController.fetchAllSeedPhrases(password);

      if (result !== null && result.length > 0) {
        const seedPhrase = uint8ArrayToMnemonic(result.at(-1) ?? new Uint8Array(), wordlist);
        await this.newWalletAndRestore(password, authData, seedPhrase, false);
        // add in more srps
        if (result.length > 1) {
          // for (const item of result.slice(0, -1)) {
            // vault add new seedphrase
            // const { KeyringController } = Engine.context;
            // await KeyringController.addSRP(item, password);
          // }
        }
      } else {
        throw new Error('No account data found');
      }
    } catch(error) {
      Logger.error(error as Error, {
        message: 'rehydrateSeedPhrase',
      });
      throw error;
    } finally {
      this.dispatchOauth2Reset();
    }
  };
}

export const Authentication = new AuthenticationService();
