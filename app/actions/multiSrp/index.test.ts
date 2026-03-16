import { KeyringTypes } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import {
  importNewSecretRecoveryPhrase,
  createNewSecretRecoveryPhrase,
  addNewHdAccount,
} from './';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { TraceName, TraceOperation } from '../../util/trace';
import ReduxService from '../../core/redux/ReduxService';
import { RootState } from '../../reducers';
import { SecretType } from '@metamask/seedless-onboarding-controller';
import { EntropySourceId } from '@metamask/keyring-api';
import { waitFor } from '@testing-library/react-native';
import { toMultichainAccountWalletId } from '@metamask/account-api';
import { mnemonicPhraseToBytes } from '@metamask/key-tree';

const mockSeed =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

const mockEntropySource = 'keyring-id-123';

const mockAddress = '0x123';
const mockExpectedAccount = createMockInternalAccount(
  mockAddress,
  'Account 1',
  KeyringTypes.hd,
);

const mockSetSelectedAddress = jest.fn();
const mockAddNewKeyring = jest.fn();
const mockGetKeyringsByType = jest.fn();
const mockGetAccounts = jest.fn();
const mockAddAccounts = jest.fn();
const mockSetAccountLabel = jest.fn();
const mockControllerMessenger = jest.fn();
const mockGetAccountByAddress = jest.fn().mockReturnValue(mockExpectedAccount);
const mockCreateMultichainAccountWallet = jest.fn();
const mockRemoveMultichainAccountWallet = jest.fn();
const mockSyncAccountTreeWithUserStorage = jest.fn();

// Mock for seedless onboarding
const mockSelectSeedlessOnboardingLoginFlow = jest.fn();
const mockAddNewSecretData = jest.fn();
const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

const hdKeyring = {
  getAccounts: () => {
    mockGetAccounts();
    return [mockAddress];
  },
  addAccounts: (n: number) => {
    mockAddAccounts(n);
    return [mockAddress];
  },
};

jest.mock('../../selectors/seedlessOnboardingController', () => ({
  selectSeedlessOnboardingLoginFlow: (state: unknown) =>
    mockSelectSeedlessOnboardingLoginFlow(state),
}));

jest.mock('../../util/trace', () => ({
  ...jest.requireActual('../../util/trace'),
  trace: (options: unknown) => mockTrace(options),
  endTrace: (options: unknown) => mockEndTrace(options),
}));

const createMockState = (hasVault: boolean) => ({
  engine: {
    backgroundState: {
      SeedlessOnboardingController: {
        vault: hasVault ? 'encrypted-vault-data' : undefined,
        socialBackupsMetadata: [],
      },
    },
  },
});

jest.mock('../../core/redux/ReduxService', () => ({
  store: {
    getState: () => ({}),
  },
}));

const mockDiscoverAccounts = jest.fn();

jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAccounts: (entropySource: EntropySourceId) =>
    mockDiscoverAccounts(entropySource),
}));

const mockGetSnapKeyring = jest.fn().mockResolvedValue(true);

jest.mock('../../core/Engine', () => ({
  getSnapKeyring: () => mockGetSnapKeyring(),
  context: {
    KeyringController: {
      addNewKeyring: (keyringType: ExtendedKeyringTypes, args: unknown) =>
        mockAddNewKeyring(keyringType, args),
      getKeyringsByType: () => mockGetKeyringsByType(),
      withKeyring: (_selector: unknown, operation: (args: unknown) => void) =>
        operation({ keyring: hdKeyring, metadata: { id: '1234' } }),
    },
    AccountsController: {
      getNextAvailableAccountName: jest.fn().mockReturnValue('Snap Account 1'),
      getAccountByAddress: () => mockGetAccountByAddress(),
    },
    SeedlessOnboardingController: {
      addNewSecretData: (
        seed: Uint8Array,
        type: SecretType,
        keyringId: string,
      ) => mockAddNewSecretData(seed, type, keyringId),
    },
    AccountTreeController: {
      syncWithUserStorage: () => mockSyncAccountTreeWithUserStorage(),
    },
    MultichainAccountService: {
      createMultichainAccountWallet: (...params: unknown[]) =>
        mockCreateMultichainAccountWallet(...params),
      removeMultichainAccountWallet: (...params: unknown[]) =>
        mockRemoveMultichainAccountWallet(...params),
    },
  },
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  setAccountLabel: (address: string, label: string) =>
    mockSetAccountLabel(address, label),
  controllerMessenger: mockControllerMessenger,
}));

jest.mocked(Engine);

const mockMultichainAccountGroup = {
  getAccounts: jest.fn().mockReturnValue([
    {
      address: mockAddress,
    },
  ]),
};

const mockMultichainAccountWallet = {
  id: toMultichainAccountWalletId(mockEntropySource),
  entropySource: mockEntropySource,
  getAccountGroup: () => mockMultichainAccountGroup,
};

describe('MultiSRP Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddNewSecretData.mockReset();
    mockGetSnapKeyring.mockResolvedValue(true);
    mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);
    mockCreateMultichainAccountWallet.mockResolvedValue(
      mockMultichainAccountWallet,
    );
  });

  describe('importNewSecretRecoveryPhrase', () => {
    it('successfully imports a new secret recovery phrase and returns account details', async () => {
      // Arrange
      mockDiscoverAccounts.mockResolvedValue(5);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        mockSeed,
        undefined,
        mockCallback,
      );

      // Assert synchronous return
      expect(mockCreateMultichainAccountWallet).toHaveBeenCalledWith({
        type: 'import',
        mnemonic: mnemonicPhraseToBytes(mockSeed),
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Assert async operations and callback receive the actual discovered accounts count
      await waitFor(() => {
        expect(mockGetSnapKeyring).toHaveBeenCalled();
        expect(mockSyncAccountTreeWithUserStorage).toHaveBeenCalled();
        expect(mockDiscoverAccounts).toHaveBeenCalledWith(mockEntropySource);
        expect(mockCallback).toHaveBeenCalledWith({
          address: mockAddress,
          discoveredAccountsCount: 5,
        });
      });
    });

    it('gracefully handles errors during discovery with new SRP', async () => {
      // Arrange
      mockDiscoverAccounts.mockRejectedValue(new Error('Discovery failed'));

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        mockSeed,
        undefined,
        mockCallback,
      );

      // Assert synchronous return
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Assert async operations and callback receives 0 when discovery fails
      await waitFor(() => {
        expect(mockGetSnapKeyring).toHaveBeenCalled();
        expect(mockSyncAccountTreeWithUserStorage).toHaveBeenCalled();
        expect(mockDiscoverAccounts).toHaveBeenCalledWith(mockEntropySource);
        expect(mockCallback).toHaveBeenCalledWith({
          address: mockAddress,
          discoveredAccountsCount: 0, // Discovery has failed, so callback gets 0
          error: expect.any(Error),
        });
      });
    });

    it('forward error from the MultichainAccountService', async () => {
      // Arrange
      const mockError = new Error('Multichain wallet creation failed');
      mockCreateMultichainAccountWallet.mockRejectedValue(mockError);

      // Act & Assert
      await expect(importNewSecretRecoveryPhrase(mockSeed)).rejects.toThrow(
        mockError,
      );
    });

    it('does not select account when shouldSelectAccount is false', async () => {
      // Arrange
      mockDiscoverAccounts.mockResolvedValue(0);

      // Act
      const result = await importNewSecretRecoveryPhrase(mockSeed, {
        shouldSelectAccount: false,
      });

      // Assert
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0,
      });
    });

    describe('seedless onboarding login flow', () => {
      beforeEach(() => {
        mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);
      });

      it('successfully adds seed phrase backup when seedless onboarding is enabled', async () => {
        mockAddNewSecretData.mockResolvedValue(undefined);
        mockDiscoverAccounts.mockResolvedValue(5);

        const mockCallback = jest.fn();

        const result = await importNewSecretRecoveryPhrase(
          mockSeed,
          undefined,
          mockCallback,
        );

        expect(mockSelectSeedlessOnboardingLoginFlow).toHaveBeenCalled();
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          op: TraceOperation.OnboardingSecurityOp,
        });
        expect(mockAddNewSecretData).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          SecretType.Mnemonic,
          {
            keyringId: mockEntropySource,
          },
        );
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          data: { success: true },
        });
        expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
        expect(result.address).toBe(mockAddress);

        // Verify async discovery is called
        await waitFor(() => {
          expect(mockDiscoverAccounts).toHaveBeenCalledWith(mockEntropySource);
        });
      });

      it('handles error when seed phrase backup fails and traces error', async () => {
        mockAddNewSecretData.mockRejectedValue(new Error('Backup failed'));

        await expect(importNewSecretRecoveryPhrase(mockSeed)).rejects.toThrow(
          'Backup failed',
        );

        expect(mockSelectSeedlessOnboardingLoginFlow).toHaveBeenCalled();
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          op: TraceOperation.OnboardingSecurityOp,
        });
        expect(mockAddNewSecretData).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          SecretType.Mnemonic,
          {
            keyringId: mockEntropySource,
          },
        );
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrpError,
          op: TraceOperation.OnboardingError,
          tags: { errorMessage: 'Backup failed' },
        });
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrpError,
        });
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          data: { success: false },
        });
      });

      it('rollback wallet creation if seed phrase backup fails', async () => {
        const mockError = new Error('Backup failed');
        mockAddNewSecretData.mockRejectedValue(mockError);

        await expect(importNewSecretRecoveryPhrase(mockSeed)).rejects.toThrow(
          mockError,
        );

        expect(mockAddNewSecretData).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          SecretType.Mnemonic,
          {
            keyringId: mockEntropySource,
          },
        );
        expect(mockRemoveMultichainAccountWallet).toHaveBeenCalledWith(
          mockEntropySource,
          mockAddress,
        );
      });
    });

    it('calls addNewSeedPhraseBackup when seedless onboarding login flow is active', async () => {
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);
      mockAddNewSecretData.mockResolvedValue(undefined);
      mockDiscoverAccounts.mockResolvedValue(3);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        mockSeed,
        undefined,
        mockCallback,
      );

      expect(mockAddNewSecretData).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        SecretType.Mnemonic,
        {
          keyringId: mockEntropySource,
        },
      );
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Verify callback receives the actual discovered count
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          address: mockAddress,
          discoveredAccountsCount: 3,
        });
      });
    });

    it('reverts keyring import when seedless onboarding sync fails', async () => {
      // Arrange
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);
      const syncError = new Error('Sync failed');
      mockAddNewSecretData.mockRejectedValue(syncError);

      // Act & Assert
      await expect(importNewSecretRecoveryPhrase(mockSeed)).rejects.toThrow(
        'Sync failed',
      );
      expect(mockRemoveMultichainAccountWallet).toHaveBeenCalledWith(
        mockEntropySource,
        mockAddress,
      );
    });

    it('does not sync with seedless onboarding when login flow is not active', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [mockAddress],
      });
      mockDiscoverAccounts.mockResolvedValue(2);
      jest
        .spyOn(ReduxService.store, 'getState')
        .mockReturnValue(createMockState(false) as unknown as RootState);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        mockSeed,
        undefined,
        mockCallback,
      );

      // Assert
      expect(mockAddNewSecretData).not.toHaveBeenCalled();
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Verify callback receives the actual discovered count
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          address: mockAddress,
          discoveredAccountsCount: 2,
        });
      });
    });

    it('handles case insensitive mnemonic input', async () => {
      // Arrange
      mockDiscoverAccounts.mockResolvedValue(3);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        mockSeed.toUpperCase(),
        undefined,
        mockCallback,
      );

      // Assert
      expect(mockCreateMultichainAccountWallet).toHaveBeenCalledWith({
        type: 'import',
        mnemonic: mnemonicPhraseToBytes(mockSeed),
      });
      expect(result).toEqual({
        address: mockAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Verify callback receives the actual discovered count
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          address: mockAddress,
          discoveredAccountsCount: 3,
        });
      });
    });
  });

  describe('createNewSecretRecoveryPhrase', () => {
    it('creates new SRP', async () => {
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => Promise.resolve([mockAddress]),
      });

      await createNewSecretRecoveryPhrase();

      expect(mockAddNewKeyring).toHaveBeenCalledWith(
        KeyringTypes.hd,
        undefined,
      );
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
    });

    it('Does not set selected address or gets accounts on errors', async () => {
      mockAddNewKeyring.mockRejectedValue(new Error('Test error'));

      await expect(
        async () => await createNewSecretRecoveryPhrase(),
      ).rejects.toThrow('Test error');

      expect(mockGetAccounts).not.toHaveBeenCalled();
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
    });
  });

  describe('addNewHdAccount', () => {
    it('adds a new HD account, sets the selected address and returns the account', async () => {
      mockAddAccounts.mockReturnValue([mockAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      const account = await addNewHdAccount();

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
      expect(account).toEqual(mockExpectedAccount);
    });

    it('adds a new HD account with a specific keyring ID and sets the selected address', async () => {
      const keyringId = 'test-keyring-id';
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);
      mockAddAccounts.mockReturnValue([mockAddress]);

      await addNewHdAccount(keyringId);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
    });

    it('adds a new HD account and sets the account label if a name is provided', async () => {
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([mockAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(undefined, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        mockAddress,
        accountName,
      );
    });

    it('adds a new HD account with a specific keyring ID and sets the account label if a name is provided', async () => {
      const keyringId = 'test-keyring-id';
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([mockAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(keyringId, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(mockAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        mockAddress,
        accountName,
      );
    });

    it('throws if the newly added account is not found', async () => {
      mockGetAccountByAddress.mockReturnValue(undefined);

      await expect(async () => await addNewHdAccount()).rejects.toThrow(
        'Account not found',
      );
    });
  });
});
