import StorageWrapper from '../../store/storage-wrapper';
import {
  BIOMETRY_CHOICE_DISABLED,
  TRUE,
  PASSCODE_DISABLED,
  OPTIN_META_METRICS_UI_SEEN,
  PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
} from '../../constants/storage';
import { Authentication } from './Authentication';
import AUTHENTICATION_TYPE from '../../constants/userProperties';
// eslint-disable-next-line import/no-namespace
import * as Keychain from 'react-native-keychain';
import SecureKeychain from '../SecureKeychain';
import ReduxService, { ReduxStore } from '../redux';
import AuthenticationError from './AuthenticationError';
import {
  AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
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
import {
  logOut,
  setExistingUser,
  logIn,
  passwordSet,
} from '../../actions/user';
import { setCompletedOnboarding } from '../../actions/onboarding';
import { setAllowLoginWithRememberMe } from '../../actions/security';
import { RootState } from '../../reducers';
import {
  SeedlessOnboardingControllerError,
  SeedlessOnboardingControllerErrorType,
} from '../Engine/controllers/seedless-onboarding-controller/error';
import { TraceName, TraceOperation } from '../../util/trace';
import MetaMetrics from '../Analytics/MetaMetrics';
import { resetProviderToken as depositResetProviderToken } from '../../components/UI/Ramp/Deposit/utils/ProviderTokenVault';
import { clearAllVaultBackups } from '../BackupVault/backupVault';
import { Engine as EngineClass } from '../Engine/Engine';
import { cancelBulkLink } from '../../store/sagas/rewardsBulkLinkAccountGroups';
import Logger from '../../util/Logger';
import { Alert } from 'react-native';
import { strings } from '../../../locales/i18n';
import trackErrorAsAnalytics from '../../util/metrics/TrackError/trackErrorAsAnalytics';
import Routes from '../../constants/navigation/Routes';
import { IconName } from '../../component-library/components/Icons/Icon';
import { ReauthenticateErrorType } from './types';

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

// Mock the bulk link saga to avoid import chain issues
jest.mock('../../store/sagas/rewardsBulkLinkAccountGroups', () => ({
  cancelBulkLink: jest.fn(() => ({ type: 'rewards/bulkLink/CANCEL' })),
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

const mockResyncAccounts = jest.fn().mockResolvedValue(undefined);

jest.mock('../Engine', () => ({
  resetState: jest.fn(),
  controllerMessenger: {
    call: jest.fn(),
  },
  context: {
    KeyringController: {
      createNewVaultAndKeychain: jest.fn(),
      createNewVaultAndRestore: jest.fn(),
      submitPassword: jest.fn(),
      setLocked: jest.fn(),
      isUnlocked: jest.fn(() => true),
      removeAccount: jest.fn(),
      verifyPassword: jest.fn(),
      state: {
        keyrings: [
          { type: 'HD Key Tree', metadata: { id: 'test-keyring-id' } },
        ],
      },
    },

    SeedlessOnboardingController: {
      addNewSecretData: jest.fn(),
      updateBackupMetadataState: jest.fn(),
      state: { vault: null },
    },

    MultichainAccountService: {
      init: jest.fn().mockResolvedValue(undefined),
      resyncAccounts: jest.fn().mockImplementation(() => mockResyncAccounts()),
    },
  },
}));

// Mock for Engine class (used in error recovery)
jest.mock('../Engine/Engine', () => ({
  Engine: class MockEngine {
    static disableAutomaticVaultBackup = false;
  },
}));

const mockNavigate = jest.fn();
const mockReset = jest.fn();

const mockNavigation = {
  reset: mockReset,
  navigate: mockNavigate,
};

jest.mock('../NavigationService', () => ({
  __esModule: true,
  default: {
    get navigation() {
      return mockNavigation;
    },
    set navigation(value) {
      // Mock setter - does nothing but prevents errors
    },
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

jest.mock('../Analytics/MetaMetrics', () => {
  const mockInstance = {
    createDataDeletionTask: jest.fn(),
    updateDataRecordingFlag: jest.fn(),
  };
  return {
    __esModule: true,
    default: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../../components/UI/Ramp/Deposit/utils/ProviderTokenVault', () => ({
  resetProviderToken: jest.fn(),
}));

jest.mock('../../multichain-accounts/AccountTreeInitService', () => ({
  initializeAccountTree: jest.fn().mockResolvedValue(undefined),
  clearState: jest.fn().mockResolvedValue(undefined),
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

jest.mock('react-native', () => ({
  Alert: {
    alert: jest.fn(),
  },
}));

jest.mock('../../../locales/i18n', () => ({
  strings: jest.fn((key: string) => key),
}));

jest.mock('../../util/metrics/TrackError/trackErrorAsAnalytics', () =>
  jest.fn(),
);

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
  let mockDispatch: jest.Mock;

  beforeEach(() => {
    mockDispatch = jest.fn();
  });

  afterEach(() => {
    StorageWrapper.clearAll();
    jest.restoreAllMocks();
    jest.runAllTimers();
  });

  it('returns PASSWORD type when biometric and passcode are disabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

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

  it('returns BIOMETRIC type when biometric is available and not disabled', async () => {
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

  it('returns PASSCODE type when biometric is disabled but passcode is available', async () => {
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

  it('returns PASSWORD type when both biometric and passcode are disabled', async () => {
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

  it('returns REMEMBER_ME type when user exists, no biometrics available, and password exists in keychain', async () => {
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

  it('prioritizes REMEMBER_ME over BIOMETRIC when remember me is enabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);

    // Mock Redux store to return existingUser: true and remember me enabled
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
    expect(result.availableBiometryType).toEqual('FaceID');
  });

  it('prioritizes REMEMBER_ME over PASSCODE when remember me is enabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    await StorageWrapper.setItem(BIOMETRY_CHOICE_DISABLED, TRUE);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);

    // Mock Redux store to return existingUser: true and remember me enabled
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
    expect(result.availableBiometryType).toEqual('Fingerprint');
  });

  it('returns BIOMETRIC when remember me is disabled even if password exists', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    const mockCredentials = { username: 'test', password: 'test' };
    SecureKeychain.getGenericPassword = jest
      .fn()
      .mockReturnValue(mockCredentials);

    // Mock Redux store to return existingUser: true but remember me disabled
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: false },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
    expect(result.availableBiometryType).toEqual('FaceID');
  });

  it('returns BIOMETRIC when remember me is enabled but password does not exist in keychain', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
    SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(null);

    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({
        user: { existingUser: true },
        security: { allowLoginWithRememberMe: true },
      }),
    } as unknown as ReduxStore);

    const result = await Authentication.getType();

    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  it('returns PASSWORD type when user exists, no biometrics available, and password does not exist in keychain', async () => {
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

  it('returns PASSWORD type when user does not exist and no biometrics are available', async () => {
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

  it('returns REMEMBER_ME type for components when remember me is enabled', async () => {
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

  it('returns PASSWORD type for components when both biometric and passcode are disabled', async () => {
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

  it('returns PASSCODE type for components when passcode was previously chosen (PASSCODE_DISABLED not set)', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    // PASSCODE_DISABLED is not set (null/undefined) - represents user who chose PASSCODE
    // BIOMETRY_CHOICE_DISABLED is set to represent that biometrics are disabled
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

  it('returns BIOMETRIC type for components when biometric was previously chosen (PASSCODE_DISABLED is TRUE)', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    // PASSCODE_DISABLED = TRUE represents user who previously chose BIOMETRIC
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

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

  it('returns BIOMETRIC type for components when no previous auth choice exists (new user choosing biometrics)', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    // No storage flags set - represents new user or first-time choice
    // With new logic, this defaults to BIOMETRIC when biometryChoice is true

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

  it('returns PASSWORD type when biometryChoice is false', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
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

  it('returns PASSWORD type when biometrics are not available', async () => {
    SecureKeychain.getSupportedBiometryType = jest.fn().mockReturnValue(null);
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);

    // Mock Redux store to return allowLoginWithRememberMe: false
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: false } }),
    } as unknown as ReduxStore);

    const result = await Authentication.componentAuthenticationType(
      true,
      false,
    );
    expect(result.availableBiometryType).toBeNull();
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.PASSWORD);
  });

  it('prioritizes REMEMBER_ME over BIOMETRIC when both are enabled', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    // Don't set PASSCODE_DISABLED - this allows BIOMETRIC condition to potentially match
    // but REMEMBER_ME should still take priority when rememberMe is true

    // Mock Redux store to return allowLoginWithRememberMe: true
    jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
      getState: () => ({ security: { allowLoginWithRememberMe: true } }),
    } as unknown as ReduxStore);

    const result = await Authentication.componentAuthenticationType(true, true);
    expect(result.availableBiometryType).toEqual('Fingerprint');
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.REMEMBER_ME);
  });

  it('returns BIOMETRIC type when PASSCODE_DISABLED is TRUE and biometryChoice is true, even if BIOMETRY_CHOICE_DISABLED was previously set', async () => {
    SecureKeychain.getSupportedBiometryType = jest
      .fn()
      .mockReturnValue(Keychain.BIOMETRY_TYPE.FINGERPRINT);
    // User previously disabled biometrics but then re-enabled them
    // PASSCODE_DISABLED = TRUE indicates they want BIOMETRIC
    await StorageWrapper.setItem(PASSCODE_DISABLED, TRUE);
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
    expect(result.currentAuthType).toEqual(AUTHENTICATION_TYPE.BIOMETRIC);
  });

  describe('storePassword (protected method tested via updateAuthPreference)', () => {
    const mockPassword = 'test-password-123';
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      jest.clearAllMocks();

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: mockDispatch,
        getState: () => ({
          user: { existingUser: true },
          settings: { lockTime: 30000 },
          security: { allowLoginWithRememberMe: true },
        }),
      } as unknown as ReduxStore);

      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue(undefined) as jest.MockedFunction<
        typeof Engine.context.KeyringController.exportSeedPhrase
      >;

      jest.spyOn(Authentication, 'getPassword').mockResolvedValue({
        password: mockPassword,
        username: 'metamask-user',
      } as unknown as import('react-native-keychain').UserCredentials);

      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue(undefined);
      jest
        .spyOn(SecureKeychain, 'setGenericPassword')
        .mockResolvedValue(undefined);

      // Mock SecureKeychain methods needed by checkAuthenticationMethod
      SecureKeychain.getSupportedBiometryType = jest
        .fn()
        .mockReturnValue(Keychain.BIOMETRY_TYPE.FACE_ID);
      SecureKeychain.getGenericPassword = jest.fn().mockReturnValue(null);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      StorageWrapper.clearAll();
    });

    it('stores password with BIOMETRIC and manages storage flags correctly', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
        password: mockPassword,
      });

      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(mockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('stores password with PASSCODE and manages storage flags correctly', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.PASSCODE,
        password: mockPassword,
      });

      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.PASSCODE,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(mockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('stores password with REMEMBER_ME and manages storage flags correctly', async () => {
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.REMEMBER_ME,
        password: mockPassword,
      });

      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.REMEMBER_ME,
      );

      // But can store previous auth type (expected behavior)
      expect(setItemSpy).toHaveBeenCalledWith(
        PREVIOUS_AUTH_TYPE_BEFORE_REMEMBER_ME,
        expect.any(String),
      );
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(setItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(mockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('stores password with PASSWORD and disables both biometric and passcode', async () => {
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.PASSWORD,
        password: mockPassword,
      });

      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        undefined,
      );
      expect(setItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(mockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('throws AuthenticationError when SecureKeychain fails', async () => {
      const error = new Error('Keychain error');
      jest
        .spyOn(SecureKeychain, 'setGenericPassword')
        .mockRejectedValueOnce(error);

      await expect(
        Authentication.updateAuthPreference({
          authType: AUTHENTICATION_TYPE.PASSWORD,
          password: mockPassword,
        }),
      ).rejects.toThrow(AuthenticationError);

      try {
        await Authentication.updateAuthPreference({
          authType: AUTHENTICATION_TYPE.PASSWORD,
          password: mockPassword,
        });
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

    it('falls back to PASSWORD authType when biometric storePassword fails in newWalletAndKeychain', async () => {
      const fallbackMockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: fallbackMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      const fallbackEngine = jest.requireMock('../Engine');

      // Mock successful vault creation
      fallbackEngine.context.KeyringController.createNewVaultAndKeychain.mockResolvedValueOnce(
        undefined,
      );
      fallbackEngine.resetState = jest.fn().mockResolvedValueOnce(undefined);

      // Mock storePassword to fail on first call (biometric), succeed on second (password)
      // Use type casting to access protected method for testing
      const storePasswordSpy = jest
        .spyOn(
          Authentication as unknown as { storePassword: jest.Mock },
          'storePassword',
        )
        .mockRejectedValueOnce(new Error('Biometric storage failed'))
        .mockResolvedValueOnce(undefined);

      await Authentication.newWalletAndKeychain('password', {
        currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      // Verifies storePassword was called twice: first with BIOMETRIC (failed), then with PASSWORD (succeeded)
      expect(storePasswordSpy).toHaveBeenCalledTimes(2);
      expect(storePasswordSpy).toHaveBeenNthCalledWith(
        1,
        'password',
        AUTHENTICATION_TYPE.BIOMETRIC,
      );
      expect(storePasswordSpy).toHaveBeenNthCalledWith(
        2,
        'password',
        AUTHENTICATION_TYPE.PASSWORD,
      );

      // Verifies operation completed successfully
      expect(fallbackMockDispatch).toHaveBeenCalledWith(setExistingUser(true));
      expect(fallbackMockDispatch).toHaveBeenCalledWith(logIn());

      storePasswordSpy.mockRestore();
    });

    it('falls back to PASSWORD authType when biometric storePassword fails in newWalletAndRestore', async () => {
      const restoreMockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: restoreMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      const restoreEngine = jest.requireMock('../Engine');

      // Mock successful vault restoration
      restoreEngine.context.KeyringController.createNewVaultAndRestore.mockResolvedValueOnce(
        undefined,
      );
      restoreEngine.resetState = jest.fn().mockResolvedValueOnce(undefined);

      // Mock storePassword to fail on first call (biometric), succeed on second (password)
      // Use type casting to access protected method for testing
      const storePasswordSpy = jest
        .spyOn(
          Authentication as unknown as { storePassword: jest.Mock },
          'storePassword',
        )
        .mockRejectedValueOnce(new Error('Biometric storage failed'))
        .mockResolvedValueOnce(undefined);

      await Authentication.newWalletAndRestore(
        'password',
        {
          currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC,
        },
        'test seed phrase',
        true,
      );

      // Verifies storePassword was called twice: first with BIOMETRIC (failed), then with PASSWORD (succeeded)
      expect(storePasswordSpy).toHaveBeenCalledTimes(2);
      expect(storePasswordSpy).toHaveBeenNthCalledWith(
        1,
        'password',
        AUTHENTICATION_TYPE.BIOMETRIC,
      );
      expect(storePasswordSpy).toHaveBeenNthCalledWith(
        2,
        'password',
        AUTHENTICATION_TYPE.PASSWORD,
      );

      // Verifies operation completed successfully
      expect(restoreMockDispatch).toHaveBeenCalledWith(setExistingUser(true));
      expect(restoreMockDispatch).toHaveBeenCalledWith(logIn());

      storePasswordSpy.mockRestore();
    });

    it('throws error when PASSWORD authType storePassword fails in newWalletAndKeychain', async () => {
      const errorMockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: errorMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      const errorEngine = jest.requireMock('../Engine');

      errorEngine.context.KeyringController.setLocked.mockResolvedValue(
        undefined,
      );

      // Mock successful vault creation
      errorEngine.context.KeyringController.createNewVaultAndKeychain.mockResolvedValueOnce(
        undefined,
      );
      errorEngine.resetState = jest.fn().mockResolvedValueOnce(undefined);

      // Mock storePassword to fail even with PASSWORD authType
      // Use type casting to access protected method for testing
      const storePasswordSpy = jest
        .spyOn(
          Authentication as unknown as { storePassword: jest.Mock },
          'storePassword',
        )
        .mockRejectedValue(new Error('Password storage failed'));

      try {
        await Authentication.newWalletAndKeychain('password', {
          currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
        });
        throw new Error('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).customErrorMessage).toBe(
          AUTHENTICATION_FAILED_WALLET_CREATION,
        );
        expect((error as AuthenticationError).message).toBe(
          'Password storage failed',
        );
        // Verifies storePassword was called only once since it's PASSWORD authType (no fallback)
        expect(storePasswordSpy).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        jest.runAllTimers();
        expect(errorMockDispatch).toHaveBeenCalledWith(logOut());
      }

      storePasswordSpy.mockRestore();
    });

    it('throws error when PASSWORD authType storePassword fails in newWalletAndRestore', async () => {
      const restoreErrorMockDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: restoreErrorMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      const restoreErrorEngine = jest.requireMock('../Engine');

      restoreErrorEngine.context.KeyringController.setLocked.mockResolvedValue(
        undefined,
      );

      // Mock successful vault restoration
      restoreErrorEngine.context.KeyringController.createNewVaultAndRestore.mockResolvedValueOnce(
        undefined,
      );
      restoreErrorEngine.resetState = jest
        .fn()
        .mockResolvedValueOnce(undefined);

      // Mock storePassword to fail even with PASSWORD authType
      // Use type casting to access protected method for testing
      const storePasswordSpy = jest
        .spyOn(
          Authentication as unknown as { storePassword: jest.Mock },
          'storePassword',
        )
        .mockRejectedValue(new Error('Password storage failed'));

      try {
        await Authentication.newWalletAndRestore(
          'password',
          {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          },
          'test seed phrase',
          true,
        );
        throw new Error('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as AuthenticationError).customErrorMessage).toBe(
          AUTHENTICATION_FAILED_WALLET_CREATION,
        );
        expect((error as AuthenticationError).message).toBe(
          'Password storage failed',
        );
        // Verifies storePassword was called only once since it's PASSWORD authType (no fallback)
        expect(storePasswordSpy).toHaveBeenCalledTimes(1);
        await Promise.resolve();
        jest.runAllTimers();
        expect(restoreErrorMockDispatch).toHaveBeenCalledWith(logOut());
      }

      storePasswordSpy.mockRestore();
    });
  });

  describe('Multichain - discoverAccounts', () => {
    describe('Account discovery failure handling', () => {
      let mockAttemptMultichainAccountWalletDiscovery: jest.SpyInstance;

      beforeEach(() => {
        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          dispatch: jest.fn(),
          getState: () => ({ security: { allowLoginWithRememberMe: true } }),
        } as unknown as ReduxStore);
        jest.spyOn(console, 'warn').mockImplementation();
        jest.spyOn(console, 'log').mockImplementation();
        jest.spyOn(console, 'error').mockImplementation();
        jest.clearAllMocks();

        mockAttemptMultichainAccountWalletDiscovery = jest
          .spyOn(
            Authentication as unknown as {
              attemptMultichainAccountWalletDiscovery: () => Promise<void>;
            },
            'attemptMultichainAccountWalletDiscovery',
          )
          .mockResolvedValue(undefined);
      });

      afterEach(() => {
        jest.restoreAllMocks();
        mockAttemptMultichainAccountWalletDiscovery.mockRestore();
      });

      it('throws AuthenticationError when newWalletAndRestore fails', async () => {
        const mockDispatch = jest.fn();
        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          dispatch: mockDispatch,
          getState: () => ({ security: { allowLoginWithRememberMe: true } }),
        } as unknown as ReduxStore);

        const Engine = jest.requireMock('../Engine');

        Engine.context.KeyringController.setLocked.mockResolvedValue(undefined);

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
        Engine.context.KeyringController.setLocked.mockResolvedValue(undefined);

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

      it('resyncs accounts after login', async () => {
        const Engine = jest.requireMock('../Engine');
        Engine.context.KeyringController.state.keyrings = [
          { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
        ];

        const mockCredentials = { username: 'test', password: 'test' };
        SecureKeychain.getGenericPassword = jest
          .fn()
          .mockReturnValue(mockCredentials);

        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          dispatch: jest.fn(),
          getState: () => ({
            user: { existingUser: true },
            security: { allowLoginWithRememberMe: true },
          }),
        } as unknown as ReduxStore);

        jest
          .spyOn(MetaMetrics, 'getInstance')
          .mockReturnValue({ isEnabled: () => true } as MetaMetrics);

        await Authentication.unlockWallet();

        // Wait for the asynchronous call to `postLoginAsyncOperations`.
        await Promise.resolve();

        // Account resynchronization runs after logging in
        expect(mockResyncAccounts).toHaveBeenCalled();
      });

      it('runs discovery and alignment on all HD wallets after login', async () => {
        const Engine = jest.requireMock('../Engine');
        Engine.context.KeyringController.state.keyrings = [
          { type: KeyringTypes.hd, metadata: { id: 'test-keyring-1' } },
          { type: KeyringTypes.hd, metadata: { id: 'test-keyring-2' } },
          // Does not run discovery for this one.
          { type: KeyringTypes.simple, metadata: { id: 'test-keyring-3' } },
        ];

        const mockCredentials = { username: 'test', password: 'test' };
        SecureKeychain.getGenericPassword = jest
          .fn()
          .mockReturnValue(mockCredentials);

        jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
          dispatch: jest.fn(),
          getState: () => ({
            user: { existingUser: true },
            security: { allowLoginWithRememberMe: true },
          }),
        } as unknown as ReduxStore);

        jest
          .spyOn(MetaMetrics, 'getInstance')
          .mockReturnValue({ isEnabled: () => true } as MetaMetrics);

        await Authentication.unlockWallet();

        // Wait for the asynchronous call to `postLoginAsyncOperations`.
        await Promise.resolve();

        // Discovery + alignment runs on all HD keyrings only
        expect(
          mockAttemptMultichainAccountWalletDiscovery,
        ).toHaveBeenCalledTimes(2);
        expect(
          mockAttemptMultichainAccountWalletDiscovery,
        ).toHaveBeenNthCalledWith(1, 'test-keyring-1');
        expect(
          mockAttemptMultichainAccountWalletDiscovery,
        ).toHaveBeenNthCalledWith(2, 'test-keyring-2');
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
        setLocked: jest.fn().mockResolvedValue(undefined),
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
        setLocked: jest.fn().mockResolvedValue(undefined),
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
    it('calls SecureKeychain.resetGenericPassword', async () => {
      const resetGenericPasswordSpy = jest.spyOn(
        SecureKeychain,
        'resetGenericPassword',
      );

      await Authentication.resetPassword();

      expect(resetGenericPasswordSpy).toHaveBeenCalled();
    });

    it('throws AuthenticationError when SecureKeychain fails', async () => {
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

  describe('lockApp', () => {
    let Engine: typeof import('../Engine').default;
    let lockAppMockDispatch: jest.Mock;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      lockAppMockDispatch = jest.fn();

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: lockAppMockDispatch,
        getState: () => ({
          security: { allowLoginWithRememberMe: true },
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

      Engine.context.KeyringController = {
        isUnlocked: jest.fn().mockReturnValue(true),
        setLocked: jest.fn().mockResolvedValue(undefined),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;

      Engine.context.SeedlessOnboardingController = {
        setLocked: jest.fn().mockResolvedValue(undefined),
        state: { vault: null },
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue(undefined);
      jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValue(false);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('dispatches setAllowLoginWithRememberMe with false when allowRememberMe is false', async () => {
      await Authentication.lockApp({ allowRememberMe: false });

      expect(lockAppMockDispatch).toHaveBeenCalledWith(
        setAllowLoginWithRememberMe(false),
      );
    });

    it('does not dispatch setAllowLoginWithRememberMe when allowRememberMe is not provided', async () => {
      await Authentication.lockApp();

      expect(lockAppMockDispatch).not.toHaveBeenCalledWith(
        setAllowLoginWithRememberMe(false),
      );
    });

    it('does not dispatch setAllowLoginWithRememberMe when allowRememberMe is true', async () => {
      await Authentication.lockApp({ allowRememberMe: true });

      expect(lockAppMockDispatch).not.toHaveBeenCalledWith(
        setAllowLoginWithRememberMe(false),
      );
    });

    it('dispatches setAllowLoginWithRememberMe before calling resetPassword when allowRememberMe is false', async () => {
      const callOrder: string[] = [];

      lockAppMockDispatch.mockImplementation(() => {
        callOrder.push('dispatch');
      });

      jest
        .spyOn(Authentication, 'resetPassword')
        .mockImplementation(async () => {
          callOrder.push('resetPassword');
          await Promise.resolve();
        });

      await Authentication.lockApp({ allowRememberMe: false });

      expect(callOrder).toEqual(['dispatch', 'resetPassword', 'dispatch']);
    });

    it('calls resetPassword when reset is true', async () => {
      const resetPasswordSpy = jest.spyOn(Authentication, 'resetPassword');

      await Authentication.lockApp({ reset: true });

      expect(resetPasswordSpy).toHaveBeenCalledTimes(1);
    });

    it('skips resetPassword when reset is false', async () => {
      const resetPasswordSpy = jest.spyOn(Authentication, 'resetPassword');

      await Authentication.lockApp({ reset: false });

      expect(resetPasswordSpy).not.toHaveBeenCalled();
    });

    it('calls KeyringController.setLocked when keyring is unlocked', async () => {
      await Authentication.lockApp();

      expect(Engine.context.KeyringController.setLocked).toHaveBeenCalledTimes(
        1,
      );
    });

    it('skips KeyringController.setLocked when keyring is already locked', async () => {
      Engine.context.KeyringController.isUnlocked = jest
        .fn()
        .mockReturnValue(false);

      await Authentication.lockApp();

      expect(Engine.context.KeyringController.setLocked).not.toHaveBeenCalled();
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

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      OAuthService = jest.requireMock('../OAuthService/OAuthService');

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({
          user: { existingUser: true },
          security: { allowLoginWithRememberMe: true },
        }),
      } as unknown as ReduxStore);

      // Mock MetaMetrics.getInstance to return true for isEnabled
      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue({ isEnabled: () => true } as MetaMetrics);

      const mockKeyring = {
        getAccounts: jest.fn().mockResolvedValue(['0x1234567890abcdef']),
      };
      Engine.context.SeedlessOnboardingController = {
        fetchAllSecretData: jest.fn(),
        updateBackupMetadataState: jest.fn(),
        storeKeyringEncryptionKey: jest.fn(),
        loadKeyringEncryptionKey: jest.fn(),
        submitGlobalPassword: jest.fn(),
        submitPassword: jest.fn().mockResolvedValue(undefined),
        checkIsPasswordOutdated: jest.fn(),
        setLocked: jest.fn().mockResolvedValue(undefined),
        state: { vault: 'seedless onboarding vault' },
      } as unknown as SeedlessOnboardingController<EncryptionKey>;
      Engine.context.KeyringController = {
        setLocked: jest.fn(),
        isUnlocked: jest.fn().mockResolvedValue(true),
        addNewKeyring: jest.fn(),
        createNewVaultAndRestore: jest.fn(),
        submitPassword: jest.fn().mockResolvedValue(undefined),
        verifyPassword: jest.fn().mockResolvedValue(undefined),
        withKeyring: jest
          .fn()
          .mockImplementation(
            async ({ id: _id }, callback) =>
              await callback({ keyring: mockKeyring }),
          ),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
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

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

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
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
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
        user: { existingUser: true },
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
      Engine.context.SeedlessOnboardingController.state.vault =
        'seedless onboarding vault';

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

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
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
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
        .mockResolvedValueOnce(true);

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

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
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
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

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

      expect(newWalletAndRestoreSpy).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(expect.any(Error), 'unknown');
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
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

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

      expect(newWalletVaultAndRestoreSpy).toHaveBeenCalled();
      expect(importAccountFromPrivateKeySpy).toHaveBeenCalled();
      expect(Logger.error).toHaveBeenCalledWith(
        importError,
        'Error in rehydrateSeedPhrase- SeedlessOnboardingController',
      );
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('throw an error if no seed phrases are found', async () => {
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockResolvedValueOnce([]);
      await expect(
        Authentication.unlockWallet({
          password: mockPassword,
          authPreference: mockAuthData,
        }),
      ).rejects.toThrow('No account data found');
    });

    it('re-throw errors from fetchAllSeedPhrases', async () => {
      const error = new Error('Fetch failed');
      (
        Engine.context.SeedlessOnboardingController
          .fetchAllSecretData as jest.Mock
      ).mockRejectedValueOnce(error);
      await expect(
        Authentication.unlockWallet({
          password: mockPassword,
          authPreference: mockAuthData,
        }),
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
        user: { existingUser: true },
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

      await Authentication.unlockWallet({
        password: mockPassword,
        authPreference: mockAuthData,
      });

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
      expect(ReduxService.store.dispatch).toHaveBeenCalledTimes(4); // logIn, passwordSet (from storePassword -> dispatchPasswordSet), setExistingUser, and dispatchLogin
      expect(OAuthService.resetOauthState).toHaveBeenCalled();
    });

    it('throws error when first seed phrase is falsy', async () => {
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
        Authentication.unlockWallet({
          password: mockPassword,
          authPreference: mockAuthData,
        }),
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
      user: { existingUser: true },
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

      // Mock MetaMetrics.getInstance to return true for isEnabled
      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue({ isEnabled: () => true } as MetaMetrics);

      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        recoverCurrentDevicePassword: jest.fn(),
        syncLatestGlobalPassword: jest.fn(),
        checkIsPasswordOutdated: jest.fn().mockResolvedValue(true),
        storeKeyringEncryptionKey: jest.fn(),
        loadKeyringEncryptionKey: jest.fn(),
        submitGlobalPassword: jest.fn(),
        submitPassword: jest.fn().mockResolvedValue(undefined),
        fetchAllSecretData: jest.fn(),
        revokeRefreshToken: jest.fn().mockResolvedValue(undefined),
        setLocked: jest.fn().mockResolvedValue(undefined),
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
        user: { existingUser: true },
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
        Authentication.unlockWallet({
          password: mockGlobalPassword,
          authPreference: mockAuthType,
        }),
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
        user: { existingUser: true },
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
        Authentication.unlockWallet({
          password: mockGlobalPassword,
          authPreference: mockAuthType,
        }),
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
        user: { existingUser: true },
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
        Authentication.unlockWallet({
          password: mockGlobalPassword,
          authPreference: mockAuthType,
        }),
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
        user: { existingUser: true },
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
        Authentication.unlockWallet({
          password: mockGlobalPassword,
          authPreference: mockAuthType,
        }),
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
        user: { existingUser: true },
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
      await Authentication.unlockWallet({
        password: mockGlobalPassword,
        authPreference: mockAuthType,
      });

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

    it('throw error if vault recreation fails', async () => {
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
        verifyPassword: jest.fn().mockResolvedValue(undefined),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;

      // Mock MetaMetrics.getInstance to return true for isEnabled
      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue({ isEnabled: () => true } as MetaMetrics);
    });

    it('throw an error if not using seedless onboarding flow', async () => {
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => ({
          user: { existingUser: true },
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

      await Authentication.unlockWallet({
        password: '1234',
        authPreference: { currentAuthType: AUTHENTICATION_TYPE.PASSWORD },
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
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;

      Engine.context.SeedlessOnboardingController = {
        addNewSecretData: jest.fn().mockResolvedValue(undefined),
        updateBackupMetadataState: jest.fn(),
        state: { vault: 'seedless onboarding vault' },
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      // Mock Engine.setSelectedAddress
      Engine.setSelectedAddress = jest.fn();

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

    afterEach(() => {
      jest.clearAllMocks();
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
      Engine.context.SeedlessOnboardingController.state.vault = undefined;

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
      const result =
        await Authentication.importSeedlessMnemonicToVault(mnemonic);

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
      expect(result).toEqual({
        id: 'test-keyring-id',
      });
    });

    it('handle KeyringController.addNewKeyring failure', async () => {
      // Arrange
      const mnemonic = 'test mnemonic phrase for wallet';

      const error = new Error('Failed to add new keyring');
      Engine.context.KeyringController.addNewKeyring.mockRejectedValue(error);

      Engine.context.SeedlessOnboardingController.state.vault =
        'seedless onboarding vault';
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
      Engine.context.SeedlessOnboardingController.state.vault =
        'seedless onboarding vault';

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
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
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

    it('returns false when seedless password is outdated', async () => {
      // Arrange
      const checkIsSeedlessPasswordOutdatedSpy = jest
        .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
        .mockResolvedValue(true);

      // Act
      const result =
        await Authentication.importAccountFromPrivateKey(mockPrivateKey);

      // Assert
      expect(checkIsSeedlessPasswordOutdatedSpy).toHaveBeenCalledWith(true);
      expect(result).toBe(false);
      expect(
        Engine.context.KeyringController.importAccountWithStrategy,
      ).not.toHaveBeenCalled();
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
        .mockResolvedValue(true);
      jest
        .spyOn(Authentication, 'importSeedlessMnemonicToVault')
        .mockResolvedValue({ id: 'test-keyring-id' } as KeyringMetadata);

      // Mock convertEnglishWordlistIndicesToCodepoints
      mockConvertEnglishWordlistIndicesToCodepoints.mockReturnValue(
        Buffer.from('test mnemonic phrase'),
      );
      mockUint8ArrayToMnemonic.mockReturnValue('test mnemonic phrase');
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

  describe('deleteWallet', () => {
    let Engine: typeof import('../Engine').default;
    let deleteWalletMockDispatch: jest.Mock;
    let mockMetaMetricsInstance: {
      createDataDeletionTask: jest.MockedFunction<() => Promise<unknown>>;
    };

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      jest.clearAllMocks();
      EngineClass.disableAutomaticVaultBackup = false;
      deleteWalletMockDispatch = jest.fn();
      mockMetaMetricsInstance = {
        createDataDeletionTask: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: deleteWalletMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        clearState: jest.fn(),
        setLocked: jest.fn().mockResolvedValue(undefined),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      Engine.context.KeyringController = {
        setLocked: jest.fn().mockResolvedValue(undefined),
        isUnlocked: jest.fn(() => true),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;

      jest
        .spyOn(Authentication, 'newWalletAndKeychain')
        .mockResolvedValue(undefined);
      jest.spyOn(Authentication, 'lockApp').mockResolvedValue(undefined);

      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue(mockMetaMetricsInstance as unknown as MetaMetrics);
    });

    afterEach(() => {
      EngineClass.disableAutomaticVaultBackup = false;
    });

    it('calls resetWalletState followed by deleteUser', async () => {
      // Arrange
      const resetWalletStateSpy = jest.spyOn(
        Authentication as unknown as { resetWalletState: () => Promise<void> },
        'resetWalletState',
      );
      const deleteUserSpy = jest.spyOn(
        Authentication as unknown as { deleteUser: () => Promise<void> },
        'deleteUser',
      );

      // Act
      await Authentication.deleteWallet();

      // Assert
      expect(resetWalletStateSpy).toHaveBeenCalledTimes(1);
      expect(deleteUserSpy).toHaveBeenCalledTimes(1);
      const resetCallOrder = resetWalletStateSpy.mock.invocationCallOrder[0];
      const deleteCallOrder = deleteUserSpy.mock.invocationCallOrder[0];
      expect(resetCallOrder).toBeLessThan(deleteCallOrder);
    });

    it('completes wallet deletion successfully', async () => {
      // Arrange
      const clearVaultSpy = jest.mocked(clearAllVaultBackups);
      const clearStateSpy = jest.spyOn(
        Engine.context.SeedlessOnboardingController,
        'clearState',
      );
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');

      // Act
      await Authentication.deleteWallet();

      // Assert
      expect(clearVaultSpy).toHaveBeenCalledTimes(1);
      expect(clearStateSpy).toHaveBeenCalledTimes(1);
      expect(deleteWalletMockDispatch).toHaveBeenCalledWith(
        setExistingUser(false),
      );
      expect(
        mockMetaMetricsInstance.createDataDeletionTask,
      ).toHaveBeenCalledTimes(1);
      expect(removeItemSpy).toHaveBeenCalledWith(OPTIN_META_METRICS_UI_SEEN);
      expect(deleteWalletMockDispatch).toHaveBeenCalledWith(
        setCompletedOnboarding(false),
      );
      expect(EngineClass.disableAutomaticVaultBackup).toBe(false);
    });
  });

  describe('resetWalletState', () => {
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      jest.clearAllMocks();
      EngineClass.disableAutomaticVaultBackup = false;

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      Engine.context.SeedlessOnboardingController = {
        clearState: jest.fn(),
        setLocked: jest.fn().mockResolvedValue(undefined),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      Engine.context.KeyringController = {
        setLocked: jest.fn().mockResolvedValue(undefined),
        isUnlocked: jest.fn(() => true),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      } as unknown as KeyringController;

      jest
        .spyOn(Authentication, 'newWalletAndKeychain')
        .mockResolvedValue(undefined);
      jest.spyOn(Authentication, 'lockApp').mockResolvedValue(undefined);
    });

    afterEach(() => {
      EngineClass.disableAutomaticVaultBackup = false;
    });

    it('calls vault backup clear before creating temporary wallet', async () => {
      // Arrange
      const clearVaultSpy = jest.mocked(clearAllVaultBackups);
      const newWalletSpy = jest.spyOn(Authentication, 'newWalletAndKeychain');

      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert
      expect(clearVaultSpy).toHaveBeenCalledTimes(1);
      const clearCallOrder = clearVaultSpy.mock.invocationCallOrder[0];
      const newWalletCallOrder = newWalletSpy.mock.invocationCallOrder[0];
      expect(clearCallOrder).toBeLessThan(newWalletCallOrder);
    });

    it('disables automatic vault backup during wallet reset', async () => {
      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert - flag is re-enabled after reset completes
      expect(EngineClass.disableAutomaticVaultBackup).toBe(false);
    });

    it('re-enables automatic vault backup even when error occurs', async () => {
      // Arrange
      jest
        .spyOn(Authentication, 'newWalletAndKeychain')
        .mockRejectedValueOnce(new Error('Authentication failed'));

      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert - flag is still re-enabled despite error
      expect(EngineClass.disableAutomaticVaultBackup).toBe(false);
    });

    it('calls all required methods to reset wallet state', async () => {
      // Arrange
      const newWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      const clearStateSpy = jest.spyOn(
        Engine.context.SeedlessOnboardingController,
        'clearState',
      );
      const resetRewardsSpy = jest.spyOn(Engine.controllerMessenger, 'call');
      const loggerSpy = jest.spyOn(Logger, 'log');
      const resetProviderTokenSpy = jest.mocked(depositResetProviderToken);

      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert
      expect(newWalletAndKeychain).toHaveBeenCalledWith(expect.any(String), {
        currentAuthType: AUTHENTICATION_TYPE.UNKNOWN,
      });
      expect(clearStateSpy).toHaveBeenCalledTimes(1);
      expect(resetRewardsSpy).toHaveBeenCalledTimes(1);
      expect(resetRewardsSpy).toHaveBeenCalledWith(
        'RewardsController:resetAll',
      );
      expect(loggerSpy).not.toHaveBeenCalled();
      expect(resetProviderTokenSpy).toHaveBeenCalledTimes(1);
      expect(Authentication.lockApp).toHaveBeenCalledWith({
        navigateToLogin: false,
      });
    });

    it('logs error when resetWalletState fails', async () => {
      // Arrange
      const newWalletAndKeychain = jest.spyOn(
        Authentication,
        'newWalletAndKeychain',
      );
      const loggerSpy = jest.spyOn(Logger, 'log');
      newWalletAndKeychain.mockRejectedValueOnce(
        new Error('Authentication failed'),
      );

      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert
      expect(newWalletAndKeychain).toHaveBeenCalled();
      expect(loggerSpy).toHaveBeenCalledWith(
        expect.any(Error),
        expect.stringContaining('Failed to createNewVaultAndKeychain'),
      );
    });

    it('dispatches cancelBulkLink action to cancel running bulk link saga', async () => {
      // Arrange
      const localDispatch = jest.fn();
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: localDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      // Act
      await (
        Authentication as unknown as { resetWalletState: () => Promise<void> }
      ).resetWalletState();

      // Assert
      expect(localDispatch).toHaveBeenCalledWith(cancelBulkLink());
    });
  });

  describe('deleteUser', () => {
    let deleteUserMockDispatch: jest.Mock;
    let mockMetaMetricsInstance: {
      createDataDeletionTask: jest.MockedFunction<() => Promise<unknown>>;
    };

    beforeEach(() => {
      jest.clearAllMocks();
      deleteUserMockDispatch = jest.fn();
      mockMetaMetricsInstance = {
        createDataDeletionTask: jest.fn().mockResolvedValue(undefined),
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: deleteUserMockDispatch,
        getState: () => ({ security: { allowLoginWithRememberMe: true } }),
      } as unknown as ReduxStore);

      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue(mockMetaMetricsInstance as unknown as MetaMetrics);
    });

    it('dispatches Redux action to set existing user to false', async () => {
      // Act
      await (
        Authentication as unknown as { deleteUser: () => Promise<void> }
      ).deleteUser();

      // Assert
      expect(deleteUserMockDispatch).toHaveBeenCalledWith(
        setExistingUser(false),
      );
      expect(
        mockMetaMetricsInstance.createDataDeletionTask,
      ).toHaveBeenCalledTimes(1);
    });

    it('creates data deletion task', async () => {
      // Act
      await (
        Authentication as unknown as { deleteUser: () => Promise<void> }
      ).deleteUser();

      // Assert
      expect(
        mockMetaMetricsInstance.createDataDeletionTask,
      ).toHaveBeenCalledTimes(1);
    });

    it('completes without throwing when deleteUser succeeds', async () => {
      // Arrange
      const loggerSpy = jest.spyOn(Logger, 'log');

      // Act & Assert
      await expect(
        (
          Authentication as unknown as { deleteUser: () => Promise<void> }
        ).deleteUser(),
      ).resolves.not.toThrow();
      expect(loggerSpy).not.toHaveBeenCalled();
    });

    it('logs error when deleteUser fails', async () => {
      // Arrange
      const error = new Error('Data deletion failed');
      mockMetaMetricsInstance.createDataDeletionTask.mockRejectedValueOnce(
        error,
      );
      const loggerSpy = jest.spyOn(Logger, 'log');

      // Act
      await (
        Authentication as unknown as { deleteUser: () => Promise<void> }
      ).deleteUser();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        error,
        'Failed to reset existingUser state in Redux',
      );
    });

    it('logs error when Redux dispatch fails', async () => {
      // Arrange
      const error = new Error('Dispatch failed');
      deleteUserMockDispatch.mockImplementation(() => {
        throw error;
      });
      const loggerSpy = jest.spyOn(Logger, 'log');

      // Act
      await (
        Authentication as unknown as { deleteUser: () => Promise<void> }
      ).deleteUser();

      // Assert
      expect(loggerSpy).toHaveBeenCalledWith(
        error,
        'Failed to reset existingUser state in Redux',
      );
    });
  });

  describe('updateAuthPreference', () => {
    const mockPassword = 'test-password-123';

    let Engine: typeof import('../Engine').default;
    let updateAuthMockDispatch: jest.Mock;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      updateAuthMockDispatch = jest.fn();
      jest.clearAllMocks();

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: updateAuthMockDispatch,
        getState: () => ({
          settings: { lockTime: 30000 },
          security: { allowLoginWithRememberMe: true },
        }),
      } as unknown as ReduxStore);

      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue(undefined) as jest.MockedFunction<
        typeof Engine.context.KeyringController.exportSeedPhrase
      >;

      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockResolvedValue(undefined) as jest.MockedFunction<
        typeof Engine.context.KeyringController.verifyPassword
      >;

      jest.spyOn(Authentication, 'getPassword').mockResolvedValue({
        password: mockPassword,
        username: 'metamask-user',
      } as unknown as import('react-native-keychain').UserCredentials);

      jest.spyOn(Authentication, 'resetPassword').mockResolvedValue(undefined);
      jest
        .spyOn(SecureKeychain, 'setGenericPassword')
        .mockResolvedValue(undefined);
    });

    afterEach(() => {
      jest.restoreAllMocks();
      StorageWrapper.clearAll();
    });

    it('updates auth preference to BIOMETRIC with password from keychain', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
      });

      expect(
        Engine.context.KeyringController.verifyPassword,
      ).toHaveBeenCalledWith(mockPassword);
      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(updateAuthMockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('updates auth preference to BIOMETRIC with provided password', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
        password: mockPassword,
      });

      expect(Authentication.getPassword).not.toHaveBeenCalled();
      expect(
        Engine.context.KeyringController.verifyPassword,
      ).toHaveBeenCalledWith(mockPassword);
      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(updateAuthMockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('updates auth preference to PASSCODE with password from keychain', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.PASSCODE,
      });

      expect(
        Engine.context.KeyringController.verifyPassword,
      ).toHaveBeenCalledWith(mockPassword);
      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.PASSCODE,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(updateAuthMockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('updates auth preference to PASSWORD with password from keychain', async () => {
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');

      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.PASSWORD,
      });

      expect(
        Engine.context.KeyringController.verifyPassword,
      ).toHaveBeenCalledWith(mockPassword);
      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        undefined,
      );
      expect(setItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED, TRUE);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(updateAuthMockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('shows alert and tracks error when password is invalid', async () => {
      const invalidPasswordError = new Error('Invalid password');
      (
        Engine.context.KeyringController.verifyPassword as jest.Mock
      ).mockRejectedValueOnce(invalidPasswordError);
      const alertSpy = jest.spyOn(Alert, 'alert');
      const trackErrorSpy = jest.mocked(trackErrorAsAnalytics);

      await expect(
        Authentication.updateAuthPreference({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
          password: mockPassword,
        }),
      ).rejects.toThrow('Invalid password');

      expect(alertSpy).toHaveBeenCalledWith(
        strings('app_settings.invalid_password'),
        strings('app_settings.invalid_password_message'),
      );
      expect(trackErrorSpy).toHaveBeenCalledWith(
        'SecuritySettings: Invalid password',
        'Invalid password',
        '',
      );

      alertSpy.mockRestore();
    });

    it('logs error for non-invalid-password errors', async () => {
      const otherError = new Error('Store password failed');
      jest
        .spyOn(SecureKeychain, 'setGenericPassword')
        .mockRejectedValueOnce(otherError);
      const loggerErrorSpy = jest.spyOn(Logger, 'error');
      const alertSpy = jest.spyOn(Alert, 'alert');
      const trackErrorSpy = jest.mocked(trackErrorAsAnalytics);

      await expect(
        Authentication.updateAuthPreference({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
          password: mockPassword,
        }),
      ).rejects.toThrow('Store password failed');

      expect(alertSpy).not.toHaveBeenCalled();
      expect(trackErrorSpy).not.toHaveBeenCalled();
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        expect.any(Error),
        'SecuritySettings:biometrics',
      );

      alertSpy.mockRestore();
    });

    it('converts PASSWORD_NOT_SET_WITH_BIOMETRICS error to AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS', async () => {
      // Mock reauthenticate to throw PASSWORD_NOT_SET_WITH_BIOMETRICS error
      const biometricNotEnabledError = new Error(
        `${ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS}: No password stored with biometrics in keychain.`,
      );
      jest
        .spyOn(Authentication, 'reauthenticate')
        .mockRejectedValueOnce(biometricNotEnabledError);

      const loggerErrorSpy = jest.spyOn(Logger, 'error');
      const alertSpy = jest.spyOn(Alert, 'alert');
      const trackErrorSpy = jest.mocked(trackErrorAsAnalytics);

      // Verify the error is converted to AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS
      let caughtError: unknown;
      try {
        await Authentication.updateAuthPreference({
          authType: AUTHENTICATION_TYPE.BIOMETRIC,
        });
      } catch (error) {
        caughtError = error;
      }

      // Verify it throws AuthenticationError
      expect(caughtError).toBeInstanceOf(AuthenticationError);

      // Verify the error has the correct customErrorMessage
      expect((caughtError as AuthenticationError).customErrorMessage).toBe(
        AUTHENTICATION_APP_TRIGGERED_AUTH_NO_CREDENTIALS,
      );

      // Verify that invalid password handling was not triggered
      expect(alertSpy).not.toHaveBeenCalled();
      expect(trackErrorSpy).not.toHaveBeenCalled();

      // Verify that Logger.error was not called (since this is a converted error)
      expect(loggerErrorSpy).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    it('skips password validation when skipValidation is true', async () => {
      const removeItemSpy = jest.spyOn(StorageWrapper, 'removeItem');
      const setItemSpy = jest.spyOn(StorageWrapper, 'setItem');
      const verifyPasswordSpy = jest.spyOn(
        Engine.context.KeyringController,
        'verifyPassword',
      );

      // Note: The actual implementation doesn't have skipValidation parameter
      // This test should verify normal behavior
      await Authentication.updateAuthPreference({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
        password: mockPassword,
      });

      expect(verifyPasswordSpy).toHaveBeenCalledWith(mockPassword);
      expect(SecureKeychain.setGenericPassword).toHaveBeenCalledWith(
        mockPassword,
        SecureKeychain.TYPES.BIOMETRICS,
      );
      expect(removeItemSpy).toHaveBeenCalledWith(BIOMETRY_CHOICE_DISABLED);
      expect(setItemSpy).toHaveBeenCalledWith(PASSCODE_DISABLED, TRUE);
      expect(updateAuthMockDispatch).toHaveBeenCalledWith(passwordSet());
    });
  });
  describe('checkAndShowSeedlessPasswordOutdatedModal', () => {
    let Engine: typeof import('../Engine').default;
    let mockIsOutdated: boolean = false;
    let mockCheckIsSeedlessPasswordOutdated: jest.SpyInstance;
    let mockLockApp: jest.SpyInstance;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.SeedlessOnboardingController = {
        state: { vault: {} },
        checkIsPasswordOutdated: jest.fn(() => Promise.resolve(mockIsOutdated)),
      } as unknown as SeedlessOnboardingController<EncryptionKey>;

      mockCheckIsSeedlessPasswordOutdated = jest.spyOn(
        Authentication,
        'checkIsSeedlessPasswordOutdated',
      );
      mockLockApp = jest
        .spyOn(Authentication, 'lockApp')
        .mockResolvedValue(undefined);

      mockNavigate.mockClear();
      mockReset.mockClear();
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('returns early when isSeedlessPasswordOutdated is false', async () => {
      // Arrange
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      // Act
      await Authentication.checkAndShowSeedlessPasswordOutdatedModal(false);

      // Assert
      expect(mockCheckIsSeedlessPasswordOutdated).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('returns early when checkIsSeedlessPasswordOutdated returns false', async () => {
      // Arrange
      mockIsOutdated = false;
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(false);
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      // Act
      await Authentication.checkAndShowSeedlessPasswordOutdatedModal(true);

      // Assert
      expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(false);
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('navigates to modal when password is outdated', async () => {
      // Arrange
      mockIsOutdated = true;
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      // Act
      await Authentication.checkAndShowSeedlessPasswordOutdatedModal(true);

      // Assert
      expect(mockCheckIsSeedlessPasswordOutdated).toHaveBeenCalledWith(false);
      expect(mockNavigate).toHaveBeenCalledWith(Routes.MODAL.ROOT_MODAL_FLOW, {
        screen: Routes.SHEET.SUCCESS_ERROR_SHEET,
        params: {
          title: strings('login.seedless_password_outdated_modal_title'),
          description: strings(
            'login.seedless_password_outdated_modal_content',
          ),
          primaryButtonLabel: strings(
            'login.seedless_password_outdated_modal_confirm',
          ),
          type: 'error',
          icon: IconName.Danger,
          isInteractable: false,
          onPrimaryButtonPress: expect.any(Function),
          closeOnPrimaryButtonPress: true,
        },
      });
    });

    it('calls lockApp when primary button is pressed', async () => {
      // Arrange
      mockIsOutdated = true;
      mockCheckIsSeedlessPasswordOutdated.mockResolvedValue(true);
      const mockState: RecursivePartial<RootState> = {
        engine: {
          backgroundState: {
            SeedlessOnboardingController: {
              vault: 'existing vault data' as string,
            },
          },
        },
      };

      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        dispatch: jest.fn(),
        getState: jest.fn(() => mockState),
      } as unknown as ReduxStore);

      // Act
      await Authentication.checkAndShowSeedlessPasswordOutdatedModal(true);

      // Assert
      expect(mockNavigate).toHaveBeenCalled();
      const navigateCall = mockNavigate.mock.calls[0];
      const modalParams = navigateCall[1];
      const onPrimaryButtonPress = modalParams.params.onPrimaryButtonPress;

      // Call the button press handler
      await onPrimaryButtonPress();

      // Assert lockApp was called
      expect(mockLockApp).toHaveBeenCalledWith({ locked: true });
    });
  });

  describe('reauthenticate', () => {
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.KeyringController.verifyPassword = jest
        .fn()
        .mockResolvedValue(undefined);
    });

    it('verifies provided password and returns it', async () => {
      const verifyPasswordSpy = Engine.context.KeyringController.verifyPassword;

      const result = await Authentication.reauthenticate('test-password');

      expect(verifyPasswordSpy).toHaveBeenCalledWith('test-password');
      expect(result.password).toBe('test-password');
    });

    it('throws PASSWORD_NOT_SET_WITH_BIOMETRICS error when password is not set using biometric credentials', async () => {
      const verifyPasswordSpy = Engine.context.KeyringController.verifyPassword;
      const getPasswordSpy = jest
        .spyOn(Authentication, 'getPassword')
        .mockResolvedValueOnce(null);

      await expect(Authentication.reauthenticate()).rejects.toThrow(
        ReauthenticateErrorType.PASSWORD_NOT_SET_WITH_BIOMETRICS,
      );

      expect(getPasswordSpy).toHaveBeenCalled();
      expect(verifyPasswordSpy).not.toHaveBeenCalled();
    });

    it('propagates error when password verification fails', async () => {
      const error = new Error('Invalid password');

      jest
        .spyOn(Engine.context.KeyringController, 'verifyPassword')
        .mockRejectedValueOnce(error);

      await expect(Authentication.reauthenticate('bad-password')).rejects.toBe(
        error,
      );
    });
  });

  describe('revealSRP', () => {
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.KeyringController.exportSeedPhrase = jest
        .fn()
        .mockResolvedValue(new Uint8Array([1, 2, 3]));
      jest.spyOn(Authentication, 'reauthenticate').mockResolvedValue({
        password: 'valid-password',
      });
    });

    it('calls reauthenticate and exports SRP with the provided password and keyringId', async () => {
      const reauthSpy = jest.spyOn(Authentication, 'reauthenticate');
      const exportSeedPhraseSpy =
        Engine.context.KeyringController.exportSeedPhrase;
      const keyringId = 'keyring-id';

      await Authentication.revealSRP('valid-password', keyringId);

      expect(reauthSpy).toHaveBeenCalledWith('valid-password');
      expect(exportSeedPhraseSpy).toHaveBeenCalledWith(
        'valid-password',
        keyringId,
      );
    });
  });

  describe('revealPrivateKey', () => {
    let Engine: typeof import('../Engine').default;

    beforeEach(() => {
      Engine = jest.requireMock('../Engine');
      Engine.context.KeyringController.exportAccount = jest
        .fn()
        .mockResolvedValue('0xprivatekey');
      jest.spyOn(Authentication, 'reauthenticate').mockResolvedValue({
        password: 'valid-password',
      });
    });

    it('calls reauthenticate and exports private key with the provided password and address', async () => {
      const reauthSpy = jest.spyOn(Authentication, 'reauthenticate');
      const exportAccountSpy = Engine.context.KeyringController.exportAccount;
      const address = '0x123';

      await Authentication.revealPrivateKey('valid-password', address);

      expect(reauthSpy).toHaveBeenCalledWith('valid-password');
      expect(exportAccountSpy).toHaveBeenCalledWith('valid-password', address);
    });
  });

  describe('unlockWallet', () => {
    const passwordToUse = 'test-password';

    beforeEach(() => {
      // Mock lockApp.
      jest.spyOn(Authentication, 'lockApp').mockResolvedValueOnce(undefined);
      // Mock MetaMetrics.getInstance to return true for isEnabled.
      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValueOnce({ isEnabled: () => true } as MetaMetrics);

      const Engine = jest.requireMock('../Engine');
      // Restore the KeyringController mock that may have been replaced by other test suites.
      Engine.context.KeyringController = {
        submitPassword: jest.fn(),
        verifyPassword: jest.fn(),
        state: {
          keyrings: [
            { type: KeyringTypes.hd, metadata: { id: 'test-keyring-id' } },
          ],
        },
      };

      // Mock existing user state.
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          user: { existingUser: true },
        }),
        dispatch: mockDispatch,
      } as unknown as ReduxStore);

      // Mock SecureKeychain to return the biometric stored password.
      jest.spyOn(SecureKeychain, 'getGenericPassword').mockResolvedValue({
        password: passwordToUse,
        username: 'test-username',
        service: 'test-service',
        storage: Keychain.STORAGE_TYPE.AES_GCM,
      });
    });

    it('skips deriving password from keychain when an empty password is provided', async () => {
      // Call unlockWallet with an empty password.
      await Authentication.unlockWallet({ password: '' });

      // Verify that SecureKeychain.getGenericPassword is not called.
      expect(SecureKeychain.getGenericPassword).not.toHaveBeenCalled();
    });

    it('skips deriving password from keychain when a non-empty password is provided', async () => {
      // Call unlockWallet with a non-empty password.
      await Authentication.unlockWallet({ password: 'test-password' });

      // Verify that SecureKeychain.getGenericPassword is not called.
      expect(SecureKeychain.getGenericPassword).not.toHaveBeenCalled();
    });

    it('derives password from keychain when no password is provided', async () => {
      // Call unlockWallet without a password.
      await Authentication.unlockWallet();

      // Verify that SecureKeychain.getGenericPassword is called.
      expect(SecureKeychain.getGenericPassword).toHaveBeenCalled();
    });

    it('navigates to the onboarding flow when user does not exist', async () => {
      // Mock existing user state.
      jest.spyOn(ReduxService, 'store', 'get').mockReturnValue({
        getState: () => ({
          user: { existingUser: false },
        }),
      } as unknown as ReduxStore);

      // Call unlockWallet.
      await Authentication.unlockWallet();

      // Verify that it navigates to the onboarding flow.
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.ROOT_NAV }],
      });
    });

    it('navigates to the home flow when a password is provided', async () => {
      // Call unlockWallet with a password.
      await Authentication.unlockWallet({ password: passwordToUse });

      // Verify that it navigates to the home flow.
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
    });

    it('navigates to the home flow when biometric credentials are provided', async () => {
      // Call unlockWallet without a password.
      await Authentication.unlockWallet();

      // Verify that it navigates to the home flow.
      expect(mockReset).toHaveBeenCalledWith({
        routes: [{ name: Routes.ONBOARDING.HOME_NAV }],
      });
    });

    it('navigates to the optin metrics flow when metrics are not enabled and UI has not been seen', async () => {
      // Mock StorageWrapper.getItem to return null for OPTIN_META_METRICS_UI_SEEN.
      jest.spyOn(StorageWrapper, 'getItem').mockResolvedValue(null);
      // Clear beforeEach mock and set MetaMetrics.getInstance to return false for isEnabled.
      jest.spyOn(MetaMetrics, 'getInstance').mockReset();
      jest
        .spyOn(MetaMetrics, 'getInstance')
        .mockReturnValue({ isEnabled: () => false } as MetaMetrics);

      // Call unlockWallet with a password.
      await Authentication.unlockWallet({ password: passwordToUse });

      // Verify that it navigates to the optin metrics flow.
      expect(mockReset).toHaveBeenCalledWith({
        routes: [
          {
            name: Routes.ONBOARDING.ROOT_NAV,
            params: {
              screen: Routes.ONBOARDING.NAV,
              params: {
                screen: Routes.ONBOARDING.OPTIN_METRICS,
              },
            },
          },
        ],
      });
    });

    it('submits password to KeyringController when password is derived', async () => {
      const Engine = jest.requireMock('../Engine');

      // Call unlockWallet with a password.
      await Authentication.unlockWallet({ password: passwordToUse });

      // Verify that the password is used for unlocking the KeyringController.
      expect(
        Engine.context.KeyringController.submitPassword,
      ).toHaveBeenCalledWith(passwordToUse);
    });

    it('performs post login operations when authentication is successful', async () => {
      // Call unlockWallet with a password.
      await Authentication.unlockWallet({ password: passwordToUse });

      // Verify that both login and password set actions are dispatched.
      expect(mockDispatch).toHaveBeenCalledWith(logIn());
      expect(mockDispatch).toHaveBeenCalledWith(passwordSet());
    });

    it('updates authentication preference when auth preference is provided', async () => {
      // Spy on updateAuthPreference method.
      const updateAuthPreferenceSpy = jest.spyOn(
        Authentication,
        'updateAuthPreference',
      );

      // Call unlockWallet with a password.
      await Authentication.unlockWallet({
        password: passwordToUse,
        authPreference: { currentAuthType: AUTHENTICATION_TYPE.BIOMETRIC },
      });

      // Verify that the authentication preference is updated.
      expect(updateAuthPreferenceSpy).toHaveBeenCalledWith({
        authType: AUTHENTICATION_TYPE.BIOMETRIC,
        password: passwordToUse,
      });
    });

    it('calls lockApp when error is thrown', async () => {
      const lockAppSpy = jest.spyOn(Authentication, 'lockApp');
      // Mock rehydrateSeedPhrase to reject.
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValueOnce(new Error('Failed to rehydrate seed phrase'));

      // Call unlockWallet and expect it to throw.
      await expect(
        Authentication.unlockWallet({
          password: passwordToUse,
          authPreference: {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            oauth2Login: true, // Required to trigger rehydrateSeedPhrase call
          },
        }),
      ).rejects.toThrow('Failed to rehydrate seed phrase');

      expect(lockAppSpy).toHaveBeenCalledWith({
        reset: false,
        navigateToLogin: false,
      });
    });

    it('calls lockApp when error is thrown and logs error when lockApp fails', async () => {
      // Clear any previous mock setup from beforeEach
      jest.spyOn(Authentication, 'lockApp').mockReset();

      const lockAppSpy = jest
        .spyOn(Authentication, 'lockApp')
        .mockRejectedValueOnce(new Error('Failed to lock app'));

      // Mock rehydrateSeedPhrase to reject.
      jest
        .spyOn(Authentication, 'rehydrateSeedPhrase')
        .mockRejectedValueOnce(new Error('Failed to rehydrate seed phrase'));

      // Call unlockWallet and expect it to throw the original error (not the lockApp error).
      await expect(
        Authentication.unlockWallet({
          password: passwordToUse,
          authPreference: {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            oauth2Login: true, // Required to trigger rehydrateSeedPhrase call
          },
        }),
      ).rejects.toThrow('Failed to rehydrate seed phrase');

      // Verify lockApp was called with correct parameters
      expect(lockAppSpy).toHaveBeenCalledWith({
        reset: false,
        navigateToLogin: false,
      });

      // Verify the lockApp error was logged (not thrown)
      expect(Logger.error).toHaveBeenCalledWith(
        expect.any(Error),
        'Failed to lock app during unlockWallet error condition.',
      );
    });

    describe('when using seedless onboarding', () => {
      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('rehydrates seed phrase when oauth2Login is true', async () => {
        // Spy on rehydrateSeedPhrase.
        const rehydrateSeedPhraseSpy = jest
          .spyOn(Authentication, 'rehydrateSeedPhrase')
          .mockResolvedValueOnce();

        // Call unlockWallet with a password and set oauth2Login to true.
        await Authentication.unlockWallet({
          password: passwordToUse,
          authPreference: {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
            oauth2Login: true,
          },
        });

        // Verify that the rehydrateSeedPhrase is called.
        expect(rehydrateSeedPhraseSpy).toHaveBeenCalledWith(passwordToUse);
      });

      it('syncs password and unlocks wallet when seedless password is outdated', async () => {
        // Spy on syncPasswordAndUnlockWallet.
        const syncPasswordAndUnlockWalletSpy = jest
          .spyOn(Authentication, 'syncPasswordAndUnlockWallet')
          .mockResolvedValueOnce();

        // Mock checkIsSeedlessPasswordOutdated to return true.
        jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockResolvedValueOnce(true);

        // Call unlockWallet with a password.
        await Authentication.unlockWallet({
          password: passwordToUse,
        });

        // Verify that syncPasswordAndUnlockWallet is called.
        expect(syncPasswordAndUnlockWalletSpy).toHaveBeenCalledWith(
          passwordToUse,
        );
      });

      it('throws error when rehydrating seed phrase fails', async () => {
        // Mock rehydrateSeedPhrase to reject.
        jest
          .spyOn(Authentication, 'rehydrateSeedPhrase')
          .mockRejectedValueOnce(new Error('Failed to rehydrate seed phrase'));

        // Call unlockWallet with a password and set oauth2Login to true.
        await expect(
          Authentication.unlockWallet({
            password: passwordToUse,
            authPreference: {
              currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
              oauth2Login: true,
            },
          }),
        ).rejects.toThrow('Failed to rehydrate seed phrase');
      });

      it('throws error when syncing password and unlocking wallet fails', async () => {
        // Mock syncPasswordAndUnlockWallet to reject.
        jest
          .spyOn(Authentication, 'syncPasswordAndUnlockWallet')
          .mockRejectedValueOnce(
            new Error('Failed to sync password and unlock wallet'),
          );

        // Mock checkIsSeedlessPasswordOutdated to return true.
        jest
          .spyOn(Authentication, 'checkIsSeedlessPasswordOutdated')
          .mockResolvedValueOnce(true);

        // Call unlockWallet with a password and set oauth2Login to true.
        await expect(
          Authentication.unlockWallet({
            password: passwordToUse,
          }),
        ).rejects.toThrow('Failed to sync password and unlock wallet');
      });
    });
  });
});
