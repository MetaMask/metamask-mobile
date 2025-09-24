import StorageWrapper from '../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  SOLANA_DISCOVERY_PENDING,
} from '../../constants/storage';
import { Authentication } from './Authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import SecureKeychain from '../SecureKeychain';
import ReduxService, { ReduxStore } from '../redux';
import AuthenticationError from './AuthenticationError';
import {
  AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
  AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
  AUTHENTICATION_FAILED_TO_LOGIN,
  AUTHENTICATION_FAILED_WALLET_CREATION,
  AUTHENTICATION_STORE_PASSWORD_FAILED,
  AUTHENTICATION_RESET_PASSWORD_FAILED,
  AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE,
} from '../../constants/error';
import {
  SecretType,
  SeedlessOnboardingController,
  SeedlessOnboardingControllerErrorMessage,
} from '@metamask/seedless-onboarding-controller';
import {
  KeyringController,
  KeyringTypes,
  AccountImportStrategy,
  KeyringMetadata,
} from '@metamask/keyring-controller';
import { EncryptionKey } from '@metamask/browser-passworder';
import { uint8ArrayToMnemonic } from '../../util/mnemonic';
import { EntropySourceId, SolScope } from '@metamask/keyring-api';
import { logOut } from '../../actions/user';
import { RootState } from '../../reducers';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { TraceName, TraceOperation } from '../../util/trace';

export type RecursivePartial<T> = {
  [P in keyof T]?: RecursivePartial<T[P]>;
};

// mock mnemonicPhraseToBytes
jest.mock('@metamask/key-tree', () => ({
  mnemonicPhraseToBytes: jest.fn(),
}));

// Mock the accountsController selector
jest.mock('../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
  selectSelectedInternalAccountAddress: jest.fn(),
  selectSelectedInternalAccount: jest.fn(),
  selectSelectedInternalAccountId: jest.fn(),
}));

jest.useFakeTimers();

jest.mock('../../util/exponential-retry', () => ({
  retryWithExponentialDelay: jest.fn((fn) => fn()),
}));

const storage: Record<string, unknown> = {};

jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn((key) => Promise.resolve(storage[key] ?? null)),
  setItem: jest.fn((key, value) => {
    storage[key] = value;
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    delete storage[key];
    return Promise.resolve();
  }),
  clearAll: jest.fn(() => {
    Object.keys(storage).forEach((key) => delete storage[key]);
    return Promise.resolve();
  }),
}));

const mockSnapClient = {
  addDiscoveredAccounts: jest.fn(),
};

const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(false);

const mockDiscoverAndCreateAccounts = jest.fn();

jest.mock('../SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapFactory: {
    createClient: () => mockSnapClient,
  },
}));

jest.mock('../Engine', () => ({
  resetState: jest.fn(),
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn(),
      createNewVaultAndRestore: jest.fn(),
      submitPassword: jest.fn(),
      setLocked: jest.fn(),
      isUnlocked: jest.fn(() => true),
      removeAccount: jest.fn(),
      state: {
        keyrings: [{ metadata: { id: 'test-keyring-id' } }],
      },
    },

    SeedlessOnboardingController: {
      addNewSecretData: jest.fn(),
      updateBackupMetadataState: jest.fn(),
    },

    MultichainAccountService: {
      init: jest.fn().mockResolvedValue(undefined),
    },
  },
}));

jest.mock('../NavigationService', () => ({
  navigation: {
    reset: jest.fn(),
  },
}));

jest.mock('../SecureKeychain', () => ({
  getSupportedBiometryType: jest.fn(),
  getGenericPassword: jest.fn(),
  setGenericPassword: jest.fn(),
  resetGenericPassword: jest.fn(),
  TYPES: {
    BIOMETRICS: 'biometrics',
    PASSCODE: 'passcode',
    REMEMBER_ME: 'rememberMe',
  },
}));

jest.mock('../OAuthService/OAuthService', () => ({
  resetOauthState: jest.fn(),
}));

jest.mock('../BackupVault/backupVault', () => ({
  clearAllVaultBackups: jest.fn(),
}));

jest.mock('../../multichain-accounts/AccountTreeInitService', () => ({
  initializeAccountTree: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAndCreateAccounts: (entropySource: EntropySourceId) =>
    mockDiscoverAndCreateAccounts(entropySource),
}));

const mockUint8ArrayToMnemonic = jest
  .fn()
  .mockImplementation((uint8Array: Uint8Array) => uint8Array.toString());

const mockConvertMnemonicToWordlistIndices = jest
  .fn()
  .mockReturnValue(new Uint8Array([1, 2, 3, 4]));

const mockConvertEnglishWordlistIndicesToCodepoints = jest
  .fn()
  .mockReturnValue(new Uint8Array([1, 2, 3, 4]));

jest.mock('../../util/mnemonic', () => ({
  uint8ArrayToMnemonic: (mnemonic: Uint8Array, wordlist: string[]) =>
    mockUint8ArrayToMnemonic(mnemonic, wordlist),
  convertMnemonicToWordlistIndices: (mnemonic: Buffer, wordlist: string[]) =>
    mockConvertMnemonicToWordlistIndices(mnemonic, wordlist),
  convertEnglishWordlistIndicesToCodepoints: (
    wordlistIndices: Uint8Array,
    wordlist: string[],
  ) => mockConvertEnglishWordlistIndicesToCodepoints(wordlistIndices, wordlist),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

const mockTrace = jest.fn();
const mockEndTrace = jest.fn();
const mockGetTraceTags = jest.fn();

jest.mock('../../util/sentry/tags', () => ({
  getTraceTags: () => mockGetTraceTags(),
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trace: (...args: any[]) => mockTrace(...args),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  endTrace: (...args: any[]) => mockEndTrace(...args),
}));

describe('Authentication', () => {
  afterEach(() => {
    StorageWrapper.clearAll();
    jest.restoreAllMocks();
    jest.runAllTimers();
  });

  it('should return a type password', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

    // Mock Redux store to return existingUser: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type biometric', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);

    // Mock Redux store to return existingUser: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('should return a type passcode', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);

    // Mock Redux store to return existingUser: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('should return a type password with biometric & pincode disabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

    // Mock Redux store to return existingUser: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type AUTHENTICATION_TYPE.REMEMBER_ME if the user exists and there are no available biometrics options and the password exist in the keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);

    // Mock Redux store to return existingUser: true
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user exists and there are no available biometrics options but the password does not exist in the keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(null);

    // Mock Redux store to return existingUser: true
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user does not exist and there are no available biometrics options', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);

    // Mock Redux store to return existingUser: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: false },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.REMEMBER_ME', async () => {
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
    } as unknown as ReduxStore);

    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    const result = await Authentication.componentAuthenticationType(
      false,
      true,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.PASSWORD', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

    // Mock Redux store to return allowLoginWithRememberMe: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: false } }),
    } as unknown as ReduxStore);

    const result = await Authentication.componentAuthenticationType(
      false,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.PASSCODE', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);

    // Mock Redux store to return allowLoginWithRememberMe: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: false } }),
    } as unknown as ReduxStore);

    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSCODE);
  });

  it('should return a auth type for components AUTHENTICATION_TYPE.BIOMETRIC', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);

    // Mock Redux store to return allowLoginWithRememberMe: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: false } }),
    } as unknown as ReduxStore);

    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  describe('storePassword', () => {
    it('should store password with BIOMETRIC authentication type', async () => {
      const setGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'setGenericPassword',
      );

      await Authentication.storePassword('1234', AUTHENTICATION_TYPE.BIOMETRIC);

      expect(setGenericPasswordSpy).toHaveBeenCalledWith(
        '1234',
        SecureKeychain.TYPES.BIOMETRICS,
      );
    });

    it('should store password with PASSCODE authentication type', async () => {
      const setGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'setGenericPassword',
      );

      await Authentication.storePassword('1234', AUTHENTICATION_TYPE.PASSCODE);

      expect(setGenericPasswordSpy).toHaveBeenCalledWith(
        '1234',
        SecureKeychain.TYPES.PASSCODE,
      );
    });

    it('should store password with REMEMBER_ME authentication type', async () => {
      const setGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'setGenericPassword',
      );

      await Authentication.storePassword(
        '1234',
        AUTHENTICATION_TYPE.REMEMBER_ME,
      );

      expect(setGenericPasswordSpy).toHaveBeenCalledWith(
        '1234',
        SecureKeychain.TYPES.REMEMBER_ME,
      );
    });

    it('should store password with PASSWORD authentication type', async () => {
      const setGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'setGenericPassword',
      );

      await Authentication.storePassword('1234', AUTHENTICATION_TYPE.PASSWORD);

      expect(setGenericPasswordSpy).toHaveBeenCalledWith('1234', undefined);
    });

    it('should store password with UNKNOWN authentication type (default case)', async () => {
      const setGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'setGenericPassword',
      );

      await Authentication.storePassword('1234', AUTHENTICATION_TYPE.UNKNOWN);

      expect(setGenericPasswordSpy).toHaveBeenCalledWith('1234', undefined);
    });

    it('should throw AuthenticationError when SecureKeychain fails', async () => {
      const error = new Error('Keychain error');
      jest
        .spyOn(SecureKeychain, 'setGenericPassword')
        .mockRejectedValueOnce(error);

      try {
        await Authentication.storePassword(
          '1234',
          AUTHENTICATION_TYPE.PASSWORD,
        );
        throw new Error('Expected an error to be thrown');
      } catch (authError) {
        expect(authError).toBeInstanceOf(AuthenticationError);
        expect((authError as AuthenticationError).customErrorMessage).toBe(
          AUTHENTICATION_STORE_PASSWORD_FAILED,
        );
        expect((authError as AuthenticationError).message).toBe(
          'Keychain error',
        );
      }
    });
  });

  describe('Multichain - discoverAccounts', () => {
    beforeEach(() => {
      mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
    });

    it('calls discoverAccounts after vault creation in newWalletAndKeychain', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);
      await Authentication.newWalletAndKeychain('1234', {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        expect.any(String), // mock entropySource
        SolScope.Mainnet,
      );
    });

    it('(state 2) - calls discoverAccounts after vault creation in newWalletAndKeychain', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);
      await Authentication.newWalletAndKeychain('1234', {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      expect(mockDiscoverAndCreateAccounts).toHaveBeenCalledWith(
        expect.any(String), // mock entropySource
      );
    });

    it('calls discoverAccounts in newWalletVaultAndRestore', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);
      await Authentication.newWalletAndRestore(
        '1234',
        {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        },
        '1234',
        false,
      );
      expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        expect.any(String), // mock entropySource
        SolScope.Mainnet,
      );
    });

    it('(state 2) - calls discoverAccounts in newWalletVaultAndRestore', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);
      await Authentication.newWalletAndRestore(
        '1234',
        {
          currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
        },
        '1234',
        false,
      );
      expect(mockDiscoverAndCreateAccounts).toHaveBeenCalledWith(
        expect.any(String), // mock entropySource
      );
    });

    describe('Account discovery failure handling', () => {
      beforeEach(() => {
        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          dispatch: jest.fn(),
          getState: () => ({ security: { allowLoginWithRememberMe: true } }),
        } as unknown as ReduxStore);
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.clearAllMocks();
        mockSnapClient.addDiscoveredAccounts.mockClear();
        mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
        mockDiscoverAndCreateAccounts.mockClear();
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('completes wallet creation when discovery fails', async () => {
        mockSnapClient.addDiscoveredAccounts.mockRejectedValueOnce(
          new Error('RPC error'),
        );

        await expect(
          Authentication.newWalletAndKeychain('1234', {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          }),
        ).resolves.not.toThrow();

        // Verify discovery was attempted
        expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalled();
      });

      it('(state 2) - completes wallet creation when discovery fails', async () => {
        mockDiscoverAndCreateAccounts.mockRejectedValueOnce(
          new Error('Discovery error'),
        );

        mockIsMultichainAccountsState2Enabled.mockReturnValue(true);
        await expect(
          Authentication.newWalletAndKeychain('1234', {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          }),
        ).resolves.not.toThrow();

        // Verify discovery was attempted
        expect(mockDiscoverAndCreateAccounts).toHaveBeenCalled();
      });

      it('(state 2) - completes wallet restore when discovery fails', async () => {
        // Mock discovery to fail
        mockDiscoverAndCreateAccounts.mockRejectedValueOnce(
          new Error('Discovery timeout'),
        );

        // Wallet restore should succeed despite failure
        mockIsMultichainAccountsState2Enabled.mockReturnValue(true);
        await expect(
          Authentication.newWalletAndRestore(
            '1234',
            { currentAuthType: AUTHENTICATION_TYPE.PASSWORD },
            'test seed phrase',
            true,
          ),
        ).resolves.not.toThrow();

        // Verify discovery was attempted
        expect(mockDiscoverAndCreateAccounts).toHaveBeenCalled();
      });

      it('does not break authentication flow when discovery fails', async () => {
        // Set up pending discovery that will be checked on unlock
        await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

        const mockCredentials = { username: 'test', password: 'test' };
        SecureKeychain.getGenericPassword = jest
          .fn()
          .mockReturnValue(mockCredentials);

        // App unlock should succeed even if retry fails
        await expect(Authentication.appTriggeredAuth()).resolves.not.toThrow();
      });

      it('sets SOLANA_DISCOVERY_PENDING when discovery fails in createWalletVaultAndKeychain', async () => {
        const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
        jest
          .spyOn(
            Authentication as unknown as {
              attemptAccountDiscovery: () => Promise<void>;
            },
            'attemptAccountDiscovery',
          )
          .mockRejectedValue(new Error('RPC error'));

        await Authentication.newWalletAndKeychain('1234', {
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        });
        await Promise.resolve();

        expect(setItemSpy).toHaveBeenCalledWith(
          SOLANA_DISCOVERY_PENDING,
          'true',
        );
      });

      it('sets SOLANA_DISCOVERY_PENDING when discovery fails in newWalletVaultAndRestore', async () => {
        const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
        jest
          .spyOn(
            Authentication as unknown as {
              attemptAccountDiscovery: () => Promise<void>;
            },
            'attemptAccountDiscovery',
          )
          .mockRejectedValue(new Error('RPC error'));

        await Authentication.newWalletAndRestore(
          '1234',
          { currentAuthType: AUTHENTICATION_TYPE.PASSWORD },
          'test seed phrase',
          true,
        );
        await Promise.resolve();

        expect(setItemSpy).toHaveBeenCalledWith(SOLANA_DISCOVERY_PENDING, TRUE);
      });

      describe('retryDiscoveryIfPending behavior', () => {
        let mockAttemptAccountDiscovery: jest.SpyInstance;

        beforeEach(() => {
          // Spy on the private method
          mockAttemptAccountDiscovery = jest
            .spyOn(
              Authentication as unknown as {
                attemptAccountDiscovery: () => Promise<void>;
              },
              'attemptAccountDiscovery',
            )
            .mockResolvedValue(undefined);
        });

        afterEach(() => {
          mockAttemptAccountDiscovery.mockRestore();
        });

        it('calls attemptAccountDiscovery when flag is set to true', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest
            .fn()
            .mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptAccountDiscovery).toHaveBeenCalled();
        });

        it('does not call attemptAccountDiscovery when flag is not set', async () => {
          await StorageWrapper.removeItem(SOLANA_DISCOVERY_PENDING);

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest
            .fn()
            .mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptAccountDiscovery).not.toHaveBeenCalled();
        });

        it('does not call attemptAccountDiscovery when flag is false', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'false');

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest
            .fn()
            .mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptAccountDiscovery).not.toHaveBeenCalled();
        });

        it('retries on userEntryAuth when flag is set', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

          await Authentication.userEntryAuth('1234', {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          });

          expect(mockAttemptAccountDiscovery).toHaveBeenCalled();
        });

        it('handles storage errors gracefully without breaking authentication', async () => {
          const originalGetItem = StorageWrapper.getItem;
          StorageWrapper.getItem = jest
            .fn()
            .mockRejectedValueOnce(new Error('Storage read error'));

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest
            .fn()
            .mockReturnValue(mockCredentials);

          await expect(
            Authentication.appTriggeredAuth(),
          ).resolves.not.toThrow();

          expect(console.warn).toHaveBeenCalledWith(
            'Failed to check/retry discovery:',
            'solana',
            expect.any(Error),
          );

          // Should not attempt discovery due to storage error
          expect(mockAttemptAccountDiscovery).not.toHaveBeenCalled();

          // Restore original method
          StorageWrapper.getItem = originalGetItem;
        });

        it('handles discovery attempt errors gracefully', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');
          mockAttemptAccountDiscovery.mockRejectedValueOnce(
            new Error('Discovery failed'),
          );

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest
            .fn()
            .mockReturnValue(mockCredentials);

          // Should not throw and should complete authentication
          await expect(
            Authentication.appTriggeredAuth(),
          ).resolves.not.toThrow();

          expect(mockAttemptAccountDiscovery).toHaveBeenCalled();
          expect(console.warn).toHaveBeenCalledWith(
            'Failed to check/retry discovery:',
            'solana',
            expect.any(Error),
          );
        });

        it('throws AuthenticationError when appTriggeredAuth fails', async () => {
          const mockDispatch = jest.fn();
          jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
            dispatch: mockDispatch,
            getState: () => ({ security: { allowLoginWithRememberMe: true } }),
          } as unknown as ReduxStore);

          const Engine = jest.requireMock('../Engine');

          Engine.context.KeyringController.setLocked.mockResolvedValue(
            undefined,
          );

          // Mock getGenericPassword to return null to trigger error
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(null);

          try {
            await Authentication.appTriggeredAuth();
            throw new Error('Expected an error to be thrown');
          } catch (error) {
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
            expect(error).toBeInstanceOf(AuthenticationError);
            expect((error as AuthenticationError).customErrorMessage).toBe(
              AUTHENTICATION_APP_TRIGGERED_AUTH_ERROR,
            );
            expect((error as AuthenticationError).message).toBe(
              AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
            );
            await Promise.resolve();
            jest.runAllTimers();
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
          }
        });

        it('throws AuthenticationError when userEntryAuth fails', async () => {
          const Engine = jest.requireMock('../Engine');

          // Mock KeyringController.submitPassword to throw an error
          Engine.context.KeyringController.submitPassword.mockRejectedValueOnce(
            new Error('Invalid password'),
          );

          try {
            await Authentication.userEntryAuth('wrong-password', {
              currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            });
            throw new Error('Expected an error to be thrown');
          } catch (error) {
            expect(error).toBeInstanceOf(AuthenticationError);
            expect((error as AuthenticationError).customErrorMessage).toBe(
              AUTHENTICATION_FAILED_TO_LOGIN,
            );
            expect((error as AuthenticationError).message).toBe(
              'Invalid password',
            );
          }
        });

        it('throws AuthenticationError when newWalletAndRestore fails', async () => {
          const mockDispatch = jest.fn();
          jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
            dispatch: mockDispatch,
            getState: () => ({ security: { allowLoginWithRememberMe: true } }),
          } as unknown as ReduxStore);

          const Engine = jest.requireMock('../Engine');

          Engine.context.KeyringController.setLocked.mockResolvedValue(
            undefined,
          );

          // Mock KeyringController.createNewVaultAndRestore to throw an error
          Engine.context.KeyringController.createNewVaultAndRestore.mockRejectedValueOnce(
            new Error('Wallet creation failed'),
          );

          try {
            await Authentication.newWalletAndRestore(
              'password',
              { currentAuthType: AUTHENTICATION_TYPE.PASSWORD },
              'test seed phrase',
              false,
            );
            throw new Error('Expected an error to be thrown');
          } catch (error) {
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
            expect(error).toBeInstanceOf(AuthenticationError);
            expect((error as AuthenticationError).customErrorMessage).toBe(
              AUTHENTICATION_FAILED_WALLET_CREATION,
            );
            expect((error as AuthenticationError).message).toBe(
              'Wallet creation failed',
            );
            await Promise.resolve();
            jest.runAllTimers();
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
          }
        });

        it('throws AuthenticationError when newWalletAndKeychain fails', async () => {
          const mockDispatch = jest.fn();
          jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
            dispatch: mockDispatch,
            getState: () => ({ security: { allowLoginWithRememberMe: true } }),
          } as unknown as ReduxStore);

          const Engine = jest.requireMock('../Engine');

          // Ensure KeyringController.setLocked resolves immediately
          Engine.context.KeyringController.setLocked.mockResolvedValue(
            undefined,
          );

          // Mock KeyringController.createNewVaultAndKeychain to throw an error
          Engine.context.KeyringController.createNewVaultAndKeychain.mockRejectedValueOnce(
            new Error('Keychain creation failed'),
          );

          try {
            await Authentication.newWalletAndKeychain('password', {
              currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            });
            throw new Error('Expected an error to be thrown');
          } catch (error) {
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
            expect(error).toBeInstanceOf(AuthenticationError);
            expect((error as AuthenticationError).customErrorMessage).toBe(
              AUTHENTICATION_FAILED_WALLET_CREATION,
            );
            expect((error as AuthenticationError).message).toBe(
              'Keychain creation failed',
            );
            // Wait for async lockApp operations to complete
            await Promise.resolve();
            jest.runAllTimers();
            expect(mockDispatch).toHaveBeenCalledWith(logOut());
          }
        });
      });
    });
  });

  describe('createAndBackupSeedPhrase', () => {
    beforeEach(() => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);
    });

    it('calls dispatchOauthReset on successful backup', async () => {
      const Engine = jest.requireMock('../Engine');
      const OAuthService = jest.requireMock('../OAuthService/OAuthService');

      // Mock the required Engine context methods
      Engine.context.SeedlessOnboardingController = {
        state: {},
        createToprfKeyAndBackupSeedPhrase: jest
          .fn()
          .mockResolvedValue(undefined),
        clearState: jest.fn(),
        exportEncryptionKey: jest.fn(),
        storeKeyringEncryptionKey: jest.fn(),
        updateBackupMetadataState: jest.fn(),
      };
      Engine.context.KeyringController.state.keyrings = [
        { metadata: { id: 'test-keyring' } },
      ];
      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue('test seed phrase');

      Engine.context.KeyringController.exportEncryptionKey = jest
        .fn()
        .mockResolvedValue('test seed phrase');

      // Mock createWalletVaultAndKeychain
      const createWalletSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'createWalletVaultAndKeychain')
        .mockResolvedValue(undefined);

      await Authentication.createAndBackupSeedPhrase('test-password');

      expect(OAuthService.resetOauthState).toHaveBeenCalled();

      createWalletSpy.mockRestore();
    });

    it('calls newWalletAndKeychain and throws error when backup fails', async () => {
      const Engine = jest.requireMock('../Engine');

      // Mock the required Engine context methods to fail
      Engine.context.SeedlessOnboardingController = {
        state: {},
        createToprfKeyAndBackupSeedPhrase: jest
          .fn()
          .mockRejectedValue(new Error('Backup failed')),
        clearState: jest.fn(),
      };
      Engine.context.KeyringController.state.keyrings = [
        { metadata: { id: 'test-keyring' } },
      ];
      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue('test seed phrase');

      // Mock createWalletVaultAndKeychain and newWalletAndKeychain
      const createWalletSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'createWalletVaultAndKeychain')
        .mockResolvedValue(undefined);
      const newWalletSpy = jest
        .spyOn(Authentication, 'newWalletAndKeychain')
        .mockResolvedValue(undefined);

      await expect(
        Authentication.createAndBackupSeedPhrase('test-password'),
      ).rejects.toThrow('Backup failed');

      // Verify rollback was called
      expect(newWalletSpy).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.clearState,
      ).toHaveBeenCalled();

      createWalletSpy.mockRestore();
      newWalletSpy.mockRestore();
    });

    it('throws error when no keyring metadata found', async () => {
      const Engine = jest.requireMock('../Engine');

      Engine.context.SeedlessOnboardingController = {
        state: {},
        createToprfKeyAndBackupSeedPhrase: jest
          .fn()
          .mockResolvedValue(undefined),
        clearState: jest.fn(),
      };

      Engine.context.KeyringController.state.keyrings = [{ metadata: {} }];

      const createWalletSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'createWalletVaultAndKeychain')
        .mockResolvedValue(undefined);

      await expect(
        Authentication.createAndBackupSeedPhrase('test-password'),
      ).rejects.toThrow('No keyring metadata found');

      createWalletSpy.mockRestore();
    });
  });

  describe('resetPassword', () => {
    it('should call SecureKeychain.resetGenericPassword', async () => {
      const resetGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'resetGenericPassword',
      );

      await Authentication.resetPassword();

      expect(resetGenericPasswordSpy).toHaveBeenCalled();
    });

    it('should throw AuthenticationError when SecureKeychain fails', async () => {
      const error = new Error('Reset failed');
      jest
        .spyOn(SecureKeychain, 'resetGenericPassword')
        .mockRejectedValueOnce(error);

      try {
        await Authentication.resetPassword();
        throw new Error('Expected an error to be thrown');
      } catch (authError) {
        expect(authError).toBeInstanceOf(AuthenticationError);
        expect((authError as AuthenticationError).customErrorMessage).toBe(
          AUTHENTICATION_RESET_PASSWORD_FAILED,
        );
        expect((authError as AuthenticationError).message).toBe(
          `${AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE} Reset failed`,
        );
      }
    });
  });

  describe('resetVault', () => {
    it('calls KeyringController.submitPassword and resetPassword', async () => {
      const Engine = jest.requireMock('../Engine');
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({
          security: { allowLoginWithRememberMe: true },
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'exising vault data',
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      const resetGenericPasswordSpy = jest
        .spyOn(SecureKeychain, 'resetGenericPassword')
        .mockImplementation(() => Promise.resolve(true));

      await Authentication.resetVault();

      expect(
        Engine.context.KeyringController.submitPassword,
      ).toHaveBeenCalledWith('');
      expect(resetGenericPasswordSpy).toHaveBeenCalled();
    });
  });

  describe('rehydrateSeedPhrase', () => {
    const mockPassword = 'password123';
    const mockAuthData = {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      oauth2Login: true,
    };
    const mockSeedPhrase1 = new Uint8Array([1]);
    const mockSeedPhrase2 = new Uint8Array([2]);
    const mockPrivateKeyData = new Uint8Array([3, 4, 5, 6]);

    let Engine: typeof import('../Engine').default;
    let OAuthService: typeof import('../OAuthService/OAuthService').default;
    let Logger: jest.Mocked<typeof import('../../util/Logger').default>;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      OAuthService = jest.requireMock('../OAuthService/OAuthService');
      Logger = jest.requireMock('../../util/Logger');

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      const mockKeyring = {
        getAccounts: jest.fn().mockResolvedValue(['0x1234567890abcdef']),
      };
      Engine.context.SeedlessOnboardingController = {
        fetchAllSecretData: jest.fn(),
        updateBackupMetadataState: jest.fn(),
        storeKeyringEncryptionKey: jest.fn(),
        loadKeyringEncryptionKey: jest.fn(),
        submitGlobalPassword: jest.fn(),
        checkIsPasswordOutdated: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
      Engine.context.KeyringController = {
        setLocked: jest.fn(),
        isUnlocked: jest.fn().mockResolvedValue(true),
        addNewKeyring: jest.fn(),
        createNewVaultAndRestore: jest.fn(),
        withKeyring: jest
          .fn()
          .mockImplementation(
            async ({ id: _id }, callback) =>
              await callback({ keyring: mockKeyring }),
          ),
        state: {
          keyrings: [
            { name: 'HD Key Tree', metadata: { id: 'test-keyring-id' } },
          ],
        },
        exportEncryptionKey: jest.fn(),
        exportSeedPhrase: jest.fn(),
      } as unknown as KeyringController;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('rehydrate with a single seed phrase', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
      ]);
      const newWalletVaultAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSecretData,
      ).toHaveBeenCalledWith(mockPassword);
      expect(mockUint8ArrayToMnemonic).toHaveBeenCalledWith(
        mockSeedPhrase1,
        expect.any(Object),
      );
      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalledWith(
        mockPassword,
        uint8ArrayToMnemonic(mockSeedPhrase1, []),
        false,
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn, passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('rehydrate with multiple seed phrases', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
        {
          data: mockSeedPhrase2,
          type: SecretType.Mnemonic,
        },
      ]);
      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data',
              socialBackupsMetadata: [],
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const newWalletVaultAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);
      (
        Engine.context.KeyringController.addNewKeyring as jest.Mock
      ).mockResolvedValueOnce({
        id: 'new-keyring-id',
      });

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSecretData,
      ).toHaveBeenCalledWith(mockPassword);
      expect(mockUint8ArrayToMnemonic).toHaveBeenCalledWith(
        mockSeedPhrase1,
        expect.any(Object),
      );
      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalledWith(
        mockPassword,
        uint8ArrayToMnemonic(mockSeedPhrase1, []),
        false,
      );
      expect(
        Engine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledWith(KeyringTypes.hd, {
        mnemonic: uint8ArrayToMnemonic(mockSeedPhrase2, []),
        numberOfAccounts: 1,
      });
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).toHaveBeenCalledWith({
        data: new Uint8Array([1, 2, 3, 4]),
        keyringId: 'new-keyring-id',
        type: 'mnemonic',
      });
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn, passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('rehydrate with seed phrase and private key', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
        {
          data: mockPrivateKeyData,
          type: SecretType.PrivateKey,
        },
      ]);
      const newWalletVaultAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);
      const importAccountFromPrivateKeySpy = jest
        .spyOn(Authentication, 'importAccountFromPrivateKey')
        .mockResolvedValueOnce(undefined);

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSecretData,
      ).toHaveBeenCalledWith(mockPassword);
      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalledWith(
        mockPassword,
        uint8ArrayToMnemonic(mockSeedPhrase1, []),
        false,
      );
      expect(importAccountFromPrivateKeySpy).toHaveBeenCalledWith(
        expect.any(String), // bytesToHex result
        {
          shouldCreateSocialBackup: false,
          shouldSelectAccount: false,
        },
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn and passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('handle unknown secret type and log error', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
        {
          data: mockPrivateKeyData,
          type: 'unknown' as SecretType,
        },
      ]);
      const newWalletAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(newWalletAndRestoreSpy).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'unknown');
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn and passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('handle importAccountFromPrivateKey failure and continue', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
        {
          data: mockPrivateKeyData,
          type: SecretType.PrivateKey,
        },
      ]);

      const newWalletVaultAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);
      const importError = new Error('Import failed');
      const importAccountFromPrivateKeySpy = jest
        .spyOn(Authentication, 'importAccountFromPrivateKey')
        .mockRejectedValueOnce(importError);

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalled();
      expect(importAccountFromPrivateKeySpy).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        importError,
        'Error in rehydrateSeedPhrase- SeedlessOnboardingController',
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn and passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('throw an error if no seed phrases are found', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([]);
      await expect(
        Authentication.userEntryAuth(mockPassword, mockAuthData),
      ).rejects.toThrow('No account data found');
    });

    it('re-throw errors from fetchAllSeedPhrases', async () => {
      const error = new Error('Fetch failed');
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockRejectedValueOnce(error);
      await expect(
        Authentication.userEntryAuth(mockPassword, mockAuthData),
      ).rejects.toThrow('Fetch failed');
    });

    it('handle errors when adding new keyrings and continue', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: mockSeedPhrase1,
          type: SecretType.Mnemonic,
        },
        {
          data: mockSeedPhrase2,
          type: SecretType.Mnemonic,
        },
      ]);
      const newWalletVaultAndRestoreSpy = jest
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .spyOn(Authentication as any, 'newWalletVaultAndRestore')
        .mockResolvedValueOnce(undefined);
      const error = new Error('Keyring add failed');
      (
        Engine.context.KeyringController.addNewKeyring as jest.Mock
      ).mockRejectedValueOnce(error);

      const mockState = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data',
              socialBackupsMetadata: [],
            },
          },
        },
      };

      // spy redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      await Authentication.userEntryAuth(mockPassword, mockAuthData);

      expect(
        Engine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledTimes(1);
      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        error,
        'Error in rehydrateSeedPhrase- SeedlessOnboardingController',
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(3); // logIn, passwordSet, setExistingUser
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('should throw an error if first seed phrase is falsy', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([
        {
          data: null,
          type: SecretType.Mnemonic,
        },
        {
          data: mockSeedPhrase2,
          type: SecretType.Mnemonic,
        },
      ]);

      await expect(
        Authentication.userEntryAuth(mockPassword, mockAuthData),
      ).rejects.toThrow('No seed phrase found');
    });
  });

  describe('submitLatestGlobalSeedlessPassword', () => {
    const mockGlobalPassword = 'globalPassword123';
    const mockAuthType = {
      currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
    };
    const mockCurrentDevicePassword = 'devicePassword123';
    const mockSelectedAddress = '0x1234567890abcdef';

    let Engine: typeof import('../Engine').default;

    let selectSelectedInternalAccountFormattedAddress: jest.MockedFunction<
      typeof import('../../selectors/accountsController').selectSelectedInternalAccountFormattedAddress
    >;

    const mockState = {
      engine: {
        backgroundState: {
          AccountsController: {
            internalAccounts: {
              accounts: {
                'account-id': {
                  address: mockSelectedAddress,
                  id: 'account-id',
                  metadata: {
                    name: 'Test Account',
                    keyring: {
                      type: 'HD Key Tree',
                    },
                  },
                  options: {},
                  methods: [],
                  type: 'eip155:eoa',
                },
              },
              selectedAccount: 'account-id',
            },
          },
          SeedlessOnboardingController: {
            vault: 'existing vault data' as string | undefined,
            socialBackupsMetadata: [],
          },
        },
      },
    };

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');

      selectSelectedInternalAccountFormattedAddress = jest.requireMock(
        '../../selectors/accountsController',
      ).selectSelectedInternalAccountFormattedAddress;

      // Setup the selector mock to return the expected address
      selectSelectedInternalAccountFormattedAddress.mockReturnValue(
        mockSelectedAddress,
      );

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        recoverCurrentDevicePassword: jest.fn(),
        syncLatestGlobalPassword: jest.fn(),
        checkIsPasswordOutdated: jest.fn().mockResolvedValue(true),
        storeKeyringEncryptionKey: jest.fn(),
        loadKeyringEncryptionKey: jest.fn(),
        submitGlobalPassword: jest.fn(),
        fetchAllSecretData: jest.fn(),
        revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      jest.spyOn(Authentication, 'resetPassword');
      jest.spyOn(Authentication, 'lockApp');
    });

    afterEach(() => {
      jest.clearAllMocks();
      selectSelectedInternalAccountFormattedAddress.mockReset();
    });

    it(`throw when old password is provided`, async () => {
      Engine.context.SeedlessOnboardingController.submitGlobalPassword = jest
        .fn()
        .mockRejectedValue(
          new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
        );

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockResolvedValueOnce('');
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(true);

      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: Date.now(),
              },
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const spySyncPasswordAndUnlockWallet = jest.spyOn(
        Authentication,
        'syncPasswordAndUnlockWallet',
      );

      await expect(
        Authentication.userEntryAuth(mockGlobalPassword, mockAuthType),
      ).rejects.toThrow(
        new SeedlessOnboardingControllerError(
          SeedlessOnboardingControllerErrorType.PasswordRecentlyUpdated,
        ),
      );
      expect(spySyncPasswordAndUnlockWallet).toHaveBeenCalled();
    });

    it(`throw when incorrect password is provided`, async () => {
      Engine.context.SeedlessOnboardingController.submitGlobalPassword = jest
        .fn()
        .mockRejectedValue(
          new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
        );

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('incorrect password'));
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(true);

      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: Date.now(),
              },
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const spySyncPasswordAndUnlockWallet = jest.spyOn(
        Authentication,
        'syncPasswordAndUnlockWallet',
      );

      await expect(
        Authentication.userEntryAuth(mockGlobalPassword, mockAuthType),
      ).rejects.toThrow(
        new Error(SeedlessOnboardingControllerErrorMessage.IncorrectPassword),
      );
      expect(spySyncPasswordAndUnlockWallet).toHaveBeenCalled();
    });

    it(`throw when credentials are expired`, async () => {
      Engine.context.SeedlessOnboardingController.submitGlobalPassword = jest
        .fn()
        .mockRejectedValue(
          new Error(
            SeedlessOnboardingControllerErrorMessage.ExpiredCredentials,
          ),
        );

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('incorrect password'));
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(true);

      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: Date.now(),
              },
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const spySyncPasswordAndUnlockWallet = jest.spyOn(
        Authentication,
        'syncPasswordAndUnlockWallet',
      );

      await expect(
        Authentication.userEntryAuth(mockGlobalPassword, mockAuthType),
      ).rejects.toThrow(
        new Error(SeedlessOnboardingControllerErrorMessage.ExpiredCredentials),
      );
      expect(spySyncPasswordAndUnlockWallet).toHaveBeenCalled();
    });

    it('rehydrate when max key chain is exceeded', async () => {
      Engine.context.SeedlessOnboardingController.submitGlobalPassword = jest
        .fn()
        .mockRejectedValue(
          new Error(
            SeedlessOnboardingControllerErrorMessage.MaxKeyChainLengthExceeded,
          ),
        );
      Engine.context.SeedlessOnboardingController.refreshAuthTokens = jest
        .fn()
        .mockResolvedValueOnce(undefined);

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('incorrect password'));
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(true);

      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: Date.now(),
              },
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const spySyncPasswordAndUnlockWallet = jest.spyOn(
        Authentication,
        'syncPasswordAndUnlockWallet',
      );

      const spyRehydrateSeedPhrase = jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockResolvedValueOnce(undefined);

      await expect(
        Authentication.userEntryAuth(mockGlobalPassword, mockAuthType),
      ).resolves.toBeUndefined();

      expect(spySyncPasswordAndUnlockWallet).toHaveBeenCalled();
      expect(spyRehydrateSeedPhrase).toHaveBeenCalled();
    });

    it('successfully syncs latest global seedless password', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .submitGlobalPassword as jest.Mock
      ).mockResolvedValueOnce({ password: mockCurrentDevicePassword });
      (
        Engine.context.SeedlessOnboardingController
          .syncLatestGlobalPassword as jest.Mock
      ).mockResolvedValueOnce(undefined);
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(true);

      Engine.context.KeyringController.submitEncryptionKey = jest.fn();
      Engine.context.KeyringController.isUnlocked = jest.fn();
      Engine.context.KeyringController.changePassword = jest.fn();
      Engine.context.KeyringController.exportEncryptionKey = jest.fn();

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('submit password failed'));

      const mockStateLocal: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: true,
                timestamp: Date.now(),
              },
            },
          },
        },
      };
      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockStateLocal),
      } as unknown as ReduxStore);

      const spySyncPasswordAndUnlockWallet = jest.spyOn(
        Authentication,
        'syncPasswordAndUnlockWallet',
      );
      await Authentication.userEntryAuth(mockGlobalPassword, mockAuthType);

      expect(spySyncPasswordAndUnlockWallet).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.submitGlobalPassword,
      ).toHaveBeenCalledWith({
        globalPassword: mockGlobalPassword,
        maxKeyChainLength: 20,
      });
      expect(
        Engine.context.SeedlessOnboardingController.syncLatestGlobalPassword,
      ).toHaveBeenCalledWith({
        globalPassword: mockGlobalPassword,
      });
      expect(Authentication.resetPassword).toHaveBeenCalled();
    });

    it('lock app and throw error if vault recreation fails', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .submitGlobalPassword as jest.Mock
      ).mockResolvedValueOnce({ password: mockCurrentDevicePassword });
      (
        Engine.context.SeedlessOnboardingController
          .syncLatestGlobalPassword as jest.Mock
      ).mockResolvedValueOnce(undefined);

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('submit password failed'));

      Engine.context.KeyringController.changePassword = jest
        .fn()
        .mockRejectedValueOnce(new Error('change password failed'));

      // mock redux
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data' as string,
                socialBackupsMetadata: [],
              },
            },
          },
        })),
      } as unknown as ReduxStore);

      await expect(
        Authentication.syncPasswordAndUnlockWallet(mockGlobalPassword),
      ).rejects.toThrow('change password failed');

      expect(Authentication.lockApp).toHaveBeenCalledWith({ locked: true });
    });
  });

  describe('checkIsSeedlessPasswordOutdated', () => {
    let Engine: typeof import('../Engine').default;
    let mockIsOutdated: boolean = false;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        checkIsPasswordOutdated: jest.fn(() => mockIsOutdated),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns password outdated status when using seedless onboarding flow', async () => {
      mockIsOutdated = true;
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: mockIsOutdated,
                timestamp: Date.now(),
              },
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      const result = await Authentication.checkIsSeedlessPasswordOutdated(true);

      expect(result).toBe(mockIsOutdated);
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('uses default skipCache value when not provided', async () => {
      mockIsOutdated = false;
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: mockIsOutdated,
                timestamp: Date.now(),
              },
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        checkIsPasswordOutdated: jest.fn().mockResolvedValue(mockIsOutdated),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      const result = await Authentication.checkIsSeedlessPasswordOutdated();

      expect(result).toBe(mockIsOutdated);
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('return false when seedless controller checkAuthenticationMethod throw error', async () => {
      mockIsOutdated = true;
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
              socialBackupsMetadata: [],
              passwordOutdatedCache: {
                isExpiredPwd: mockIsOutdated,
                timestamp: Date.now(),
              },
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        checkIsPasswordOutdated: jest.fn().mockRejectedValue(mockIsOutdated),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      const result = await Authentication.checkIsSeedlessPasswordOutdated();

      expect(result).toBe(false);
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: true });
    });
  });

  describe('unlock App with seedless onboarding flow', () => {
    const Engine = jest.requireMock('../Engine');
    beforeEach(() => {
      Engine.context.SeedlessOnboardingController = {
        state: { vault: 'existing vault data' },
        submitPassword: jest.fn(),
        checkIsPasswordOutdated: jest.fn(),
        revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
      Engine.context.KeyringController = {
        submitPassword: jest.fn(),
      } as unknown as KeyringController;
    });

    it('throw an error if not using seedless onboarding flow', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data' as string,
                socialBackupsMetadata: [],
              },
            },
          },
        })),
      } as unknown as ReduxStore);

      await Authentication.userEntryAuth('1234', {
        currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
      });

      expect(
        Engine.context.SeedlessOnboardingController.submitPassword,
      ).toHaveBeenCalledWith('1234');
    });
  });

  describe('importSeedlessMnemonicToVault', () => {
    const Engine = jest.requireMock('../Engine');
    const mockKeyring = {
      getAccounts: jest.fn().mockResolvedValue(['0x1234567890abcdef']),
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup Engine context mocks
      Engine.context.KeyringController = {
        addNewKeyring: jest.fn().mockResolvedValue({ id: 'test-keyring-id' }),
        withKeyring: jest
          .fn()
          .mockImplementation(
            async ({ id: _id }, callback) =>
              await callback({ keyring: mockKeyring }),
          ),
        removeAccount: jest.fn(),
      } as unknown as KeyringController;

      Engine.context.SeedlessOnboardingController = {
        addNewSecretData: jest.fn().mockResolvedValue(undefined),
        updateBackupMetadataState: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      // Mock Engine.setSelectedAddress
      Engine.setSelectedAddress = jest.fn();

      // Mock multichain client
      mockSnapClient.addDiscoveredAccounts.mockResolvedValue(2);

      // Setup default Redux store mock
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'seedless onboarding vault',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);
    });

    it('throw when call import seedless mnemonic and return account details without seedless flow', async () => {
      // Arrange
      const mnemonic = 'test mnemonic phrase for wallet';

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: undefined,
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Act
      await expect(
        Authentication.importSeedlessMnemonicToVault(mnemonic),
      ).rejects.toThrow('Not in seedless onboarding flow');
    });

    it('import mnemonic with seedless onboarding flow and social backup', async () => {
      // Arrange
      const mnemonic = 'test mnemonic phrase for wallet';

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Act
      const result = await Authentication.importSeedlessMnemonicToVault(
        mnemonic,
      );

      // Assert
      expect(
        Engine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledWith(KeyringTypes.hd, {
        mnemonic,
        numberOfAccounts: 1,
      });
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).toHaveBeenCalledWith({
        keyringId: 'test-keyring-id',
        data: new Uint8Array([1, 2, 3, 4]),
        type: SecretType.Mnemonic,
      });
      expect(mockSnapClient.addDiscoveredAccounts).not.toHaveBeenCalled();
      expect(result).toEqual({
        id: 'test-keyring-id',
      });
    });

    it('handle KeyringController.addNewKeyring failure', async () => {
      // Arrange
      const mnemonic = 'test mnemonic phrase for wallet';

      const error = new Error('Failed to add new keyring');
      Engine.context.KeyringController.addNewKeyring.mockRejectedValue(error);

      // Act & Assert
      await expect(
        Authentication.importSeedlessMnemonicToVault(mnemonic),
      ).rejects.toThrow('Failed to add new keyring');
    });

    it('handle keyring.getAccounts failure', async () => {
      // Arrange
      const mnemonic = 'test mnemonic phrase for wallet';
      const error = new Error('Failed to get accounts');
      mockKeyring.getAccounts.mockRejectedValue(error);

      // Act & Assert
      await expect(
        Authentication.importSeedlessMnemonicToVault(mnemonic),
      ).rejects.toThrow('Failed to get accounts');
    });
  });

  describe('importAccountFromPrivateKey', () => {
    const Engine = jest.requireMock('../Engine');
    const mockPrivateKey =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const mockImportedAddress = '0xabcdef1234567890abcdef1234567890abcdef1234';

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup Engine context mocks
      Engine.context.KeyringController = {
        importAccountWithStrategy: jest
          .fn()
          .mockResolvedValue(mockImportedAddress),
        removeAccount: jest.fn().mockResolvedValue(undefined),
      } as unknown as KeyringController;

      Engine.context.SeedlessOnboardingController = {
        addNewSecretData: jest.fn().mockResolvedValue(undefined),
        updateBackupMetadataState: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      // Mock Engine.setSelectedAddress
      Engine.setSelectedAddress = jest.fn();

      // Setup default Redux store mock
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: null,
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);
    });

    it('import account from private key without seedless flow', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: false,
        shouldSelectAccount: true,
      };

      // Act
      await Authentication.importAccountFromPrivateKey(mockPrivateKey, options);

      // Assert
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).toHaveBeenCalledWith(AccountImportStrategy.privateKey, [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ]);
      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
        mockImportedAddress,
      );
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).not.toHaveBeenCalled();
    });

    it('import account from private key with seedless flow and social backup', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: true,
        shouldSelectAccount: true,
      };

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Act
      await Authentication.importAccountFromPrivateKey(mockPrivateKey, options);

      // Assert
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).toHaveBeenCalledWith(AccountImportStrategy.privateKey, [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ]);
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).toHaveBeenCalledWith(expect.any(Uint8Array), SecretType.PrivateKey, {
        keyringId: mockImportedAddress,
      });
      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
        mockImportedAddress,
      );
    });

    it('import account from private key with seedless flow but no social backup', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: false,
        shouldSelectAccount: false,
      };

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Act
      await Authentication.importAccountFromPrivateKey(mockPrivateKey, options);

      // Assert
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).toHaveBeenCalledWith(AccountImportStrategy.privateKey, [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ]);
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).toHaveBeenCalledWith({
        keyringId: mockImportedAddress,
        data: expect.any(Uint8Array),
        type: SecretType.PrivateKey,
      });
      expect(Engine.setSelectedAddress).not.toHaveBeenCalled();
    });

    it('handle KeyringController.importAccountWithStrategy failure', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: false,
        shouldSelectAccount: false,
      };

      const error = new Error('Failed to import account');
      Engine.context.KeyringController.importAccountWithStrategy.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(
        Authentication.importAccountFromPrivateKey(mockPrivateKey, options),
      ).rejects.toThrow('Failed to import account');
    });

    it('handle SeedlessOnboardingController.addNewSecretData failure and revert import', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: true,
        shouldSelectAccount: false,
      };

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      const error = new Error('Failed to add secret data');
      Engine.context.SeedlessOnboardingController.addNewSecretData.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(
        Authentication.importAccountFromPrivateKey(mockPrivateKey, options),
      ).rejects.toThrow('Failed to add secret data');
      expect(
        Engine.context.KeyringController.removeAccount,
      ).toHaveBeenCalledWith(mockImportedAddress);
    });

    it('handle KeyringController.removeAccount failure during revert', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: true,
        shouldSelectAccount: false,
      };

      // Override Redux store to return seedless flow as true
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      const error = new Error('Failed to add secret data');
      Engine.context.SeedlessOnboardingController.addNewSecretData.mockRejectedValue(
        error,
      );
      Engine.context.KeyringController.removeAccount.mockRejectedValue(
        new Error('Failed to remove account'),
      );

      // Act & Assert
      await expect(
        Authentication.importAccountFromPrivateKey(mockPrivateKey, options),
      ).rejects.toThrow('Failed to remove account');
      expect(
        Engine.context.KeyringController.removeAccount,
      ).toHaveBeenCalledWith(mockImportedAddress);
    });

    it('use default options when none provided', async () => {
      // Act
      await Authentication.importAccountFromPrivateKey(mockPrivateKey);

      // Assert
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).toHaveBeenCalledWith(AccountImportStrategy.privateKey, [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ]);
      expect(Engine.setSelectedAddress).toHaveBeenCalledWith(
        mockImportedAddress,
      );
    });

    it('handle private key without 0x prefix', async () => {
      // Arrange
      const privateKeyWithoutPrefix =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
      const options = {
        shouldCreateSocialBackup: false,
        shouldSelectAccount: false,
      };

      // Act
      await Authentication.importAccountFromPrivateKey(
        privateKeyWithoutPrefix,
        options,
      );

      // Assert
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).toHaveBeenCalledWith(AccountImportStrategy.privateKey, [
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      ]);
    });

    it('call trace functions correctly', async () => {
      // Arrange
      const options = {
        shouldCreateSocialBackup: false,
        shouldSelectAccount: false,
      };
      mockGetTraceTags.mockReturnValue({});

      // Act
      await Authentication.importAccountFromPrivateKey(mockPrivateKey, options);

      // Assert
      expect(mockTrace).toHaveBeenCalledWith({
        name: TraceName.ImportEvmAccount,
        op: TraceOperation.ImportAccount,
        tags: {},
      });
      expect(mockEndTrace).toHaveBeenCalledWith({
        name: TraceName.ImportEvmAccount,
      });
    });
  });

  describe('addNewPrivateKeyBackup', () => {
    const Engine = jest.requireMock('../Engine');
    const mockPrivateKey =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const mockKeyringId = 'test-keyring-id';

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup Engine context mocks
      Engine.context.SeedlessOnboardingController = {
        addNewSecretData: jest.fn().mockResolvedValue(undefined),
        updateBackupMetadataState: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
    });

    it('add private key backup with social sync', async () => {
      // Act
      await Authentication.addNewPrivateKeyBackup(
        mockPrivateKey,
        mockKeyringId,
        true,
      );

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).toHaveBeenCalledWith(expect.any(Uint8Array), SecretType.PrivateKey, {
        keyringId: mockKeyringId,
      });
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).not.toHaveBeenCalled();
    });

    it('add private key backup without social sync', async () => {
      // Act
      await Authentication.addNewPrivateKeyBackup(
        mockPrivateKey,
        mockKeyringId,
        false,
      );

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).not.toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).toHaveBeenCalledWith({
        keyringId: mockKeyringId,
        data: expect.any(Uint8Array),
        type: SecretType.PrivateKey,
      });
    });

    it('use default syncWithSocial value (true)', async () => {
      // Act
      await Authentication.addNewPrivateKeyBackup(
        mockPrivateKey,
        mockKeyringId,
      );

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).toHaveBeenCalledWith(expect.any(Uint8Array), SecretType.PrivateKey, {
        keyringId: mockKeyringId,
      });
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).not.toHaveBeenCalled();
    });

    it('handle private key without 0x prefix', async () => {
      // Arrange
      const privateKeyWithoutPrefix =
        '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

      // Act
      await Authentication.addNewPrivateKeyBackup(
        privateKeyWithoutPrefix,
        mockKeyringId,
        true,
      );

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.addNewSecretData,
      ).toHaveBeenCalledWith(expect.any(Uint8Array), SecretType.PrivateKey, {
        keyringId: mockKeyringId,
      });
    });

    it('handle SeedlessOnboardingController.addNewSecretData failure', async () => {
      // Arrange
      const error = new Error('Failed to add secret data');
      Engine.context.SeedlessOnboardingController.addNewSecretData.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(
        Authentication.addNewPrivateKeyBackup(
          mockPrivateKey,
          mockKeyringId,
          true,
        ),
      ).rejects.toThrow('Failed to add secret data');
    });

    it('handle SeedlessOnboardingController.updateBackupMetadataState failure', async () => {
      // Arrange
      const error = new Error('Failed to update backup metadata');
      Engine.context.SeedlessOnboardingController.updateBackupMetadataState.mockImplementation(
        () => {
          throw error;
        },
      );

      // Act & Assert
      await expect(
        Authentication.addNewPrivateKeyBackup(
          mockPrivateKey,
          mockKeyringId,
          false,
        ),
      ).rejects.toThrow('Failed to update backup metadata');
    });
  });

  describe('syncSeedPhrases', () => {
    const Engine = jest.requireMock('../Engine');
    const mockRootSecret = {
      data: new Uint8Array([1, 2, 3, 4]),
      type: SecretType.Mnemonic,
    };
    const mockPrivateKeySecret = {
      data: new Uint8Array([5, 6, 7, 8]),
      type: SecretType.PrivateKey,
    };
    const mockMnemonicSecret = {
      data: new Uint8Array([9, 10, 11, 12]),
      type: SecretType.Mnemonic,
    };

    beforeEach(() => {
      // Reset mocks
      jest.clearAllMocks();

      // Setup Engine context mocks
      Engine.context.SeedlessOnboardingController = {
        fetchAllSecretData: jest
          .fn()
          .mockResolvedValue([
            mockRootSecret,
            mockPrivateKeySecret,
            mockMnemonicSecret,
          ]),
        getSecretDataBackupState: jest.fn().mockReturnValue(null), // Not in local state
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      // Setup default Redux store mock
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: 'existing vault data',
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Mock Authentication methods
      jest
        .spyOn(Authentication, 'importAccountFromPrivateKey')
        .mockResolvedValue(undefined);
      jest
        .spyOn(Authentication, 'importSeedlessMnemonicToVault')
        .mockResolvedValue({ id: 'test-keyring-id' } as KeyringMetadata);

      // Mock convertEnglishWordlistIndicesToCodepoints
      mockConvertEnglishWordlistIndicesToCodepoints.mockReturnValue(
        Buffer.from('test mnemonic phrase'),
      );
    });

    it('sync seed phrases with private key and mnemonic secrets', async () => {
      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSecretData,
      ).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.getSecretDataBackupState,
      ).toHaveBeenCalledWith(mockPrivateKeySecret.data, SecretType.PrivateKey);
      expect(
        Engine.context.SeedlessOnboardingController.getSecretDataBackupState,
      ).toHaveBeenCalledWith(mockMnemonicSecret.data, SecretType.Mnemonic);
      expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledWith(
        expect.any(String), // bytesToHex result
        {
          shouldCreateSocialBackup: false,
          shouldSelectAccount: false,
        },
      );
      expect(Authentication.importSeedlessMnemonicToVault).toHaveBeenCalledWith(
        'test mnemonic phrase',
      );
    });

    it('skip sync when not in seedless onboarding flow', async () => {
      // Arrange
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          engine: {
            backgroundState: {
              SeedlessOnboardingController: {
                vault: null,
                socialBackupsMetadata: [],
              },
            },
          },
        }),
      } as unknown as ReduxStore);

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSecretData,
      ).not.toHaveBeenCalled();
      expect(Authentication.importAccountFromPrivateKey).not.toHaveBeenCalled();
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).not.toHaveBeenCalled();
    });

    it('skip secrets that are already in local state', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.getSecretDataBackupState
        .mockReturnValueOnce(null) // Private key not in state
        .mockReturnValueOnce('existing-hash'); // Mnemonic already in state

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledTimes(
        1,
      );
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).not.toHaveBeenCalled();
    });

    it('handle only private key secrets', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret, mockPrivateKeySecret],
      );

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledTimes(
        1,
      );
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).not.toHaveBeenCalled();
    });

    it('handle only mnemonic secrets', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret, mockMnemonicSecret],
      );

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).not.toHaveBeenCalled();
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).toHaveBeenCalledTimes(1);
    });

    it('handle no additional secrets', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret],
      );

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).not.toHaveBeenCalled();
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).not.toHaveBeenCalled();
    });

    it('throw error when no root secret is found', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [],
      );

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'No root SRP found',
      );
    });

    it('throw error when root secret is falsy', async () => {
      // Arrange
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [null],
      );

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'No root SRP found',
      );
    });

    it('handle SeedlessOnboardingController.fetchAllSecretData failure', async () => {
      // Arrange
      const error = new Error('Failed to fetch secret data');
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockRejectedValue(
        error,
      );

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'Failed to fetch secret data',
      );
    });

    it('handle importAccountFromPrivateKey failure', async () => {
      // Arrange
      const error = new Error('Failed to import private key');
      (
        Authentication.importAccountFromPrivateKey as jest.Mock
      ).mockRejectedValue(error);

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'Failed to import private key',
      );
    });

    it('handle importSeedlessMnemonicToVault failure', async () => {
      // Arrange
      const error = new Error('Failed to import mnemonic');
      (
        Authentication.importSeedlessMnemonicToVault as jest.Mock
      ).mockRejectedValue(error);

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'Failed to import mnemonic',
      );
    });

    it('handle mixed secret types with some failures', async () => {
      // Arrange
      const mockSecret1 = {
        data: new Uint8Array([1, 2, 3]),
        type: SecretType.PrivateKey,
      };
      const mockSecret2 = {
        data: new Uint8Array([4, 5, 6]),
        type: SecretType.Mnemonic,
      };
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret, mockSecret1, mockSecret2],
      );

      // First import succeeds, second fails
      (
        Authentication.importAccountFromPrivateKey as jest.Mock
      ).mockResolvedValueOnce(undefined);
      (
        Authentication.importSeedlessMnemonicToVault as jest.Mock
      ).mockRejectedValueOnce(new Error('Failed to import mnemonic'));

      // Act & Assert
      await expect(Authentication.syncSeedPhrases()).rejects.toThrow(
        'Failed to import mnemonic',
      );
      expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledTimes(
        1,
      );
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).toHaveBeenCalledTimes(1);
    });

    it('handle unknown secret types gracefully', async () => {
      // Arrange
      const mockUnknownSecret = {
        data: new Uint8Array([1, 2, 3, 4]),
        type: 'unknown' as SecretType,
      };
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret, mockUnknownSecret],
      );

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).not.toHaveBeenCalled();
      expect(
        Authentication.importSeedlessMnemonicToVault,
      ).not.toHaveBeenCalled();
    });

    it('handle empty secret data', async () => {
      // Arrange
      const mockEmptySecret = {
        data: new Uint8Array([]),
        type: SecretType.PrivateKey,
      };
      Engine.context.SeedlessOnboardingController.fetchAllSecretData.mockResolvedValue(
        [mockRootSecret, mockEmptySecret],
      );

      // Act
      await Authentication.syncSeedPhrases();

      // Assert
      expect(Authentication.importAccountFromPrivateKey).toHaveBeenCalledWith(
        '0x',
        {
          shouldCreateSocialBackup: false,
          shouldSelectAccount: false,
        },
      );
    });
  });
});
