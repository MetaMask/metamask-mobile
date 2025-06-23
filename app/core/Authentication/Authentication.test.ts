import StorageWrapper from '../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  EXISTING_USER,
  SOLANA_DISCOVERY_PENDING,
} from '../../constants/storage';
import { Authentication } from './Authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import SecureKeychain from '../SecureKeychain';
import ReduxService, { ReduxStore } from '../redux';

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

describe('Authentication', () => {
  afterEach(() => {
    StorageWrapper.clearAll();
    jest.restoreAllMocks();
  });

  it('should return a type password', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type biometric', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toEqual('FaceID');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('should return a type passcode', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
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
    await StorageWrapper.setItem(EXISTING_USER, TRUE);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user exists and there are no available biometrics options but the password does not exist in the keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    await StorageWrapper.setItem(EXISTING_USER, TRUE);
    SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(null);
    const result = await Authentication.getType();
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('should return a type AUTHENTICATION_TYPE.PASSWORD if the user does not exist and there are no available biometrics options', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    await StorageWrapper.setItem(EXISTING_USER, TRUE);
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
    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('should return set a password using PASSWORD', async () => {
    let methodCalled = false;
    SecureKeychain.resetGenericPassword = jest
      .fn()
      .mockReturnValue((methodCalled = true));
    await Authentication.storePassword('1234', AUTHENTICATION_TYPE.UNKNOWN);
    expect(methodCalled).toBeTruthy();
  });

  describe('Multichain - discoverAccounts', () => {
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
      );
    });

    describe('Solana account discovery failure handling', () => {
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
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('completes wallet creation when Solana discovery fails', async () => {
        mockSnapClient.addDiscoveredAccounts.mockRejectedValueOnce(new Error('Solana RPC error'));

        await expect(
          Authentication.newWalletAndKeychain('1234', {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          })
        ).resolves.not.toThrow();

        // Verify Solana discovery was attempted
        expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalled();
      });

      it('completes wallet restore when Solana discovery fails', async () => {
        // Mock Solana discovery to fail
        mockSnapClient.addDiscoveredAccounts.mockRejectedValueOnce(new Error('Network timeout'));

        // Wallet restore should succeed despite Solana failure
        await expect(
          Authentication.newWalletAndRestore(
            '1234',
            { currentAuthType: AUTHENTICATION_TYPE.PASSWORD },
            'test seed phrase',
            true
          )
        ).resolves.not.toThrow();

        // Verify Solana discovery was attempted
        expect(mockSnapClient.addDiscoveredAccounts).toHaveBeenCalled();
      });

      it('does not break authentication flow when Solana discovery fails', async () => {
        // Set up pending discovery that will be checked on unlock
        await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

        const mockCredentials = { username: 'test', password: 'test' };
        SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

        // App unlock should succeed even if retry fails
        await expect(Authentication.appTriggeredAuth()).resolves.not.toThrow();
      });

      describe('retrySolanaDiscoveryIfPending behavior', () => {
        let mockAttemptSolanaAccountDiscovery: jest.SpyInstance;

        beforeEach(() => {
          // Spy on the private method
          mockAttemptSolanaAccountDiscovery = jest.spyOn(
            Authentication as unknown as { attemptSolanaAccountDiscovery: () => Promise<void> },
            'attemptSolanaAccountDiscovery'
          ).mockResolvedValue(undefined);
        });

        afterEach(() => {
          mockAttemptSolanaAccountDiscovery.mockRestore();
        });

        it('calls attemptSolanaAccountDiscovery when flag is set to true', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptSolanaAccountDiscovery).toHaveBeenCalled();
        });

        it('does not call attemptSolanaAccountDiscovery when flag is not set', async () => {
          await StorageWrapper.removeItem(SOLANA_DISCOVERY_PENDING);

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptSolanaAccountDiscovery).not.toHaveBeenCalled();
        });

        it('does not call attemptSolanaAccountDiscovery when flag is false', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'false');

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

          await Authentication.appTriggeredAuth();

          expect(mockAttemptSolanaAccountDiscovery).not.toHaveBeenCalled();
        });

        it('retries on userEntryAuth when flag is set', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');

          await Authentication.userEntryAuth('1234', {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          });

          expect(mockAttemptSolanaAccountDiscovery).toHaveBeenCalled();
        });

        it('handles storage errors gracefully without breaking authentication', async () => {
          const originalGetItem = StorageWrapper.getItem;
          StorageWrapper.getItem = jest.fn().mockRejectedValueOnce(new Error('Storage read error'));

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

          await expect(Authentication.appTriggeredAuth()).resolves.not.toThrow();

          expect(console.warn).toHaveBeenCalledWith(
            'Failed to check/retry Solana discovery:',
            expect.any(Error)
          );

          // Should not attempt discovery due to storage error
          expect(mockAttemptSolanaAccountDiscovery).not.toHaveBeenCalled();

          // Restore original method
          StorageWrapper.getItem = originalGetItem;
        });

        it('handles discovery attempt errors gracefully', async () => {
          await StorageWrapper.setItem(SOLANA_DISCOVERY_PENDING, 'true');
          mockAttemptSolanaAccountDiscovery.mockRejectedValueOnce(new Error('Discovery failed'));

          const mockCredentials = { username: 'test', password: 'test' };
          SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(mockCredentials);

          // Should not throw and should complete authentication
          await expect(Authentication.appTriggeredAuth()).resolves.not.toThrow();

          expect(mockAttemptSolanaAccountDiscovery).toHaveBeenCalled();
          expect(console.warn).toHaveBeenCalledWith(
            'Failed to check/retry Solana discovery:',
            expect.any(Error)
          );
        });
      });
    });
  });
});
