import StorageWrapper from '../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
} from '../../constants/storage';
import { Authentication } from './Authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import SecureKeychain from '../SecureKeychain';
import ReduxService, { ReduxStore } from '../redux';
import AuthenticationError from './AuthenticationError';
import {
  AUTHENTICATION_STORE_PASSWORD_FAILED,
  AUTHENTICATION_RESET_PASSWORD_FAILED,
  AUTHENTICATION_RESET_PASSWORD_FAILED_MESSAGE,
} from '../../constants/error';
import { SeedlessOnboardingController } from '@metamask/seedless-onboarding-controller';
import { KeyringController, KeyringTypes } from '@metamask/keyring-controller';
import { EncryptionKey } from '@metamask/browser-passworder';
import { uint8ArrayToMnemonic } from '../../util/mnemonic';

// Mock the Vault module
jest.mock('../Vault', () => ({
  recreateVaultWithNewPassword: jest.fn(),
}));

// Mock the accountsController selector
jest.mock('../../selectors/accountsController', () => ({
  selectSelectedInternalAccountFormattedAddress: jest.fn(),
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

jest.mock('../SnapKeyring/MultichainWalletSnapClient', () => ({
  MultichainWalletSnapFactory: {
    createClient: () => mockSnapClient,
  },
  WalletClientType: {
    Solana: 'solana',
    Bitcoin: 'bitcoin',
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
      state: {
        keyrings: [{ metadata: { id: 'test-keyring-id' } }],
      },
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

const mockUint8ArrayToMnemonic = jest
  .fn()
  .mockImplementation((uint8Array: Uint8Array) => uint8Array.toString());

jest.mock('../../util/mnemonic', () => ({
  uint8ArrayToMnemonic: (mnemonic: Uint8Array, wordlist: string[]) =>
    mockUint8ArrayToMnemonic(mnemonic, wordlist),
}));

jest.mock('../../util/Logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
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
      };
      Engine.context.KeyringController.state.keyrings = [
        { metadata: { id: 'test-keyring' } },
      ];
      Engine.context.KeyringController.exportSeedPhrase = jest
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
    const mockAuthData = { currentAuthType: AUTHENTICATION_TYPE.PASSWORD };
    const mockSeedPhrase1 = new Uint8Array([1]);
    const mockSeedPhrase2 = new Uint8Array([2]);

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

      Engine.context.SeedlessOnboardingController = {
        fetchAllSeedPhrases: jest.fn(),
        updateBackupMetadataState: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
      Engine.context.KeyringController = {
        addNewKeyring: jest.fn(),
        createNewVaultAndRestore: jest.fn(),
        state: {
          keyrings: [
            { name: 'HD Key Tree', metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should rehydrate with a single seed phrase', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockResolvedValueOnce([mockSeedPhrase1]);
      const newWalletAndRestoreSpy = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockResolvedValueOnce(undefined);

      await Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData);

      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSeedPhrases,
      ).toHaveBeenCalledWith(mockPassword);
      expect(mockUint8ArrayToMnemonic).toHaveBeenCalledWith(
        mockSeedPhrase1,
        expect.any(Object),
      );
      expect(newWalletAndRestoreSpy).toHaveBeenCalledWith(
        mockPassword,
        mockAuthData,
        uint8ArrayToMnemonic(mockSeedPhrase1, []),
        false,
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(2); // logIn and passwordSet
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('should rehydrate with multiple seed phrases', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockResolvedValueOnce([mockSeedPhrase1, mockSeedPhrase2]);
      const newWalletAndRestoreSpy = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockResolvedValueOnce(undefined);
      (
        Engine.context.KeyringController.addNewKeyring as jest.Mock
      ).mockResolvedValueOnce({
        id: 'new-keyring-id',
      });

      await Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData);

      const mockMnemonic1 = uint8ArrayToMnemonic(mockSeedPhrase1, []);
      const mockMnemonic2 = uint8ArrayToMnemonic(mockSeedPhrase2, []);

      expect(
        Engine.context.SeedlessOnboardingController.fetchAllSeedPhrases,
      ).toHaveBeenCalledWith(mockPassword);
      expect(mockUint8ArrayToMnemonic).toHaveBeenCalledWith(
        mockSeedPhrase1,
        expect.any(Object),
      );
      expect(newWalletAndRestoreSpy).toHaveBeenCalledWith(
        mockPassword,
        mockAuthData,
        mockMnemonic1,
        false,
      );
      expect(
        Engine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledWith(KeyringTypes.hd, {
        mnemonic: mockMnemonic2,
        numberOfAccounts: 1,
      });
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).toHaveBeenCalledWith({
        keyringId: 'new-keyring-id',
        seedPhrase: mockSeedPhrase2,
      });
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(2); // logIn and passwordSet
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('should throw an error if no seed phrases are found', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockResolvedValueOnce([]);
      await expect(
        Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData),
      ).rejects.toThrow('No account data found');
    });

    it('should re-throw errors from fetchAllSeedPhrases', async () => {
      const error = new Error('Fetch failed');
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockRejectedValueOnce(error);
      await expect(
        Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData),
      ).rejects.toThrow('Fetch failed');
    });

    it('should handle errors when adding new keyrings and continue', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockResolvedValueOnce([mockSeedPhrase1, mockSeedPhrase2]);
      const newWalletAndRestoreSpy = jest
        .spyOn(Authentication, 'newWalletAndRestore')
        .mockResolvedValueOnce(undefined);
      const error = new Error('Keyring add failed');
      (
        Engine.context.KeyringController.addNewKeyring as jest.Mock
      ).mockRejectedValueOnce(error);

      await Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData);

      expect(
        Engine.context.KeyringController.addNewKeyring,
      ).toHaveBeenCalledTimes(1);
      expect(newWalletAndRestoreSpy).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.updateBackupMetadataState,
      ).not.toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(error);
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(2); // logIn and passwordSet
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('should throw an error if first seed phrase is falsy', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSeedPhrases as jest.Mock
      ).mockResolvedValueOnce([null, mockSeedPhrase2]);

      await expect(
        Authentication.rehydrateSeedPhrase(mockPassword, mockAuthData),
      ).rejects.toThrow('No seed phrase found');
    });
  });

  describe('submitLatestGlobalSeedlessPassword', () => {
    const mockGlobalPassword = 'globalPassword123';
    const mockAuthType = { currentAuthType: AUTHENTICATION_TYPE.PASSWORD };
    const mockCurrentDevicePassword = 'devicePassword123';
    const mockSelectedAddress = '0x1234567890abcdef';

    let Engine: typeof import('../Engine').default;
    let recreateVaultWithNewPassword: jest.MockedFunction<
      typeof import('../Vault').recreateVaultWithNewPassword
    >;
    let selectSelectedInternalAccountFormattedAddress: jest.MockedFunction<
      typeof import('../../selectors/accountsController').selectSelectedInternalAccountFormattedAddress
    >;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      recreateVaultWithNewPassword =
        jest.requireMock('../Vault').recreateVaultWithNewPassword;
      selectSelectedInternalAccountFormattedAddress = jest.requireMock(
        '../../selectors/accountsController',
      ).selectSelectedInternalAccountFormattedAddress;

      // Setup the selector mock to return the expected address
      selectSelectedInternalAccountFormattedAddress.mockReturnValue(
        mockSelectedAddress,
      );

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => ({
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
            },
          },
        })),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        recoverCurrentDevicePassword: jest.fn(),
        syncLatestGlobalPassword: jest.fn(),
        checkIsPasswordOutdated: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      jest.spyOn(Authentication, 'userEntryAuth').mockResolvedValue(undefined);
      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue(undefined);
      jest.spyOn(Authentication, 'lockApp').mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.clearAllMocks();
      recreateVaultWithNewPassword.mockReset();
      selectSelectedInternalAccountFormattedAddress.mockReset();
    });

    it('successfully syncs latest global seedless password', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .recoverCurrentDevicePassword as jest.Mock
      ).mockResolvedValueOnce({ password: mockCurrentDevicePassword });
      (
        Engine.context.SeedlessOnboardingController
          .syncLatestGlobalPassword as jest.Mock
      ).mockResolvedValueOnce(undefined);
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(false);
      recreateVaultWithNewPassword.mockResolvedValueOnce(undefined);

      await Authentication.submitLatestGlobalSeedlessPassword(
        mockGlobalPassword,
        mockAuthType,
      );

      expect(
        Engine.context.SeedlessOnboardingController
          .recoverCurrentDevicePassword,
      ).toHaveBeenCalledWith({ globalPassword: mockGlobalPassword });
      expect(Authentication.userEntryAuth).toHaveBeenCalledWith(
        mockCurrentDevicePassword,
        mockAuthType,
      );
      expect(
        Engine.context.SeedlessOnboardingController.syncLatestGlobalPassword,
      ).toHaveBeenCalledWith({
        oldPassword: mockCurrentDevicePassword,
        globalPassword: mockGlobalPassword,
      });
      expect(recreateVaultWithNewPassword).toHaveBeenCalledWith(
        mockCurrentDevicePassword,
        mockGlobalPassword,
        mockSelectedAddress,
        true,
      );
      expect(Authentication.resetPassword).toHaveBeenCalled();
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('lock app and throw error if vault recreation fails', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .recoverCurrentDevicePassword as jest.Mock
      ).mockResolvedValueOnce({ password: mockCurrentDevicePassword });
      (
        Engine.context.SeedlessOnboardingController
          .syncLatestGlobalPassword as jest.Mock
      ).mockResolvedValueOnce(undefined);

      const vaultError = new Error('Vault recreation failed');
      recreateVaultWithNewPassword.mockRejectedValueOnce(vaultError);

      await expect(
        Authentication.submitLatestGlobalSeedlessPassword(
          mockGlobalPassword,
          mockAuthType,
        ),
      ).rejects.toThrow('Vault recreation failed');

      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockRejectedValue(undefined);

      expect(Authentication.lockApp).toHaveBeenCalledWith({ locked: true });
    });
  });

  describe('checkIsSeedlessPasswordOutdated', () => {
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        checkIsPasswordOutdated: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns password outdated status when using seedless onboarding flow', async () => {
      const mockIsOutdated = true;
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(mockIsOutdated);

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

      const result = await Authentication.checkIsSeedlessPasswordOutdated(true);

      expect(result).toBe(mockIsOutdated);
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: true });
    });

    it('uses default skipCache value when not provided', async () => {
      const mockIsOutdated = false;
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(mockIsOutdated);

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

      const result = await Authentication.checkIsSeedlessPasswordOutdated();

      expect(result).toBe(mockIsOutdated);
      expect(
        Engine.context.SeedlessOnboardingController.checkIsPasswordOutdated,
      ).toHaveBeenCalledWith({ skipCache: false });
    });

    it('return false when checkIsPasswordOutdated undefined', async () => {
      const mockIsOutdated = undefined;
      (
        Engine.context.SeedlessOnboardingController
          .checkIsPasswordOutdated as jest.Mock
      ).mockResolvedValueOnce(mockIsOutdated);

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

      const result = await Authentication.checkIsSeedlessPasswordOutdated();

      expect(result).toBe(false);
    });
  });

  describe('unlock App with seedless onboarding flow', () => {
    const Engine = jest.requireMock('../Engine');
    beforeEach(() => {
      Engine.context.SeedlessOnboardingController = {
        state: { vault: 'existing vault data' },
        submitPassword: jest.fn(),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
      Engine.context.KeyringController = {
        submitPassword: jest.fn(),
      } as unknown as KeyringController;
    });

    it('should throw an error if not using seedless onboarding flow', async () => {
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
});
