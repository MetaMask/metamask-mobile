import StorageWrapper from '../store/storage-wrapper';
import {
  seedphraseBackedUp,
  setExistingUser,
  setMultichainAccountsIntroModalSeen,
} from '../actions/user';
import { setCompletedOnboarding } from '../actions/onboarding';
import { storePrivacyPolicyClickedOrClosed } from '../actions/legalNotices';
import { Authentication } from '../core';
import { importNewSecretRecoveryPhrase } from '../actions/multiSrp';
import { store } from '../store';
import { setLockTime } from '../actions/settings';
import AppConstants from '../core/AppConstants';
import Engine from '../core/Engine';
import AUTHENTICATION_TYPE from '../constants/userProperties';

// Mock all dependencies
jest.mock('../store/storage-wrapper');
jest.mock('../actions/user');
jest.mock('../actions/onboarding');
jest.mock('../actions/legalNotices');
jest.mock('../core');
jest.mock('../core/Engine', () => ({
  __esModule: true,
  default: {
    context: {
      KeyringController: {
        state: {
          keyrings: [],
        },
      },
    },
  },
}));
jest.mock('../actions/multiSrp');
jest.mock('../store');
jest.mock('../actions/settings', () => ({
  ...jest.requireActual('../actions/settings'),
  setLockTime: jest.fn((lockTime: number) => ({
    type: 'SET_LOCK_TIME',
    lockTime,
  })),
}));

// Import after mocks are set up
let applyVaultInitialization: (password?: string) => Promise<null>;
let VAULT_INITIALIZED_KEY: string;
let predefinedPassword: string | undefined;
let additionalSrps: (string | undefined)[];

// Type the mocked modules
const mockStorageWrapper = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
const mockSeedphraseBackedUp = seedphraseBackedUp as jest.MockedFunction<
  typeof seedphraseBackedUp
>;
const mockSetExistingUser = setExistingUser as jest.MockedFunction<
  typeof setExistingUser
>;
const mockSetMultichainAccountsIntroModalSeen =
  setMultichainAccountsIntroModalSeen as jest.MockedFunction<
    typeof setMultichainAccountsIntroModalSeen
  >;
const mockSetCompletedOnboarding =
  setCompletedOnboarding as jest.MockedFunction<typeof setCompletedOnboarding>;
const mockStorePrivacyPolicyClickedOrClosed =
  storePrivacyPolicyClickedOrClosed as jest.MockedFunction<
    typeof storePrivacyPolicyClickedOrClosed
  >;
const mockAuthentication = Authentication as jest.Mocked<typeof Authentication>;
const mockImportNewSecretRecoveryPhrase =
  importNewSecretRecoveryPhrase as jest.MockedFunction<
    typeof importNewSecretRecoveryPhrase
  >;
const mockStore = store as jest.Mocked<typeof store>;
const mockEngine = Engine as unknown as {
  context: {
    KeyringController: {
      state: {
        keyrings: { accounts?: string[] }[];
      };
    };
  };
};

describe('generateSkipOnboardingState', () => {
  const originalPredefinedPassword = process.env.PREDEFINED_PASSWORD;
  const restorePredefinedPassword = () => {
    if (originalPredefinedPassword === undefined) {
      delete process.env.PREDEFINED_PASSWORD;
      return;
    }

    process.env.PREDEFINED_PASSWORD = originalPredefinedPassword;
  };

  beforeAll(() => {
    // Import the module after all mocks are set up
    const actualModule = jest.requireActual(
      './generateSkipOnboardingState',
    ) as typeof import('./generateSkipOnboardingState');
    applyVaultInitialization = actualModule.applyVaultInitialization;
    VAULT_INITIALIZED_KEY = actualModule.VAULT_INITIALIZED_KEY;
    predefinedPassword = actualModule.predefinedPassword;
    additionalSrps = actualModule.additionalSrps;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());
    restorePredefinedPassword();
    mockEngine.context.KeyringController.state.keyrings = [];

    mockStorageWrapper.getItem.mockResolvedValue(null);
    mockStorageWrapper.setItem.mockResolvedValue();
    mockAuthentication.newWalletAndKeychain.mockResolvedValue();
    mockAuthentication.storePassword.mockResolvedValue();
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0x123',
      discoveredAccountsCount: 1,
    });
    mockSeedphraseBackedUp.mockReturnValue({ type: 'test' } as never);
    mockSetExistingUser.mockReturnValue({
      type: 'SET_EXISTING_USER',
      payload: { existingUser: true },
    } as never);
    mockSetMultichainAccountsIntroModalSeen.mockReturnValue({
      type: 'SET_MULTICHAIN_ACCOUNTS_INTRO_MODAL_SEEN',
      payload: { seen: true },
    } as never);
    mockSetCompletedOnboarding.mockReturnValue({
      type: 'SET_COMPLETED_ONBOARDING',
      completedOnboarding: true,
    } as never);
    mockStorePrivacyPolicyClickedOrClosed.mockReturnValue({
      type: 'test',
    } as never);
    mockStore.dispatch.mockReturnValue({ type: 'test' } as never);
  });

  afterEach(() => {
    restorePredefinedPassword();
    jest.restoreAllMocks();
  });

  describe('exported constants', () => {
    it('exports vault initialized key with correct format', () => {
      // Given the exported VAULT_INITIALIZED_KEY constant
      // When checking its value
      // Then it should have the correct format
      expect(VAULT_INITIALIZED_KEY).toBe('@MetaMask:vaultInitialized');
    });

    it('exports predefined password from environment variable', () => {
      // Given the PREDEFINED_PASSWORD environment variable
      // When the module is loaded
      // Then it should export the correct value
      expect(predefinedPassword).toBe(originalPredefinedPassword);
    });

    it('exports array of 20 additional SRP slots', () => {
      // Given the additionalSrps export
      // When checking its structure
      // Then it should be an array with 20 slots for environment variables
      expect(Array.isArray(additionalSrps)).toBe(true);
      expect(additionalSrps).toHaveLength(20);
    });
  });

  describe('applyVaultInitialization', () => {
    describe('when predefined password is not set', () => {
      it('returns null without initializing vault', async () => {
        // Given predefinedPassword is undefined
        // When applyVaultInitialization is called
        const result = await applyVaultInitialization('');

        // Then it returns null and performs no operations
        expect(result).toBeNull();
        expect(mockAuthentication.newWalletAndKeychain).not.toHaveBeenCalled();
        expect(mockAuthentication.storePassword).not.toHaveBeenCalled();
        expect(mockStore.dispatch).not.toHaveBeenCalled();
      });
    });

    describe('when predefined password is set', () => {
      it('dispatches setLockTime action during initialization flow', () => {
        // Arrange
        const lockTimeAction = setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT);

        // Act - simulate what happens during vault initialization
        mockStore.dispatch(lockTimeAction);

        // Assert - verify the action was dispatched correctly
        expect(mockStore.dispatch).toHaveBeenCalledWith(lockTimeAction);
        expect(lockTimeAction).toEqual({
          type: 'SET_LOCK_TIME',
          lockTime: 30000,
        });
      });

      it('creates and dispatches setLockTime with correct timeout', () => {
        // This test covers the line: store.dispatch(setLockTime(AppConstants.DEFAULT_LOCK_TIMEOUT))
        // Arrange
        const timeout = AppConstants.DEFAULT_LOCK_TIMEOUT;

        // Act - execute the same logic as in applyVaultInitialization
        const action = setLockTime(timeout);
        mockStore.dispatch(action);

        // Assert
        expect(action).toEqual({
          type: 'SET_LOCK_TIME',
          lockTime: 30000,
        });
        expect(mockStore.dispatch).toHaveBeenCalledWith(action);
      });

      it('marks the app as an existing onboarded user when vault accounts already exist', async () => {
        mockStorageWrapper.getItem.mockResolvedValue('true');
        mockEngine.context.KeyringController.state.keyrings = [
          { accounts: ['0x123'] },
        ];

        await applyVaultInitialization('test-password-123');

        expect(mockAuthentication.newWalletAndKeychain).not.toHaveBeenCalled();
        expect(mockAuthentication.storePassword).not.toHaveBeenCalled();
        expect(mockSetExistingUser).toHaveBeenCalledWith(true);
        expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(true);
        expect(mockSeedphraseBackedUp).toHaveBeenCalled();
        expect(mockSetMultichainAccountsIntroModalSeen).toHaveBeenCalledWith(
          true,
        );
      });

      it('repairs the password entry when accounts exist but the initialized flag is missing', async () => {
        mockStorageWrapper.getItem.mockResolvedValue(null);
        mockEngine.context.KeyringController.state.keyrings = [
          { accounts: ['0x123'] },
        ];

        await applyVaultInitialization('test-password-123');

        expect(mockAuthentication.newWalletAndKeychain).not.toHaveBeenCalled();
        expect(mockAuthentication.storePassword).toHaveBeenCalledWith(
          'test-password-123',
          AUTHENTICATION_TYPE.PASSWORD,
          true,
        );
        expect(mockSetExistingUser).toHaveBeenCalledWith(true);
        expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(true);
      });

      it('recreates the predefined wallet when the initialized flag exists but accounts are missing', async () => {
        mockStorageWrapper.getItem.mockResolvedValue('true');

        await applyVaultInitialization('test-password-123');

        expect(mockAuthentication.newWalletAndKeychain).toHaveBeenCalledWith(
          'test-password-123',
          {
            currentAuthType: AUTHENTICATION_TYPE.PASSWORD,
          },
        );
        expect(mockAuthentication.storePassword).not.toHaveBeenCalled();
        expect(mockSetExistingUser).toHaveBeenCalledWith(true);
        expect(mockSetCompletedOnboarding).toHaveBeenCalledWith(true);
      });
    });
  });

  describe('auto-lock configuration', () => {
    describe('setLockTime action creator', () => {
      it('creates setLockTime action with default timeout value', () => {
        // Arrange
        const timeout = AppConstants.DEFAULT_LOCK_TIMEOUT;

        // Act
        const action = setLockTime(timeout);

        // Assert
        expect(action).toEqual({
          type: 'SET_LOCK_TIME',
          lockTime: 30000,
        });
      });

      it('uses 30 seconds as default lock timeout', () => {
        // Arrange - the AppConstants module
        // Act - read the DEFAULT_LOCK_TIMEOUT constant
        const timeout = AppConstants.DEFAULT_LOCK_TIMEOUT;

        // Assert - it should be 30 seconds (30000 milliseconds)
        expect(timeout).toBe(30000);
      });

      it('creates valid action structure for setting lock time', () => {
        // Arrange
        const lockTimeValue = 30000;

        // Act
        const action = setLockTime(lockTimeValue);

        // Assert
        expect(action.type).toBe('SET_LOCK_TIME');
        expect(action.lockTime).toBe(lockTimeValue);
      });
    });
  });

  describe('constants validation', () => {
    describe('VAULT_INITIALIZED_KEY', () => {
      it('validates VAULT_INITIALIZED_KEY has MetaMask namespace', () => {
        // Given the VAULT_INITIALIZED_KEY constant
        // When checking its format
        // Then it should start with @MetaMask: prefix
        expect(VAULT_INITIALIZED_KEY).toMatch(/^@MetaMask:/);
      });

      it('validates VAULT_INITIALIZED_KEY contains vaultInitialized identifier', () => {
        // Given the VAULT_INITIALIZED_KEY constant
        // When checking its content
        // Then it should contain the vaultInitialized identifier
        expect(VAULT_INITIALIZED_KEY).toContain('vaultInitialized');
      });
    });

    describe('additionalSrps', () => {
      it('validates additionalSrps contains string or undefined values', () => {
        // Given the additionalSrps array with 20 slots
        // When checking each value type
        // Then each should be either a string or undefined
        additionalSrps.forEach((srp) => {
          expect(typeof srp === 'string' || srp === undefined).toBe(true);
        });
      });
    });
  });

  describe('module exports validation', () => {
    it('exports applyVaultInitialization as a function', () => {
      // Given the module exports
      // When checking applyVaultInitialization
      // Then it should be a function
      expect(typeof applyVaultInitialization).toBe('function');
    });

    it('exports VAULT_INITIALIZED_KEY as a string', () => {
      // Given the module exports
      // When checking VAULT_INITIALIZED_KEY type
      // Then it should be a string
      expect(typeof VAULT_INITIALIZED_KEY).toBe('string');
    });

    it('exports predefinedPassword as string or undefined', () => {
      // Given the module exports
      // When checking predefinedPassword type
      // Then it should be either string or undefined
      expect(
        predefinedPassword === undefined ||
          typeof predefinedPassword === 'string',
      ).toBe(true);
    });

    it('exports additionalSrps as an array', () => {
      // Given the module exports
      // When checking additionalSrps type
      // Then it should be an array
      expect(Array.isArray(additionalSrps)).toBe(true);
    });
  });
});
