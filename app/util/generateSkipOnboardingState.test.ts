import {
  applyVaultInitialization,
  VAULT_INITIALIZED_KEY,
  predefinedPassword,
  additionalSrps,
} from './generateSkipOnboardingState';
import StorageWrapper from '../store/storage-wrapper';
import { seedphraseBackedUp } from '../actions/user';
import { storePrivacyPolicyClickedOrClosed } from '../reducers/legalNotices';
import { Authentication } from '../core';
import { importNewSecretRecoveryPhrase } from '../actions/multiSrp';
import importAdditionalAccounts from './importAdditionalAccounts';
import { store } from '../store';
import Engine from '../core/Engine';
import { isMultichainAccountsState2Enabled } from '../multichain-accounts/remote-feature-flag';

// Mock all dependencies
jest.mock('../store/storage-wrapper');
jest.mock('../actions/user');
jest.mock('../reducers/legalNotices');
jest.mock('../core');
jest.mock('../actions/multiSrp');
jest.mock('./importAdditionalAccounts');
jest.mock('../store');
jest.mock('../core/Engine');
jest.mock('../multichain-accounts/remote-feature-flag');

// Type the mocked modules
const mockStorageWrapper = StorageWrapper as jest.Mocked<typeof StorageWrapper>;
const mockSeedphraseBackedUp = seedphraseBackedUp as jest.MockedFunction<
  typeof seedphraseBackedUp
>;
const mockStorePrivacyPolicyClickedOrClosed =
  storePrivacyPolicyClickedOrClosed as jest.MockedFunction<
    typeof storePrivacyPolicyClickedOrClosed
  >;
const mockAuthentication = Authentication as jest.Mocked<typeof Authentication>;
const mockImportNewSecretRecoveryPhrase =
  importNewSecretRecoveryPhrase as jest.MockedFunction<
    typeof importNewSecretRecoveryPhrase
  >;
const mockImportAdditionalAccounts =
  importAdditionalAccounts as jest.MockedFunction<
    typeof importAdditionalAccounts
  >;
const mockIsMultichainAccountsState2Enabled =
  isMultichainAccountsState2Enabled as jest.MockedFunction<
    typeof isMultichainAccountsState2Enabled
  >;
const mockStore = store as jest.Mocked<typeof store>;
const mockEngine = Engine as jest.Mocked<typeof Engine>;

describe('generateSkipOnboardingState', () => {
  const mockKeyringController = {
    getKeyringsByType: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'warn').mockImplementation(jest.fn());

    mockStorageWrapper.getItem.mockResolvedValue(null);
    mockStorageWrapper.setItem.mockResolvedValue();
    mockAuthentication.newWalletAndKeychain.mockResolvedValue();
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0x123',
      discoveredAccountsCount: 1,
    });
    mockImportAdditionalAccounts.mockResolvedValue();
    mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
    mockSeedphraseBackedUp.mockReturnValue({ type: 'test' } as never);
    mockStorePrivacyPolicyClickedOrClosed.mockReturnValue({
      type: 'test',
    } as never);
    mockStore.dispatch.mockReturnValue({ type: 'test' } as never);

    // Mock Engine context
    Object.defineProperty(mockEngine, 'context', {
      value: {
        KeyringController: mockKeyringController,
      },
      writable: true,
      configurable: true,
    });
    mockKeyringController.getKeyringsByType.mockReturnValue([
      { type: 'HD Key Tree' },
      { type: 'HD Key Tree' },
    ]);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('constants', () => {
    it('should export the correct vault initialized key', () => {
      expect(VAULT_INITIALIZED_KEY).toBe('@MetaMask:vaultInitialized');
    });

    it('should export predefined password from environment', () => {
      expect(predefinedPassword).toBe(process.env.PREDEFINED_PASSWORD);
    });

    it('should export additional SRPs array', () => {
      expect(Array.isArray(additionalSrps)).toBe(true);
      expect(additionalSrps).toHaveLength(20); // ADDITIONAL_SRP_1 to ADDITIONAL_SRP_20
    });
  });

  describe('applyVaultInitialization', () => {
    describe('when predefined password is not set', () => {
      it('should return null when no predefined password is available', async () => {
        // Given that predefinedPassword is undefined
        // When we call the function
        const result = await applyVaultInitialization();

        // Then it should return null and not perform any operations
        expect(result).toBeNull();
      });
    });

    describe('exported constants structure', () => {
      it('should have correct VAULT_INITIALIZED_KEY format', () => {
        expect(VAULT_INITIALIZED_KEY).toMatch(/^@MetaMask:/);
        expect(VAULT_INITIALIZED_KEY).toContain('vaultInitialized');
      });

      it('should have additionalSrps array with expected structure', () => {
        expect(additionalSrps).toHaveLength(20);

        additionalSrps.forEach((srp) => {
          expect(typeof srp === 'string' || srp === undefined).toBe(true);
        });
      });
    });
  });

  describe('module exports', () => {
    it('should export applyVaultInitialization function', () => {
      expect(typeof applyVaultInitialization).toBe('function');
    });

    it('should export VAULT_INITIALIZED_KEY constant', () => {
      expect(typeof VAULT_INITIALIZED_KEY).toBe('string');
    });

    it('should export predefinedPassword', () => {
      expect(
        predefinedPassword === undefined ||
          typeof predefinedPassword === 'string',
      ).toBe(true);
    });

    it('should export additionalSrps array', () => {
      expect(Array.isArray(additionalSrps)).toBe(true);
    });
  });
});
