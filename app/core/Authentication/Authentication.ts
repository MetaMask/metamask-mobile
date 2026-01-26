import SecureKeychain from '../SecureKeychain';
import Engine from '../Engine';
import { Engine as EngineClass } from '../Engine/Engine';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  SEED_PHRASE_HINTS,
  OPTIN_META_METRICS_UI_SEEN,
  PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
} from '../../constants/storage';
import {
  authSuccess,
  authError,
  logIn,
  logOut,
  passwordSet,
  setExistingUser,
  setIsConnectionRemoved,
} from '../../actions/user';
import { setCompletedOnboarding } from '../../actions/onboarding';
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
import { isMultichainAccountsState2Enabled } from '../../multichain-accounts/remote-feature-flag';
import { TraceName, TraceOperation, trace, endTrace } from '../../util/trace';
import { discoverAccounts } from '../../multichain-accounts/discovery';
import ReduxService from '../redux';
import { retryWithExponentialDelay } from '../../util/exponential-retry';
import {
  WALLET_SNAP_MAP,
  MultichainWalletSnapFactory,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';

import { selectExistingUser } from '../../reducers/user/selectors';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import {
  convertMnemonicToWordlistIndices,
  uint8ArrayToMnemonic,
} from '../../util/mnemonic';
import Logger from '../../util/Logger';
import { clearAllVaultBackups } from '../BackupVault/backupVault';
import OAuthService from '../OAuthService/OAuthService';
import {
  AccountImportStrategy,
  KeyringMetadata,
  KeyringTypes,
} from '@metamask/keyring-controller';
import {
  SecretType,
  SeedlessOnboardingControllerErrorMessage,
  EncAccountDataType,
  SeedlessOnboardingMigrationVersion,
} from '@metamask/seedless-onboarding-controller';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';
import { selectSeedlessOnboardingLoginFlow } from '../../selectors/seedlessOnboardingController';
import { selectCompletedOnboarding } from '../../selectors/onboarding';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { add0x, bytesToHex, hexToBytes, remove0x } from '@metamask/utils';
import { getTraceTags } from '../../util/sentry/tags';
import { toChecksumHexAddress } from '@metamask/controller-utils';
import AccountTreeInitService from '../../multichain-accounts/AccountTreeInitService';
import { renewSeedlessControllerRefreshTokens } from '../OAuthService/SeedlessControllerHelper';
import { EntropySourceId } from '@metamask/keyring-api';
import { trackVaultCorruption } from '../../util/analytics/vaultCorruptionTracking';
import MetaMetrics from '../Analytics/MetaMetrics';
import { MetricsEventBuilder } from '../Analytics/MetricsEventBuilder';
import { MetaMetricsEvents } from '../Analytics/MetaMetrics.events';
import { captureException } from '@sentry/react-native';
import { resetProviderToken as depositResetProviderToken } from '../../components/UI/Ramp/Deposit/utils/ProviderTokenVault';
import { setAllowLoginWithRememberMe } from '../../actions/security';
import { Alert } from 'react-native';
import { strings } from '../../../locales/i18n';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';
import { IconName } from '../../component-library/components/Icons/Icon';
import { ReauthenticateErrorType } from './types';

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

  private async dispatchLogin(
    options: {
      clearAccountTreeState: boolean;
    } = {
      clearAccountTreeState: false,
    },
  ): Promise<void> {
    if (options.clearAccountTreeState) {
      AccountTreeInitService.clearState();
    }
    await AccountTreeInitService.initializeAccountTree();

    const { MultichainAccountService } = Engine.context;
    await MultichainAccountService.init();

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
   * This method gets the primary entropy source ID. It assumes it's always being defined, which means, vault
   * creation must have been executed beforehand.
   * @returns Primary entropy source ID (similar to keyring ID).
   */
  private getPrimaryEntropySourceId(): EntropySourceId {
    return Engine.context.KeyringController.state.keyrings[0].metadata.id;
  }

  /**
   * This method gets the entropy source IDs for all HD wallets.
   * @returns All known entropy source IDs.
   */
  private getEntropySourceIds(): EntropySourceId[] {
    return Engine.context.KeyringController.state.keyrings
      .filter((keyring) => keyring.type === KeyringTypes.hd)
      .map((keyring) => keyring.metadata.id);
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

      // renew refresh token
      renewSeedlessControllerRefreshTokens(password).catch((err) => {
        Logger.error(err, 'Failed to renew refresh token');
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

    if (!isMultichainAccountsState2Enabled()) {
      Promise.all(
        Object.values(WalletClientType).map(async (clientType) => {
          const { discoveryStorageId } = WALLET_SNAP_MAP[clientType];

          try {
            await this.attemptAccountDiscovery(clientType);
          } catch (error) {
            console.warn(
              'Account discovery failed during wallet creation:',
              clientType,
              error,
            );
            // Store flag to retry on next unlock
            await StorageWrapper.setItem(discoveryStorageId, TRUE);
          }
        }),
      ).catch(console.error);
    }

    password = this.wipeSensitiveData();
    parsedSeed = this.wipeSensitiveData();
  };

  private retryAccountDiscovery = async (discovery: () => Promise<void>) => {
    try {
      await retryWithExponentialDelay(
        discovery,
        3, // maxRetries
        1000, // baseDelay
        10000, // maxDelay
      );
    } catch (error) {
      console.error('Account discovery failed after all retries:', error);
    }
  };

  private attemptAccountDiscovery = async (
    clientType: WalletClientType,
  ): Promise<void> => {
    await this.retryAccountDiscovery(async (): Promise<void> => {
      const primaryHdKeyringId =
        Engine.context.KeyringController.state.keyrings[0].metadata.id;
      const client = MultichainWalletSnapFactory.createClient(clientType, {
        setSelectedAccount: false,
      });
      const { discoveryScope, discoveryStorageId } =
        WALLET_SNAP_MAP[clientType];

      await client.addDiscoveredAccounts(primaryHdKeyringId, discoveryScope);
      await StorageWrapper.removeItem(discoveryStorageId);
    });
  };

  private attemptMultichainAccountWalletDiscovery = async (
    entropySource?: EntropySourceId,
  ): Promise<void> => {
    await this.retryAccountDiscovery(async (): Promise<void> => {
      await discoverAccounts(entropySource ?? this.getPrimaryEntropySourceId());
    });
  };

  private postLoginAsyncOperations = async (): Promise<void> => {
    if (isMultichainAccountsState2Enabled()) {
      // READ THIS CAREFULLY:
      // There is is/was a bug with Snap accounts that can be desynchronized (Solana). To
      // automatically "fix" this corrupted state, we run this method which will re-sync
      // MetaMask accounts and Snap accounts upon login.
      try {
        const { MultichainAccountService } = Engine.context;
        await MultichainAccountService.resyncAccounts();
      } catch (error) {
        console.warn('Failed to resync accounts:', error);
      }

      // We just re-run the same discovery here.
      // 1. Each wallets know their highest group index and restart the discovery from
      // there, thus acting naturally as a "retry".
      // 2. Running the discovery every time allow to auto-discover accounts that could
      // have been added on external wallets.
      // 3. We run the alignment at the end of the discovery, thus, automatically
      // creating accounts for new account providers.
      await Promise.allSettled(
        this.getEntropySourceIds().map(
          async (entropySource) =>
            await this.attemptMultichainAccountWalletDiscovery(entropySource),
        ),
      );
    } else {
      // Try to complete any pending account discovery
      await Promise.all(
        Object.values(WalletClientType).map(async (clientType) => {
          const { discoveryStorageId } = WALLET_SNAP_MAP[clientType];

          try {
            const isPending = await StorageWrapper.getItem(discoveryStorageId);
            if (isPending === TRUE) {
              await this.attemptAccountDiscovery(clientType);
            }
          } catch (error) {
            console.warn('Failed to check/retry discovery:', clientType, error);
          }
        }),
      );
    }
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

    if (!isMultichainAccountsState2Enabled()) {
      Promise.all(
        Object.values(WalletClientType).map(async (clientType) => {
          const { discoveryStorageId } = WALLET_SNAP_MAP[clientType];

          try {
            await this.attemptAccountDiscovery(clientType);
          } catch (error) {
            console.warn(
              'Account discovery failed during wallet creation:',
              error,
            );
            // Store flag to retry on next unlock
            await StorageWrapper.setItem(discoveryStorageId, TRUE);
          }
        }),
      ).catch(console.error);
    }

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
    const passcodePreviouslyDisabled =
      await StorageWrapper.getItem(PASSCODE_DISABLED);

    // Remember me should take priority over biometric/passcode
    const existingUser = selectExistingUser(ReduxService.store.getState());
    const allowLoginWithRememberMe =
      ReduxService.store.getState().security?.allowLoginWithRememberMe;
    if (existingUser && allowLoginWithRememberMe) {
      const credentials = await SecureKeychain.getGenericPassword();
      if (credentials?.password) {
        return {
          currentAuthType: AUTHENTICATION_TYPE.REMEMBER_ME,
          availableBiometryType,
        };
      }
    }

    if (
      availableBiometryType &&
      !(biometryPreviouslyDisabled && biometryPreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        availableBiometryType,
      };
    }
    // Then check passcode
    if (
      availableBiometryType &&
      !(passcodePreviouslyDisabled && passcodePreviouslyDisabled === TRUE)
    ) {
      return {
        currentAuthType: AUTHENTICATION_TYPE.PASSCODE,
        availableBiometryType,
      };
    }
    // Default to password
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
   * Stores a user password in the secure keychain with a specific auth type.
   * This is the single source of truth for password persistence and manages
   * all related storage flags to ensure authentication types are mutually exclusive.
   *
   * @param password - password provided by user
   * @param authType - type of authentication required to fetch password from keychain
   * @protected
   */
  protected storePassword = async (
    password: string,
    authType: AUTHENTICATION_TYPE,
  ): Promise<void> => {
    try {
      // Store password in keychain with appropriate type
      switch (authType) {
        case AUTHENTICATION_TYPE.BIOMETRIC:
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.BIOMETRICS,
          );
          await StorageWrapper.removeItem(BIOMETRY_CHOICE_DISABLED);
          await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

          break;
        case AUTHENTICATION_TYPE.PASSCODE:
          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.PASSCODE,
          );
          await StorageWrapper.removeItem(PASSCODE_DISABLED);
          await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          break;
        case AUTHENTICATION_TYPE.REMEMBER_ME: {
          // Store the current auth type before switching to remember me
          const currentAuthData = await this.checkAuthenticationMethod();
          // Only store if we're not already on remember me
          if (
            currentAuthData.currentAuthType !== AUTHENTICATION_TYPE.REMEMBER_ME
          ) {
            await StorageWrapper.setItem(
              PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
              currentAuthData.currentAuthType,
            );
          }

          await SecureKeychain.setGenericPassword(
            password,
            SecureKeychain.TYPES.REMEMBER_ME,
          );
          // SecureKeychain.setGenericPassword handles flag management for REMEMBER_ME
          // (sets BIOMETRY_CHOICE_DISABLED and PASSCODE_DISABLED to disable biometric/passcode)
          break;
        }
        case AUTHENTICATION_TYPE.PASSWORD: {
          await SecureKeychain.setGenericPassword(password, undefined);
          // Password only: disable both biometrics and passcode
          await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

          // If remember me is enabled, clear the stored previous auth type
          // because the user is disabling biometrics/passcode, so we shouldn't restore to them
          const allowLoginWithRememberMe =
            ReduxService.store.getState().security?.allowLoginWithRememberMe;
          if (allowLoginWithRememberMe) {
            await StorageWrapper.removeItem(
              PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
            );
          }
          break;
        }
        default:
          await SecureKeychain.setGenericPassword(password, undefined);
          // Default to password behavior: disable both
          await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
          await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
          break;
      }
      this.dispatchPasswordSet();
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
   * store password with fallback to password authType if the storePassword with non Password authType fails
   * it should only apply for create wallet, import wallet and reset password flows for now
   *
   * @param password - password to store
   * @param authData - authentication data
   * @returns void
   */
  storePasswordWithFallback = async (password: string, authData: AuthData) => {
    try {
      await this.storePassword(password, authData.currentAuthType);
      this.authData = authData;
    } catch (error) {
      if (authData.currentAuthType === AUTHENTICATION_TYPE.PASSWORD) {
        throw error;
      }
      // Fall back to password authType
      await this.storePassword(password, AUTHENTICATION_TYPE.PASSWORD);
      this.authData = {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        availableBiometryType: authData.availableBiometryType,
      };
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
    const passcodePreviouslyDisabled =
      await StorageWrapper.getItem(PASSCODE_DISABLED);

    if (
      availableBiometryType &&
      biometryChoice &&
      passcodePreviouslyDisabled === TRUE
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

      await this.storePasswordWithFallback(password, authData);
      ReduxService.store.dispatch(setExistingUser(true));
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);

      await this.dispatchLogin({
        clearAccountTreeState: true,
      });
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
      await this.storePasswordWithFallback(password, authData);
      ReduxService.store.dispatch(setExistingUser(true));
      await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      await this.dispatchLogin({
        clearAccountTreeState: true,
      });
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
        await this.rehydrateSeedPhrase(password);
      } else if (await this.checkIsSeedlessPasswordOutdated(false)) {
        // if seedless flow completed && seedless password is outdated, sync the password and unlock the wallet
        await this.syncPasswordAndUnlockWallet(password);
      } else {
        // else srp flow
        await this.loginVaultCreation(password);
      }

      endTrace({ name: TraceName.VaultCreation });

      await this.storePassword(password, authData.currentAuthType);
      await this.dispatchLogin();
      this.authData = authData;

      // We run some post-login operations asynchronously to make login feels smoother and faster (re-sync,
      // discovery...).
      // NOTE: We do not await on purpose, to run those operations in the background.
      // eslint-disable-next-line no-void
      void this.postLoginAsyncOperations();

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

      await this.dispatchLogin();
      ReduxService.store.dispatch(authSuccess(bioStateMachineId));
      this.dispatchPasswordSet();

      // We run some post-login operations asynchronously to make login feels smoother and faster (re-sync,
      // discovery...).
      // NOTE: We do not await on purpose, to run those operations in the background.
      // eslint-disable-next-line no-void
      void this.postLoginAsyncOperations();

      // TODO: Replace "any" with type
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      const errorMessage = (e as Error).message;

      // Track authentication failures that could indicate vault/keychain issues to Segment
      trackVaultCorruption(errorMessage, {
        error_type: 'authentication_service_failure',
        context: 'app_triggered_auth_failed',
      });

      ReduxService.store.dispatch(authError(bioStateMachineId));
      !disableAutoLogout && this.lockApp({ reset: false });
      throw new AuthenticationError(
        errorMessage,
        AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
        this.authData,
      );
    }
  };

  /**
   * Logout and lock keyring contoller. Will require user to enter password. Wipes biometric/pin-code/remember me
   */
  lockApp = async ({
    allowRememberMe = undefined as boolean | undefined,
    reset = true,
    locked = false,
    navigateToLogin = true,
  } = {}): Promise<void> => {
    const { KeyringController, SeedlessOnboardingController } = Engine.context;
    if (allowRememberMe === false) {
      ReduxService.store.dispatch(setAllowLoginWithRememberMe(false));
    }
    if (reset) await this.resetPassword();
    if (KeyringController.isUnlocked()) {
      await KeyringController.setLocked();
    }

    if (selectSeedlessOnboardingLoginFlow(ReduxService.store.getState())) {
      // SeedlessOnboardingController.setLocked() will not throw, it swallow the error in the function
      await SeedlessOnboardingController.setLocked();
    }

    // async check seedless password outdated skip cache when app lock
    // the function swallowed the error
    this.checkIsSeedlessPasswordOutdated(true);

    this.authData = { currentAuthType: AUTHENTICATION_TYPE.UNKNOWN };
    this.dispatchLogout();
    if (navigateToLogin) {
      NavigationService.navigation?.reset({
        routes: [{ name: Routes.ONBOARDING.LOGIN, params: { locked } }],
      });
    }
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

      // New users already have dataType set on their secrets during creation,
      // so we mark the migration as complete to prevent it from running
      SeedlessOnboardingController.setMigrationVersion(
        SeedlessOnboardingMigrationVersion.V1,
      );

      this.dispatchOauthReset();
    } catch (error) {
      // Clear vault backups BEFORE creating temporary wallet
      await clearAllVaultBackups();

      // Disable automatic vault backups during OAuth error recovery
      EngineClass.disableAutomaticVaultBackup = true;

      try {
        await this.newWalletAndKeychain(`${Date.now()}`, {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        });
      } finally {
        // ALWAYS re-enable automatic backups, even if error occurs
        EngineClass.disableAutomaticVaultBackup = false;
      }

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

    const allErrors: Error[] = [];
    for (const secret of otherSecrets) {
      try {
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
            const encodedSrp = uint8ArrayToMnemonic(secret.data, wordlist);
            const mnemonicToRestore = encodedSrp;

            // import the new mnemonic to the current vault
            const keyringMetadata =
              await this.importSeedlessMnemonicToVault(mnemonicToRestore);

            // discover multichain accounts from imported srp
            if (isMultichainAccountsState2Enabled()) {
              // NOTE: Initial implementation of discovery was not awaited, thus we also follow this pattern here.
              this.attemptMultichainAccountWalletDiscovery(keyringMetadata.id);
            } else {
              this.addMultichainAccounts([keyringMetadata]);
            }
          } else {
            Logger.error(
              new Error('SeedlessOnboardingController: Unknown secret type'),
              secret.type,
            );
          }
        }
      } catch (error) {
        allErrors.push(error as Error);
        Logger.error(error as Error, 'Seedless - syncSeedPhrases error');
      }
    }
    if (allErrors.length > 0) {
      // throw first error
      throw allErrors[0];
    }
  };

  importSeedlessMnemonicToVault = async (
    mnemonic: string,
  ): Promise<KeyringMetadata> => {
    const isSeedlessOnboardingFlow =
      Engine.context.SeedlessOnboardingController.state.vault != null;

    if (!isSeedlessOnboardingFlow) {
      throw new Error('Not in seedless onboarding flow');
    }
    const { KeyringController, SeedlessOnboardingController } = Engine.context;

    const keyringMetadata = await KeyringController.addNewKeyring(
      KeyringTypes.hd,
      {
        mnemonic,
        numberOfAccounts: 1,
      },
    );

    const id = keyringMetadata.id;

    const [newAccountAddress] = await KeyringController.withKeyring(
      { id },
      async ({ keyring }) => keyring.getAccounts(),
    );

    // if social backup is requested, add the seed phrase backup
    const seedPhraseAsBuffer = Buffer.from(mnemonic, 'utf8');
    const seedPhraseAsUint8Array = convertMnemonicToWordlistIndices(
      seedPhraseAsBuffer,
      wordlist,
    );

    try {
      SeedlessOnboardingController.updateBackupMetadataState({
        keyringId: id,
        data: seedPhraseAsUint8Array,
        type: SecretType.Mnemonic,
      });
    } catch (error) {
      // handle seedless controller import error by reverting keyring controller mnemonic import
      // KeyringController.removeAccount will remove keyring when it's emptied, currently there are no other method in keyring controller to remove keyring
      await KeyringController.removeAccount(newAccountAddress);
      throw error;
    }

    return keyringMetadata;
  };

  addNewPrivateKeyBackup = async (
    privateKey: string,
    keyringId: string,
    syncWithSocial = true,
  ): Promise<void> => {
    const { SeedlessOnboardingController } = Engine.context;
    const bufferedPrivateKey = hexToBytes(add0x(privateKey));

    if (syncWithSocial) {
      // Run data type migration before adding new private key to ensure data consistency.
      await this.runSeedlessOnboardingMigrations();

      await SeedlessOnboardingController.addNewSecretData(
        bufferedPrivateKey,
        EncAccountDataType.ImportedPrivateKey,
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
  ): Promise<boolean> => {
    const isPasswordOutdated = await this.checkIsSeedlessPasswordOutdated(true);
    if (isPasswordOutdated) {
      return false;
    }

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
    return true;
  };

  /**
   * Temporary function until the attempt discovery support multi srp acccount discovery
   * Add multichain accounts to the keyring
   *
   * @param keyringMetadataList - List of keyring metadata
   */
  addMultichainAccounts = async (
    keyringMetadataList: KeyringMetadata[],
  ): Promise<void> => {
    for (const keyringMetadata of keyringMetadataList) {
      for (const clientType of Object.values(WalletClientType)) {
        const id = keyringMetadata.id;
        const { discoveryScope } = WALLET_SNAP_MAP[clientType];
        const multichainClient =
          MultichainWalletSnapFactory.createClient(clientType);

        await multichainClient.addDiscoveredAccounts(id, discoveryScope);
      }
    }
  };

  rehydrateSeedPhrase = async (password: string): Promise<void> => {
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
        allSRPs =
          await SeedlessOnboardingController.fetchAllSecretData(password);
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

        await this.newWalletVaultAndRestore(password, seedPhrase, false);
        // add in more srps
        const keyringMetadataList: KeyringMetadata[] = [];
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
                const keyringMetadata =
                  await this.importSeedlessMnemonicToVault(mnemonic);
                keyringMetadataList.push(keyringMetadata);
              } else {
                Logger.error(
                  new Error(
                    'SeedlessOnboardingController : Unknown secret type',
                  ),
                  item.type,
                );
              }
            } catch (error) {
              // catch error to prevent unable to login
              Logger.error(
                error as Error,
                'Error in rehydrateSeedPhrase- SeedlessOnboardingController',
              );
            }
          }
        }
        await this.syncKeyringEncryptionKey();

        if (isMultichainAccountsState2Enabled()) {
          for (const { id } of keyringMetadataList) {
            // NOTE: Initial implementation of discovery was not awaited, thus we also follow this pattern here.
            this.attemptMultichainAccountWalletDiscovery(id);
          }
        } else {
          this.addMultichainAccounts(keyringMetadataList);
        }

        this.dispatchOauthReset();

        ReduxService.store.dispatch(setExistingUser(true));
        await StorageWrapper.removeItem(SEED_PHRASE_HINTS);
      } else {
        throw new Error('No account data found');
      }
    } catch (error) {
      this.lockApp({ reset: false, navigateToLogin: false });
      Logger.log(error);
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
      Logger.log(
        seedlessSyncError,
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
        await this.rehydrateSeedPhrase(globalPassword);
        // skip the rest of the flow ( change password and sync keyring encryption key)
        ReduxService.store.dispatch(setIsConnectionRemoved(true));
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
        // Case 3: Both keyring and seedless controller password verification failed.
        Logger.error(
          seedlessSyncError as Error,
          'Error in syncPasswordAndUnlockWallet',
        );
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
      renewSeedlessControllerRefreshTokens(globalPassword).catch((err) => {
        Logger.error(err, 'Failed to renew refresh token');
      });
    } catch (err) {
      // lock app again on error after submitPassword succeeded
      await this.lockApp({ locked: true });
      throw err;
    }
    await this.resetPassword();
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
   * Checks if the seedless password is outdated and shows a modal if it is.
   * This method verifies the outdated state and navigates to show the password outdated modal.
   *
   * @param {boolean} isSeedlessPasswordOutdated - whether the seedless password is marked as outdated in state
   * @returns {Promise<void>}
   */
  checkAndShowSeedlessPasswordOutdatedModal = async (
    isSeedlessPasswordOutdated: boolean,
  ): Promise<void> => {
    if (!isSeedlessPasswordOutdated) {
      return;
    }

    // Check for latest seedless password outdated state
    // isSeedlessPasswordOutdated is true when navigate to wallet main screen after login with password sync
    const isOutdated = await this.checkIsSeedlessPasswordOutdated(false);
    if (!isOutdated) {
      return;
    }

    // show seedless password outdated modal and force user to lock app
    NavigationService.navigation?.navigate(Routes.MODAL.ROOT_MODAL_FLOW, {
      screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
      params: {
        title: strings('login.seedless_password_outdated_modal_title'),
        description: strings('login.seedless_password_outdated_modal_content'),
        primaryButtonLabel: strings(
          'login.seedless_password_outdated_modal_confirm',
        ),
        type: 'error',
        icon: IconName.Danger,
        isInteractable: false,
        onPrimaryButtonPress: async () => {
          await this.lockApp({ locked: true });
        },
        closeOnPrimaryButtonPress: true,
      },
    });
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

  /**
   * Runs seedless onboarding migrations if needed.
   *
   * Delegates to SeedlessOnboardingController.runMigrations() which handles
   * version tracking and migration logic. Called before adding new secret data
   * to ensure data type consistency and correct ordering.
   */
  runSeedlessOnboardingMigrations = async (): Promise<void> => {
    const { SeedlessOnboardingController } = Engine.context;
    const state = ReduxService.store.getState();
    const completedOnboarding = selectCompletedOnboarding(state);

    if (!completedOnboarding) {
      return;
    }

    try {
      await SeedlessOnboardingController.runMigrations();

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.SEEDLESS_ONBOARDING_MIGRATION_COMPLETED,
        )
          .addProperties({
            migration_version:
              SeedlessOnboardingController.state?.migrationVersion,
          })
          .build(),
      );
    } catch (error) {
      const isError = error instanceof Error;
      const errorMessage = isError ? error.message : 'Unknown error';

      MetaMetrics.getInstance().trackEvent(
        MetricsEventBuilder.createEventBuilder(
          MetaMetricsEvents.SEEDLESS_ONBOARDING_MIGRATION_FAILED,
        )
          .addProperties({
            migration_version:
              SeedlessOnboardingController.state?.migrationVersion,
            error: errorMessage,
          })
          .build(),
      );
      captureException(isError ? error : new Error(errorMessage));
      throw error;
    }
  };

  /**
   * Deletes the wallet by resetting wallet state and deleting user data.
   * This is the main public method for wallet deletion/reset flows.
   * It calls resetWalletState() followed by deleteUser(), and also clears
   * metrics opt-in UI state and resets onboarding completion status.
   *
   * @returns {Promise<void>}
   */
  deleteWallet = async (): Promise<void> => {
    await this.resetWalletState();
    await this.deleteUser();
    // Clear metrics opt-in UI state and reset onboarding completion
    await StorageWrapper.removeItem(OPTIN_META_METRICS_UI_SEEN);
    ReduxService.store.dispatch(setCompletedOnboarding(false));
  };

  /**
   * Resets the wallet state by creating a new wallet and clearing all related state.
   * This is used during wallet deletion/reset flows.
   * Protected method - use deleteWallet() instead for complete wallet deletion.
   *
   * @returns {Promise<void>}
   */
  protected async resetWalletState(): Promise<void> {
    try {
      // Clear vault backups BEFORE creating temporary wallet
      await clearAllVaultBackups();

      // CRITICAL: Disable automatic vault backups during wallet RESET
      // This prevents the temporary wallet (created during reset) from being backed up
      EngineClass.disableAutomaticVaultBackup = true;

      try {
        await this.newWalletAndKeychain(`${Date.now()}`, {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        });

        Engine.context.SeedlessOnboardingController.clearState();

        await depositResetProviderToken();

        await Engine.controllerMessenger.call('RewardsController:resetAll');

        // Lock the app and navigate to onboarding
        await this.lockApp({ navigateToLogin: false });
      } finally {
        // ALWAYS re-enable automatic vault backups, even if error occurs
        EngineClass.disableAutomaticVaultBackup = false;
      }
    } catch (error) {
      const errorMsg = `Failed to createNewVaultAndKeychain: ${error}`;
      Logger.log(error, errorMsg);
    }
  }

  /**
   * Deletes user data by setting existing user state to false and creating a data deletion task.
   * This is used during wallet deletion flows.
   * Protected method - use deleteWallet() instead for complete wallet deletion.
   *
   * @returns {Promise<void>}
   */
  protected async deleteUser(): Promise<void> {
    try {
      ReduxService.store.dispatch(setExistingUser(false));
      await MetaMetrics.getInstance().createDataDeletionTask();
    } catch (error) {
      const errorMsg = `Failed to reset existingUser state in Redux`;
      Logger.log(error, errorMsg);
    }
  }

  /**
   * Updates the authentication preference for the user.
   * If password is provided, uses it directly. Otherwise, gets password from keychain.
   * Validates the password and stores it with the new auth type.
   * Manages storage flags (BIOMETRY_CHOICE_DISABLED, PASSCODE_DISABLED) based on auth type.
   * Throws AuthenticationError if password is not found in keychain and not provided.
   * Callers should handle navigation to password entry screen when this error is thrown.
   *
   * @param options - Options for updating auth preference
   * @param options.authType - type of authentication to use (BIOMETRIC, PASSCODE, or PASSWORD)
   * @param options.password - optional password to use. If not provided, gets from keychain.
   * @returns {Promise<void>}
   * @throws {AuthenticationError} when password is not found and not provided
   */
  updateAuthPreference = async (options: {
    authType: AUTHENTICATION_TYPE;
    password?: string;
  }): Promise<void> => {
    const { authType, password } = options;
    // Password found or provided. Validate and update the auth preference.
    try {
      const passwordToUse = await this.reauthenticate(password);

      // TODO: Check if this is really needed for IOS (if so, userEntryAuth is not calling it, and we should move the reset to storePassword)
      await this.resetPassword();

      // storePassword handles all storage flag management internally
      await this.storePassword(passwordToUse.password, authType);
    } catch (e) {
      const errorWithMessage = e as { message: string };

      // Check if the error is because password is not set with biometrics
      // Convert it to AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS so UI can handle it
      if (
        errorWithMessage.message.includes(
          ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
        )
      ) {
        throw new AuthenticationError(
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
          AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
          this.authData,
        );
      }

      if (errorWithMessage.message === 'Invalid password') {
        Alert.alert(
          strings('app_settings.invalid_password'),
          strings('app_settings.invalid_password_message'),
        );
        trackErrorAsAnalytics(
          'SecuritySettings: Invalid password',
          errorWithMessage?.message,
          '',
        );
      } else {
        Logger.error(e as unknown as Error, 'SecuritySettings:biometrics');
      }
      throw e;
    }
  };

  /**
   * If a password is provided, it is verified directly. Otherwise, this method
   * attempts to read the biometric preference from storage and, when enabled,
   * retrieves the stored credentials via `getPassword` and verifies the stored password.
   *
   * The method resolves with the verified password string on success and
   * propagates any error thrown by `KeyringController.verifyPassword`.
   *
   * @param password - Optional password to verify. When omitted, the method
   * attempts to use the stored biometric/remember-me password instead.
   * @returns The verified password string. Throws an error if verification fails
   * before a password can be determined.
   */
  reauthenticate = async (password?: string): Promise<{ password: string }> => {
    let passwordToVerify = password || '';
    const { KeyringController } = Engine.context;

    // if no password is provided, try to use the stored biometric/remember-me password
    if (!passwordToVerify) {
      try {
        const credentials = await this.getPassword();
        if (credentials) {
          passwordToVerify = credentials.password;
        }
      } catch (e) {
        const error = e as Error;
        // TODO: May want to triage errors here and throw different errors based on the error type
        // For example, getPassword throws with `User canceled the operation` when biometrics is canceled or fails
        // Disallowing biometrics on system level will not throw an error and just return empty credentials
        throw new Error(
          `${ReauthenticateErrorType.BIOMETRIC_ERROR}: ${error.message}`,
        );
      }

      // If there is no biometric choice configured or no stored credentials,
      // throw a specific error instead of attempting to verify an empty password.
      if (!passwordToVerify) {
        const passwordNotSetWithBiometricsErrorMessage =
          'No password stored with biometrics in keychain.';
        throw new Error(
          `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: ${passwordNotSetWithBiometricsErrorMessage}`,
        );
      }
    }

    await KeyringController.verifyPassword(passwordToVerify);
    return { password: passwordToVerify };
  };

  /**
   * Reveals the secret recovery phrase (SRP) for the specified keyring
   * after verifying the provided password via `reauthenticate`.
   *
   * @param password - The password used to authenticate the user.
   * @param keyringId - The identifier of the keyring whose SRP will be exported.
   * @returns The mnemonic SRP associated with the provided keyring.
   */
  revealSRP = async (password: string, keyringId?: string): Promise<string> => {
    const { KeyringController } = Engine.context;
    await this.reauthenticate(password);
    const rawSeedPhrase = await KeyringController.exportSeedPhrase(
      password,
      keyringId,
    );
    const seedPhrase = uint8ArrayToMnemonic(rawSeedPhrase, wordlist);
    return seedPhrase;
  };

  /**
   * Reveals the private key for the given account address after verifying
   * the provided password via `reauthenticate`.
   *
   * @param password - The password used to authenticate the user.
   * @param address - The account address whose private key will be exported.
   * @returns The hex-encoded private key for the specified address.
   */
  revealPrivateKey = async (
    password: string,
    address: string,
  ): Promise<string> => {
    const { KeyringController } = Engine.context;
    await this.reauthenticate(password);
    const privateKey = await KeyringController.exportAccount(password, address);
    return privateKey;
  };
}

export const Authentication = new AuthenticationService();
