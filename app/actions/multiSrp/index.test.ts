import { KeyringTypes } from '@metamask/keyring-controller';
import ExtendedKeyringTypes from '../../constants/keyringTypes';
import Engine from '../../core/Engine';
import {
  importNewSecretRecoveryPhrase,
  createNewSecretRecoveryPhrase,
  addNewHdAccount,
} from './';
import { wordlist } from '@metamask/scure-bip39/dist/wordlists/english';
import { createMockInternalAccount } from '../../util/test/accountsControllerTestUtils';
import { TraceName, TraceOperation } from '../../util/trace';
import ReduxService from '../../core/redux/ReduxService';
import { RootState } from '../../reducers';
import { SecretType } from '@metamask/seedless-onboarding-controller';
import { BtcScope, EntropySourceId, SolScope } from '@metamask/keyring-api';
import { waitFor } from '@testing-library/react-native';

const testAddress = '0x123';
const mockExpectedAccount = createMockInternalAccount(
  testAddress,
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
const mockAddDiscoveredAccounts = jest.fn();
const mockGetAccountByAddress = jest.fn().mockReturnValue(mockExpectedAccount);
const mockRemoveAccount = jest.fn();
const mockSyncAccountTreeWithUserStorage = jest.fn();

// Mock for seedless onboarding
const mockSelectSeedlessOnboardingLoginFlow = jest.fn();
const mockAddNewSecretData = jest.fn();
const mockTrace = jest.fn();
const mockEndTrace = jest.fn();

const hdKeyring = {
  getAccounts: () => {
    mockGetAccounts();
    return ['0x123'];
  },
  addAccounts: (n: number) => {
    mockAddAccounts(n);
    return ['0x123'];
  },
};

const mockSnapClient = {
  addDiscoveredAccounts: mockAddDiscoveredAccounts,
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

jest.mock('../../core/SnapKeyring/MultichainWalletSnapClient', () => ({
  ...jest.requireActual('../../core/SnapKeyring/MultichainWalletSnapClient'),
  MultichainWalletSnapFactory: {
    createClient: () => mockSnapClient,
  },
}));

const mockIsMultichainAccountsState2Enabled = jest.fn().mockReturnValue(false);

jest.mock('../../multichain-accounts/remote-feature-flag', () => ({
  isMultichainAccountsState2Enabled: () =>
    mockIsMultichainAccountsState2Enabled(),
}));

const mockDiscoverAccounts = jest.fn();

jest.mock('../../multichain-accounts/discovery', () => ({
  discoverAccounts: (entropySource: EntropySourceId) =>
    mockDiscoverAccounts(entropySource),
}));

jest.mock('../../core/Engine', () => ({
  context: {
    KeyringController: {
      addNewKeyring: (keyringType: ExtendedKeyringTypes, args: unknown) =>
        mockAddNewKeyring(keyringType, args),
      getKeyringsByType: () => mockGetKeyringsByType(),
      withKeyring: (_selector: unknown, operation: (args: unknown) => void) =>
        operation({ keyring: hdKeyring, metadata: { id: '1234' } }),
      removeAccount: (address: string) => mockRemoveAccount(address),
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
  },
  setSelectedAddress: (address: string) => mockSetSelectedAddress(address),
  setAccountLabel: (address: string, label: string) =>
    mockSetAccountLabel(address, label),
  controllerMessenger: mockControllerMessenger,
}));

jest.mocked(Engine);

const testMnemonic =
  'verb middle giant soon wage common wide tool gentle garlic issue nut retreat until album recall expire bronze bundle live accident expect dry cook';

describe('MultiSRP Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddNewSecretData.mockReset();
    mockIsMultichainAccountsState2Enabled.mockReturnValue(false);
  });

  describe('importNewSecretRecoveryPhrase', () => {
    it('successfully imports a new secret recovery phrase and returns account details', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => [testAddress],
        id: 'keyring-id-123',
      });
      mockAddDiscoveredAccounts.mockResolvedValue(5);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);

      // Act
      const result = await importNewSecretRecoveryPhrase(testMnemonic);

      // Assert
      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: testMnemonic,
        numberOfAccounts: 1,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockAddDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-id-123',
        BtcScope.Mainnet,
      );
      expect(mockAddDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-id-123',
        SolScope.Mainnet,
      );
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 10,
      });
    });

    it('(state 2) - successfully imports a new secret recovery phrase and returns account details', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => [testAddress],
        id: 'keyring-id-123',
      });
      mockDiscoverAccounts.mockResolvedValue(5);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        testMnemonic,
        undefined,
        mockCallback,
      );

      // Assert synchronous return
      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: testMnemonic,
        numberOfAccounts: 1,
      });
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSyncAccountTreeWithUserStorage).toHaveBeenCalled();
      expect(mockDiscoverAccounts).toHaveBeenCalledWith('keyring-id-123');
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately for multichain accounts state 2
      });

      // Assert callback receives the actual discovered accounts count
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          address: testAddress,
          discoveredAccountsCount: 5,
        });
      });
    });

    it('(state 2) - gracefully handle errors during discovery with new SRP', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => [testAddress],
        id: 'keyring-id-123',
      });
      mockDiscoverAccounts.mockRejectedValue(new Error('Discovery failed'));
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);
      mockIsMultichainAccountsState2Enabled.mockReturnValue(true);

      const mockCallback = jest.fn();

      // Act
      const result = await importNewSecretRecoveryPhrase(
        testMnemonic,
        undefined,
        mockCallback,
      );

      // Assert synchronous return
      expect(mockSyncAccountTreeWithUserStorage).toHaveBeenCalled();
      expect(mockDiscoverAccounts).toHaveBeenCalledWith('keyring-id-123');
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 0, // Returns 0 immediately, actual discovery happens async
      });

      // Assert callback receives 0 when discovery fails
      await waitFor(() => {
        expect(mockCallback).toHaveBeenCalledWith({
          address: testAddress,
          discoveredAccountsCount: 0, // Discovery has failed, so callback gets 0
        });
      });
    });

    it('throws error when attempting to import an already imported mnemonic', async () => {
      // Arrange
      const existingMnemonicCodePoints = new Uint16Array(
        testMnemonic.split(' ').map((word) => wordlist.indexOf(word)),
      );
      mockGetKeyringsByType.mockResolvedValue([
        {
          mnemonic: existingMnemonicCodePoints.buffer,
        },
      ]);

      // Act & Assert
      await expect(importNewSecretRecoveryPhrase(testMnemonic)).rejects.toThrow(
        'This mnemonic has already been imported.',
      );
      expect(mockAddNewKeyring).not.toHaveBeenCalled();
    });

    it('does not select account when shouldSelectAccount is false', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [testAddress],
      });
      mockAddDiscoveredAccounts.mockResolvedValue(0);

      // Act
      const result = await importNewSecretRecoveryPhrase(testMnemonic, {
        shouldSelectAccount: false,
      });

      // Assert
      expect(mockSetSelectedAddress).not.toHaveBeenCalled();
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 0,
      });
    });

    describe('seedless onboarding login flow', () => {
      beforeEach(() => {
        mockGetKeyringsByType.mockResolvedValue([]);
        mockAddNewKeyring.mockResolvedValue({
          getAccounts: () => [testAddress],
          id: 'keyring-id-123',
        });
        mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(true);
      });

      it('successfully adds seed phrase backup when seedless onboarding is enabled', async () => {
        mockAddNewSecretData.mockResolvedValue(undefined);

        const result = await importNewSecretRecoveryPhrase(testMnemonic);

        expect(mockSelectSeedlessOnboardingLoginFlow).toHaveBeenCalled();
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          op: TraceOperation.OnboardingSecurityOp,
        });
        expect(mockAddNewSecretData).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          SecretType.Mnemonic,
          {
            keyringId: 'keyring-id-123',
          },
        );
        expect(mockEndTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          data: { success: true },
        });
        expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
        expect(result.address).toBe(testAddress);
        expect(mockAddDiscoveredAccounts).toHaveBeenCalled();
      });

      it('handles error when seed phrase backup fails and traces error', async () => {
        mockAddNewSecretData.mockRejectedValue(new Error('Backup failed'));

        await expect(
          importNewSecretRecoveryPhrase(testMnemonic),
        ).rejects.toThrow('Backup failed');

        expect(mockSelectSeedlessOnboardingLoginFlow).toHaveBeenCalled();
        expect(mockTrace).toHaveBeenCalledWith({
          name: TraceName.OnboardingAddSrp,
          op: TraceOperation.OnboardingSecurityOp,
        });
        expect(mockAddNewSecretData).toHaveBeenCalledWith(
          expect.any(Uint8Array),
          SecretType.Mnemonic,
          {
            keyringId: 'keyring-id-123',
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
    });

    it('calls addNewSeedPhraseBackup when seedless onboarding login flow is active', async () => {
      mockAddNewSecretData.mockResolvedValue(undefined);
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [testAddress],
      });
      mockAddDiscoveredAccounts.mockResolvedValue(3);
      jest
        .spyOn(ReduxService.store, 'getState')
        .mockReturnValue(createMockState(true) as unknown as RootState);

      // Act
      const result = await importNewSecretRecoveryPhrase(testMnemonic);

      expect(mockAddNewSecretData).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        SecretType.Mnemonic,
        {
          keyringId: 'test-keyring-id',
        },
      );
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 6,
      });
    });

    it('reverts keyring import when seedless onboarding sync fails', async () => {
      // Arrange
      const syncError = new Error('Sync failed');
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [testAddress],
      });
      jest
        .spyOn(ReduxService.store, 'getState')
        .mockReturnValue(createMockState(true) as unknown as RootState);
      mockAddNewSecretData.mockRejectedValue(syncError);

      // Act & Assert
      await expect(importNewSecretRecoveryPhrase(testMnemonic)).rejects.toThrow(
        'Sync failed',
      );
      expect(mockRemoveAccount).toHaveBeenCalledWith(testAddress);
    });

    it('does not sync with seedless onboarding when login flow is not active', async () => {
      // Arrange
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [testAddress],
      });
      mockAddDiscoveredAccounts.mockResolvedValue(2);
      jest
        .spyOn(ReduxService.store, 'getState')
        .mockReturnValue(createMockState(false) as unknown as RootState);
      mockSelectSeedlessOnboardingLoginFlow.mockReturnValue(false);

      // Act
      const result = await importNewSecretRecoveryPhrase(testMnemonic);

      // Assert
      expect(mockAddNewSecretData).not.toHaveBeenCalled();
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 4, // bitcoin + solana
      });
    });

    it('handles case insensitive mnemonic input', async () => {
      // Arrange
      const uppercaseMnemonic = testMnemonic.toUpperCase();
      mockGetKeyringsByType.mockResolvedValue([]);
      mockAddNewKeyring.mockResolvedValue({
        id: 'test-keyring-id',
        getAccounts: () => [testAddress],
      });
      mockAddDiscoveredAccounts.mockResolvedValue(1);

      // Act
      const result = await importNewSecretRecoveryPhrase(uppercaseMnemonic);

      // Assert
      expect(mockAddNewKeyring).toHaveBeenCalledWith(ExtendedKeyringTypes.hd, {
        mnemonic: uppercaseMnemonic,
        numberOfAccounts: 1,
      });
      expect(result).toEqual({
        address: testAddress,
        discoveredAccountsCount: 2, // bitcoin + solana
      });
    });
  });

  describe('createNewSecretRecoveryPhrase', () => {
    it('creates new SRP', async () => {
      mockAddNewKeyring.mockResolvedValue({
        getAccounts: () => Promise.resolve([testAddress]),
      });

      await createNewSecretRecoveryPhrase();

      expect(mockAddNewKeyring).toHaveBeenCalledWith(
        KeyringTypes.hd,
        undefined,
      );
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
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
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      const account = await addNewHdAccount();

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(account).toEqual(mockExpectedAccount);
    });

    it('adds a new HD account with a specific keyring ID and sets the selected address', async () => {
      const keyringId = 'test-keyring-id';
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);
      mockAddAccounts.mockReturnValue([testAddress]);

      await addNewHdAccount(keyringId);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
    });

    it('adds a new HD account and sets the account label if a name is provided', async () => {
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(undefined, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        testAddress,
        accountName,
      );
    });

    it('adds a new HD account with a specific keyring ID and sets the account label if a name is provided', async () => {
      const keyringId = 'test-keyring-id';
      const accountName = 'Test Account';
      mockAddAccounts.mockReturnValue([testAddress]);
      mockGetAccountByAddress.mockReturnValue(mockExpectedAccount);

      await addNewHdAccount(keyringId, accountName);

      expect(mockAddAccounts).toHaveBeenCalledWith(1);
      expect(mockSetSelectedAddress).toHaveBeenCalledWith(testAddress);
      expect(mockSetAccountLabel).toHaveBeenCalledWith(
        testAddress,
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
