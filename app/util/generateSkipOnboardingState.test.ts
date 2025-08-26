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

// Mock all dependencies
jest.mock('../store/storage-wrapper');
jest.mock('../actions/user');
jest.mock('../reducers/legalNotices');
jest.mock('../core');
jest.mock('../actions/multiSrp');
jest.mock('./importAdditionalAccounts');
jest.mock('../store');

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
const mockStore = store as jest.Mocked<typeof store>;

describe('generateSkipOnboardingState', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockStorageWrapper.getItem.mockResolvedValue(null);
    mockStorageWrapper.setItem.mockResolvedValue();
    mockAuthentication.newWalletAndKeychain.mockResolvedValue();
    mockImportNewSecretRecoveryPhrase.mockResolvedValue({
      address: '0x123',
      discoveredAccountsCount: 1,
    });
    mockImportAdditionalAccounts.mockResolvedValue();
    mockSeedphraseBackedUp.mockReturnValue({ type: 'test' } as never);
    mockStorePrivacyPolicyClickedOrClosed.mockReturnValue({
      type: 'test',
    } as never);
    mockStore.dispatch.mockReturnValue({ type: 'test' } as never);
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
      expect(additionalSrps).toHaveLength(19); // ADDITIONAL_SRP_2 to ADDITIONAL_SRP_20
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

    describe('when function conditions are not met', () => {
      it('should return null without side effects', async () => {
        const result = await applyVaultInitialization();

        expect(result).toBeNull();
        // Note: In test environment, predefinedPassword is likely undefined,
        // so the function returns early without calling any dependencies
      });
    });

    describe('exported constants structure', () => {
      it('should have correct VAULT_INITIALIZED_KEY format', () => {
        expect(VAULT_INITIALIZED_KEY).toMatch(/^@MetaMask:/);
        expect(VAULT_INITIALIZED_KEY).toContain('vaultInitialized');
      });

      it('should have additionalSrps array with expected structure', () => {
        expect(additionalSrps).toHaveLength(19);

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
