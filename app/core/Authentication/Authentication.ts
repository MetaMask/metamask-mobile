import SecureKeychain from '../SecureKeychain';
import Engine from '../Engine';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  SEED_PHRASE_HINTS,
  SOLANA_DISCOVERY_PENDING,
} from '../../constants/storage';
import {
  authSuccess,
  authError,
  logIn,
  logOut,
  passwordSet,
  setExistingUser,
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
import { TraceName, TraceOperation, trace, endTrace } from '../../util/trace';
import ReduxService from '../redux';
import { retryWithExponentialDelay } from '../../util/exponential-retry';
///: BEGIN:ONLY_INCLUDE_IF(solana)
import {
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
///: END:ONLY_INCLUDE_IF

import { selectExistingUser } from '../../reducers/user/selectors';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import {
  convertEnglishWordlistIndicesToCodepoints,
  convertMnemonicToWordlistIndices,
  uint8ArrayToMnemonic,
} from '../../util/mnemonic';
import Logger from '../../util/Logger';
import { clearAllVaultBackups } from '../BackupVault/backupVault';
import OAuthService from '../OAuthService/OAuthService';
import {
  AccountImportStrategy,
  KeyringTypes,
} from '@metamask/keyring-controller';
import {
  SecretType,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { SolScope } from '@metamask/keyring-api';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { add0x, bytesToHex, hexToBytes, remove0x } from '@metamask/utils';
import { getTraceTags } from '../../util/sentry/tags';
import { toChecksumHexAddress } from '@metamask/controller-utils';

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

  private dispatchOauthReset(): void {
    OAuthService.resetOauthState();
  }

  /**
   * This method recreates the vault upon login if user is new and is not using the latest encryption lib
   * @param password - password entered on login
   */
  private loginVaultCreation = async (password: string): Promise<void> => {
    // Restore vault with user entered password
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    await KeyringController.submitPassword(password);
    if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
      await SeedlessOnboardingController.submitPassword(password);
      SeedlessOnboardingController.revokeRefreshToken(password).catch((err) => {
        Logger.error(err, 'Failed to revoke refresh token');
      });
    }
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
    const { KeyringController } = Engine.context;
    if (clearEngine) await Engine.resetState();
    const parsedSeedUint8Array = mnemonicPhraseToBytes(parsedSeed);
    await KeyringController.createNewVaultAndRestore(
      password,
      parsedSeedUint8Array,
    );
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    this.attemptSolanaAccountDiscovery().catch((error) => {
      console.warn(
        'Solana account discovery failed during wallet creation:',
        error,
      );
      // Store flag to retry on next unlock
      StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, TRUE);
    });
    ///: END:ONLY_INCLUDE_IF

    password = this.wipeSensitiveData();
    parsedSeed = this.wipeSensitiveData();
  };

  ///: BEGIN:ONLY_INCLUDE_IF(solana)
  private attemptSolanaAccountDiscovery = async (): Promise<void> => {
    const performSolanaAccountDiscovery = async (): Promise<void> => {
      const primaryHdKeyringId =
        Engine.context.KeyringController.state.keyrings[0].metadata.id;
      const client = MultichainWalletSnapFactory.createClient(
        WalletClientType.Solana,
        {
          setSelectedAccount: false,
        },
      );
      await client.addDiscoveredAccounts(primaryHdKeyringId, SolScope.Mainnet);

      await StorageWrapper.removeItem(SOLANA_DISCOVERY_PENDING);
    };

    try {
      await retryWithExponentialDelay(
        performSolanaAccountDiscovery,
        3, // maxRetries
        1000, // baseDelay
        10000, // maxDelay
      );
    } catch (error) {
      console.error(
        'Solana account discovery failed after all retries:',
        error,
      );
    }
  };

  private retrySolanaDiscoveryIfPending = async (): Promise<void> => {
    try {
      const isPending = await StorageWrapper.getItem(SOLANA_DISCOVERY_PENDING);
      if (isPending === 'true') {
        await this.attemptSolanaAccountDiscovery();
      }
    } catch (error) {
      console.warn('Failed to check/retry Solana discovery:', error);
    }
  };
  ///: END:ONLY_INCLUDE_IF

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

    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    this.attemptSolanaAccountDiscovery().catch((error) => {
      console.warn(
        'Solana account discovery failed during wallet creation:',
        error,
      );
      StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');
    });
    ///: END:ONLY_INCLUDE_IF
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
    const existingUser = selectExistingUser(ReduxService.store.getState());
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
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    // Restore vault with empty password
    await KeyringController.submitPassword('');
    if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
      await SeedlessOnboardingController.clearState();
    }
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
      ReduxService.store.dispatch(setExistingUser(true));
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
      ReduxService.store.dispatch(setExistingUser(true));
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

      if (authData.oauth2Login) {
        // if seedless flow - rehydrate
        await this.rehydrateSeedPhrase(password, authData);
      } else if (await this.checkIsSeedlessPasswordOutdated()) {
        // if seedless flow completed && seedless password is outdated, sync the password and unlock the wallet
        await this.syncPasswordAndUnlockWallet(password, authData);
      } else {
        // else srp flow
        await this.loginVaultCreation(password);
      }

      endTrace({ name: TraceName.VaultCreation });

      await this.storePassword(password, authData.currentAuthType);
      this.dispatchLogin();
      this.authData = authData;
      this.dispatchPasswordSet();

      // Try to complete any pending Solana account discovery
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      this.retrySolanaDiscoveryIfPending();
      ///: END:ONLY_INCLUDE_IF

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      if (e instanceof SeedlessOnboardingControllerError) {
        throw e;
      }

      if ((e as Error).message.includes('SeedlessOnboardingController')) {
        throw e;
      }

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
      // check for seedless password outdated
      const isSeedlessPasswordOutdated =
        await this.checkIsSeedlessPasswordOutdated(false);
      if (isSeedlessPasswordOutdated) {
        throw new AuthenticationError(
          'Seedless password is outdated',
          AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
          this.authData,
        );
      } else {
        await this.loginVaultCreation(password);
      }
      endTrace({ name: TraceName.VaultCreation });

      this.dispatchLogin();
      ReduxService.store.dispatch(authSuccess(bioStateMachineId));
      this.dispatchPasswordSet();

      // Try to complete any pending Solana account discovery
      ///: BEGIN:ONLY_INCLUDE_IF(solana)
      this.retrySolanaDiscoveryIfPending();
      ///: END:ONLY_INCLUDE_IF

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
    // async check seedless password outdated skip cache when app lock
    this.checkIsSeedlessPasswordOutdated(true).catch((err: Error) => {
      Logger.error(
        err,
        'Error in lockApp: checking seedless password outdated',
      );
    });

    this.authData = { currentAuthType: AUTHENTICATION_TYPE.UNKNOWN };
    this.dispatchLogout();
    NavigationService.navigation?.reset({
      routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked } }],
    });
  };

  getType = async (): Promise<AuthData> =>
    await this.checkAuthenticationMethod();

  createAndBackupSeedPhrase = async (password: string): Promise<void> => {
    const { SeedlessOnboardingController, KeyringController } = Engine.context;
    await this.createWalletVaultAndKeychain(password);
    // submit password to unlock keyring ?
    await KeyringController.submitPassword(password);
    try {
      const keyringId = KeyringController.state.keyrings[0]?.metadata.id;
      if (!keyringId) {
        throw new Error('No keyring metadata found');
      }

      const seedPhrase = await KeyringController.exportSeedPhrase(
        password,
        keyringId,
      );

      let createKeyAndBackupSrpSuccess = false;
      try {
        trace({
          name: TraceName.OnboardingCreateKeyAndBackupSrp,
          op: TraceOperation.OnboardingSecurityOp,
        });
        await SeedlessOnboardingController.createToprfKeyAndBackupSeedPhrase(
          password,
          seedPhrase,
          keyringId,
        );
        createKeyAndBackupSrpSuccess = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        trace({
          name: TraceName.OnboardingCreateKeyAndBackupSrpError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage },
        });
        endTrace({
          name: TraceName.OnboardingCreateKeyAndBackupSrpError,
        });

        throw error;
      } finally {
        endTrace({
          name: TraceName.OnboardingCreateKeyAndBackupSrp,
          data: { success: createKeyAndBackupSrpSuccess },
        });
      }

      await this.syncKeyringEncryptionKey();

      this.dispatchOauthReset();
    } catch (error) {
      await this.newWalletAndKeychain(`${Date.now()}`, {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      await clearAllVaultBackups();
      SeedlessOnboardingController.clearState();
      throw error;
    }
  };

  syncSeedPhrases = async (): Promise<void> => {
    const { SeedlessOnboardingController } = Engine.context;
    if (!selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
      return;
    }

    // 1. fetch all seed phrases
    const [rootSecret, ...otherSecrets] =
      await SeedlessOnboardingController.fetchAllSecretData();
    if (!rootSecret) {
      throw new Error('No root SRP found');
    }

    for (const secret of otherSecrets) {
      // import SRP secret
      // Get the SRP hash, and find the hash in the local state
      const secretDataHash =
        SeedlessOnboardingController.getSecretDataBackupState(
          secret.data,
          secret.type,
        );

      if (!secretDataHash) {
        // If SRP is not in the local state, import it to the vault

        // import private key secret
        if (secret.type === SecretType.PrivateKey) {
          await this.importAccountFromPrivateKey(bytesToHex(secret.data), {
            shouldCreateSocialBackup: false,
            shouldSelectAccount: false,
          });
          continue;
        } else if (secret.type === SecretType.Mnemonic) {
          // convert the seed phrase to a mnemonic (string)
          const encodedSrp = convertEnglishWordlistIndicesToCodepoints(
            secret.data,
            wordlist,
          );
          const mnemonicToRestore = Buffer.from(encodedSrp).toString('utf8');

          // import the new mnemonic to the current vault
          await this.importMnemonicToVault(mnemonicToRestore, {
            shouldCreateSocialBackup: false,
            shouldSelectAccount: false,
            shouldImportSolanaAccount: true,
          });
        } else {
          Logger.error(new Error('Unknown secret type'), secret.type);
        }
      }
    }
  };

  importMnemonicToVault = async (
    mnemonic: string,
    options: {
      shouldCreateSocialBackup: boolean;
      shouldSelectAccount: boolean;
      shouldImportSolanaAccount: boolean;
    },
  ): Promise<{
    newAccountAddress: string;
    discoveredAccountsCount: number;
  }> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;

    const { id } = await KeyringController.addNewKeyring(KeyringTypes.hd, {
      mnemonic,
      numberOfAccounts: 1,
    });

    const [newAccountAddress] = await KeyringController.withKeyring(
      { id },
      async ({ keyring }) => keyring.getAccounts(),
    );

    const isSeedlessOnboardingFlow = selectSeedlessOnboardingLoginFlow(
      ReduxService.store.getState(),
    );
    if (isSeedlessOnboardingFlow) {
      // if social backup is requested, add the seed phrase backup
      const seedPhraseAsBuffer = Buffer.from(mnemonic, 'utf8');
      const seedPhraseAsUint8Array = convertMnemonicToWordlistIndices(
        seedPhraseAsBuffer,
        wordlist,
      );

      try {
        if (options.shouldCreateSocialBackup) {
          await SeedlessOnboardingController.addNewSecretData(
            seedPhraseAsUint8Array,
            SecretType.Mnemonic,
            {
              keyringId: id,
            },
          );
        } else {
          SeedlessOnboardingController.updateBackupMetadataState({
            keyringId: id,
            data: seedPhraseAsUint8Array,
            type: SecretType.Mnemonic,
          });
        }
      } catch (error) {
        // handle seedless controller import error by reverting keyring controller mnemonic import
        // KeyringController.removeAccount will remove keyring when it's emptied, currently there are no other method in keyring controller to remove keyring
        await KeyringController.removeAccount(newAccountAddress);
        throw error;
      }
    }

    if (options.shouldSelectAccount) {
      Engine.setSelectedAddress(newAccountAddress);
    }

    let discoveredAccountsCount = 0;
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    if (options.shouldImportSolanaAccount) {
      const multichainClient = MultichainWalletSnapFactory.createClient(
        WalletClientType.Solana,
      );

      discoveredAccountsCount = await multichainClient.addDiscoveredAccounts(
        id,
        SolScope.Mainnet,
      );
    }
    ///: END:ONLY_INCLUDE_IF

    return {
      newAccountAddress,
      discoveredAccountsCount,
    };
  };

  addNewPrivateKeyBackup = async (
    privateKey: string,
    keyringId: string,
    syncWithSocial = true,
  ): Promise<void> => {
    const { SeedlessOnboardingController } = Engine.context;
    const bufferedPrivateKey = hexToBytes(add0x(privateKey));

    if (syncWithSocial) {
      await SeedlessOnboardingController.addNewSecretData(
        bufferedPrivateKey,
        SecretType.PrivateKey,
        {
          keyringId,
        },
      );
    } else {
      // Do not sync the key to the server, only update the local state
      SeedlessOnboardingController.updateBackupMetadataState({
        keyringId,
        data: bufferedPrivateKey,
        type: SecretType.PrivateKey,
      });
    }
  };

  importAccountFromPrivateKey = async (
    privateKey: string,
    options = {
      shouldCreateSocialBackup: true,
      shouldSelectAccount: true,
    },
  ): Promise<void> => {
    trace({
      name: TraceName.ImportEvmAccount,
      op: TraceOperation.ImportAccount,
      tags: getTraceTags(ReduxService.store.getState()),
    });

    const { KeyringController } = Engine.context;
    const importedAccountAddress =
      await KeyringController.importAccountWithStrategy(
        AccountImportStrategy.privateKey,
        [remove0x(privateKey)],
      );

    const isSocialLoginFlow = selectSeedlessOnboardingLoginFlow(
      ReduxService.store.getState(),
    );
    if (isSocialLoginFlow) {
      try {
        await this.addNewPrivateKeyBackup(
          privateKey,
          importedAccountAddress,
          options.shouldCreateSocialBackup,
        );
      } catch (error) {
        // handle seedless controller import error by reverting keyring controller mnemonic import
        // KeyringController.removeAccount will remove keyring when it's emptied, currently there are no other method in keyring controller to remove keyring
        await KeyringController.removeAccount(importedAccountAddress);
        throw error;
      }
    }

    if (options.shouldSelectAccount) {
      const checksummedAddress = toChecksumHexAddress(importedAccountAddress);
      Engine.setSelectedAddress(checksummedAddress);
    }

    endTrace({
      name: TraceName.ImportEvmAccount,
    });
  };

  rehydrateSeedPhrase = async (
    password: string,
    authData: AuthData,
  ): Promise<void> => {
    try {
      const { SeedlessOnboardingController } = Engine.context;
      let allSRPs: Awaited<
        ReturnType<typeof SeedlessOnboardingController.fetchAllSecretData>
      > | null = null;
      let fetchSrpsSuccess = false;
      try {
        trace({
          name: TraceName.OnboardingFetchSrps,
          op: TraceOperation.OnboardingSecurityOp,
        });
        allSRPs = await SeedlessOnboardingController.fetchAllSecretData(
          password,
        );
        fetchSrpsSuccess = true;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown error';

        trace({
          name: TraceName.OnboardingFetchSrpsError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage },
        });
        endTrace({
          name: TraceName.OnboardingFetchSrpsError,
        });

        throw error;
      } finally {
        endTrace({
          name: TraceName.OnboardingFetchSrps,
          data: { success: fetchSrpsSuccess },
        });
      }

      if (allSRPs.length > 0) {
        const [firstSeedPhrase, ...restOfSeedPhrases] = allSRPs;
        if (!firstSeedPhrase?.data) {
          throw new Error('No seed phrase found');
        }

        const seedPhrase = uint8ArrayToMnemonic(firstSeedPhrase.data, wordlist);
        await this.newWalletAndRestore(password, authData, seedPhrase, false);
        // add in more srps
        if (restOfSeedPhrases.length > 0) {
          for (const item of restOfSeedPhrases) {
            try {
              // add new private key
              if (item.type === SecretType.PrivateKey) {
                await this.importAccountFromPrivateKey(bytesToHex(item.data), {
                  shouldCreateSocialBackup: false,
                  shouldSelectAccount: false,
                });
              } else if (item.type === SecretType.Mnemonic) {
                const mnemonic = uint8ArrayToMnemonic(item.data, wordlist);
                await this.importMnemonicToVault(mnemonic, {
                  shouldCreateSocialBackup: false,
                  shouldSelectAccount: false,
                  shouldImportSolanaAccount: true,
                });
              } else {
                Logger.error(new Error('Unknown secret type'), item.type);
              }
            } catch (error) {
              // catch error to prevent unable to login
              Logger.error(error as Error);
            }
          }
        }

        await this.syncKeyringEncryptionKey();

        this.dispatchOauthReset();
      } else {
        throw new Error('No account data found');
      }
    } catch (error) {
      Logger.error(error as Error);
      throw error;
    }
  };

  /**
   * Sync latest global seedless password and override the current device password with latest global password.
   * Unlock the vault with the latest global password.
   *
   * @param {string} globalPassword - latest global seedless password
   */
  syncPasswordAndUnlockWallet = async (
    globalPassword: string,
    authData: AuthData,
  ): Promise<void> => {
    const { SeedlessOnboardingController, KeyringController } = Engine.context;

    const { success: isKeyringPasswordValid } =
      await KeyringController.verifyPassword(globalPassword)
        .then(() => ({ success: true, error: null }))
        .catch((err) => ({ success: false, error: err }));

    // recover the current keyring encryption key
    // here e could be invalid password or outdated password error, which can result in following cases:
    // 1. Seedless controller password verification succeeded.
    // 2. Seedless controller failed but Keyring controller password verification succeeded.
    // 3. Both keyring and seedless controller password verification failed.
    const { success, error: seedlessSyncError } =
      await SeedlessOnboardingController.submitGlobalPassword({
        globalPassword,
        maxKeyChainLength: 20,
      })
        .then(() => ({ success: true, error: null }))
        .catch((err) => ({ success: false, error: err }));

    if (!success) {
      const errorMessage = (seedlessSyncError as Error).message;
      Logger.error(
        seedlessSyncError as Error,
        `error while submitting global password: ${errorMessage}`,
      );

      if (
        errorMessage ===
        SeedlessOnboardingControllerErrorMessage.MaxKeyChainLengthExceeded
      ) {
        // we are unable to recover the old pwd enc key as user is on a very old device.
        // create a new vault and encrypt the new vault with the latest global password.
        // also show a info popup to user.

        // rehydrate with social accounts if max keychain length exceeded
        await SeedlessOnboardingController.refreshAuthTokens();
        await this.rehydrateSeedPhrase(globalPassword, authData);
        // skip the rest of the flow ( change password and sync keyring encryption key)
        return;
      } else if (
        errorMessage ===
        SeedlessOnboardingControllerErrorMessage.IncorrectPassword
      ) {
        // Case 2: Keyring controller password verification succeeds and seedless controller failed.
        if (isKeyringPasswordValid) {
          throw new SeedlessOnboardingControllerError(
            SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
          );
        } else {
          throw seedlessSyncError;
        }
      } else {
        throw seedlessSyncError;
      }
    }

    // password synced successfully
    const keyringEncryptionKey =
      await SeedlessOnboardingController.loadKeyringEncryptionKey();

    // use encryption key to unlock the keyringController vault
    await KeyringController.submitEncryptionKey(keyringEncryptionKey);

    try {
      // update vault password to global password
      await SeedlessOnboardingController.syncLatestGlobalPassword({
        globalPassword,
      });
      await KeyringController.changePassword(globalPassword);
      await this.syncKeyringEncryptionKey();
      SeedlessOnboardingController.revokeRefreshToken(globalPassword).catch(
        (err) => {
          Logger.error(err, 'Failed to revoke refresh token');
        },
      );
    } catch (err) {
      // lock app again on error after submitPassword succeeded
      await this.lockApp({ locked: true });
      throw err;
    }
    await this.resetPassword();

    // set solana discovery pending to true
    ///: BEGIN:ONLY_INCLUDE_IF(solana)
    StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, TRUE);
    ///: END:ONLY_INCLUDE_IF
  };

  /**
   * Checks if the seedless password is outdated.
   *
   * @param {boolean} skipCache - whether to skip the cache
   * @returns {Promise<boolean>} true if the password is outdated, false otherwise, undefined if the flow is not seedless
   */
  checkIsSeedlessPasswordOutdated = async (
    skipCache: boolean = true,
  ): Promise<boolean> => {
    const { SeedlessOnboardingController } = Engine.context;
    if (!selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
      return false;
    }
    try {
      const isSeedlessPasswordOutdated =
        await SeedlessOnboardingController.checkIsPasswordOutdated({
          skipCache,
        });
      return isSeedlessPasswordOutdated;
    } catch (error) {
      Logger.error(error as Error, 'Error in checkIsSeedlessPasswordOutdated');
      return false;
    }
  };

  /**
   * Syncs the keyring encryption key with the seedless onboarding controller.
   *
   * @returns {Promise<void>}
   */
  syncKeyringEncryptionKey = async (): Promise<void> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    // store the keyring encryption key in the seedless onboarding controller
    const keyringEncryptionKey = await KeyringController.exportEncryptionKey();
    await SeedlessOnboardingController.storeKeyringEncryptionKey(
      keyringEncryptionKey,
    );
  };
}

export const Authentication = new AuthenticationService();
