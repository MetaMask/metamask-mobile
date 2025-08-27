import {
  MultichainWalletSnapClient,
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';
import { AccountDiscovery } from './AccountDiscovery';
import { PENDING_SRP_DISCOVERY } from '../../constants/storage';

// Mock StorageWrapper
jest.mock('../../store/storage-wrapper', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

// Mock MultichainWalletSnapFactory and related modules
jest.mock('../SnapKeyring/MultichainWalletSnapClient', () => {
  const actual = jest.requireActual(
    '../SnapKeyring/MultichainWalletSnapClient',
  );
  return {
    ...actual,
    MultichainWalletSnapFactory: {
      createClient: jest.fn(),
    },
  };
});

describe('AccountDiscovery', () => {
  // Mock implementations
  const mockStorageWrapper = StorageWrapper as jest.Mocked<
    typeof StorageWrapper
  >;
  const mockMultichainWalletSnapFactory =
    MultichainWalletSnapFactory as jest.Mocked<
      typeof MultichainWalletSnapFactory
    >;

  // Mock client
  const mockClient = jest.mocked({
    addDiscoveredAccounts: jest.fn().mockResolvedValue(undefined),
    getSnapId: jest.fn(),
    getSnapName: jest.fn(),
    getClientType: jest.fn(),
    getSnapSender: jest.fn(),
    createAccount: jest.fn(),
    discoverAccounts: jest.fn(),
    withSnapKeyring: jest.fn(),
    startTrace: jest.fn(),
    endTrace: jest.fn(),
  } as unknown as MultichainWalletSnapClient);

  const storageScratchPad: Record<string, string> = {};
  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset AccountDiscovery state
    AccountDiscovery.clearPendingKeyring();

    // Reset mock client methods
    mockClient.addDiscoveredAccounts.mockReset();
    mockClient.addDiscoveredAccounts.mockResolvedValue(0);

    // Set up default mocks
    mockMultichainWalletSnapFactory.createClient.mockReturnValue(mockClient);
    mockStorageWrapper.getItem.mockImplementation(
      async (key) => storageScratchPad[key] || '',
    );
    mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
      storageScratchPad[key] = value;
    });
  });

  describe('constructor and initialization', () => {
    it('initialize with empty pending keyring when no stored data exists', async () => {
      // Arrange

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
      );
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });

    it('initialize with stored pending keyring data when it exists', async () => {
      // Arrange
      const storedData = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: false,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(storedData);

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(mockStorageWrapper.getItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
      );
      expect(AccountDiscovery.pendingKeyring).toEqual(storedData);
    });

    it('handle JSON parse errors during initialization', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue('invalid-json');

      // Act & Assert
      await expect(AccountDiscovery.init()).rejects.toThrow();
    });
  });

  describe('clearPendingKeyring', () => {
    it('clear the pending keyring data', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);

      await AccountDiscovery.init();
      // Act
      AccountDiscovery.clearPendingKeyring();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });
  });

  describe('performAccountDiscovery', () => {
    it('throw error when discovery is already running', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);

      await AccountDiscovery.init();

      AccountDiscovery.performAccountDiscovery();

      // Act & Assert
      await expect(AccountDiscovery.performAccountDiscovery()).rejects.toThrow(
        'discovery is running',
      );
    });

    it('perform discovery for all pending keyrings and wallet types', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(mockMultichainWalletSnapFactory.createClient).toHaveBeenCalledWith(
        WalletClientType.Bitcoin,
        { setSelectedAccount: false },
      );
      expect(mockMultichainWalletSnapFactory.createClient).toHaveBeenCalledWith(
        WalletClientType.Solana,
        { setSelectedAccount: false },
      );

      // call addDiscoveredAccounts for pending items only
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Solana].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-2',
        WALLET_SNAP_MAP[WalletClientType.Solana].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledTimes(3);

      // update storage after each discovery
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
        expect.stringContaining('keyring-1'),
      );
    });

    it('mark pending items as false after successful discovery', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(
        AccountDiscovery.pendingKeyring['keyring-1'][WalletClientType.Bitcoin],
      ).toBe(false);
    });

    it('set discoveryRunning to false even if an error occurs', async () => {
      // Arrange
      mockClient.addDiscoveredAccounts.mockRejectedValue(
        new Error('Discovery failed'),
      );
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act & Assert
      await expect(AccountDiscovery.attemptAccountDiscovery()).rejects.toThrow(
        'Discovery failed',
      );
      // We intentionally access a private property for test verification.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect((AccountDiscovery as any).discoveryRunning).toBe(false);
    });

    it('skip discovery for items that are already false', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.attemptAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Solana].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledTimes(1);
    });
  });

  describe('addKeyringForAcccountDiscovery', () => {
    it('add multiple keyring IDs with default client types', async () => {
      // Arrange
      const keyringIds = ['keyring-1', 'keyring-2'];

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(keyringIds);

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      });

      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
        JSON.stringify(AccountDiscovery.pendingKeyring),
      );
    });

    it('add keyring IDs with specific client types', async () => {
      // Arrange
      const keyringIds = ['keyring-1'];
      const clientTypes = [WalletClientType.Bitcoin];

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(
        keyringIds,
        clientTypes,
      );

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
        },
      });
    });

    it('merge with existing pending keyrings without overwriting', async () => {
      // Arrange
      const pendingKeyring = {
        'existing-keyring': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      const keyringIds = ['existing-keyring'];
      const clientTypes = [WalletClientType.Bitcoin];

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(
        keyringIds,
        clientTypes,
      );

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'existing-keyring': {
          [WalletClientType.Bitcoin]: true, // Should be updated
          [WalletClientType.Solana]: true, // Should remain unchanged
        },
      });
    });

    it('handle empty keyring IDs array', async () => {
      // Arrange
      const initialState = AccountDiscovery.pendingKeyring;

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery([]);

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual(initialState);
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
        JSON.stringify(initialState),
      );
    });

    it('handle storage errors gracefully', async () => {
      // Arrange
      await AccountDiscovery.init();
      mockStorageWrapper.setItem.mockRejectedValue(new Error('Storage error'));
      const keyringIds = ['keyring-1'];

      // Act & Assert
      await expect(
        AccountDiscovery.addKeyringForAcccountDiscovery(keyringIds),
      ).rejects.toThrow('Storage error');

      // assign back mock implementation
      mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
        storageScratchPad[key] = value;
      });
    });
  });

  describe('singleton pattern', () => {
    it('export a singleton instance', () => {
      // Act & Assert
      expect(AccountDiscovery).toBeDefined();
      expect(typeof AccountDiscovery.attemptAccountDiscovery).toBe('function');
      expect(typeof AccountDiscovery.performAccountDiscovery).toBe('function');
      expect(typeof AccountDiscovery.clearPendingKeyring).toBe('function');
      expect(typeof AccountDiscovery.addKeyringForAcccountDiscovery).toBe(
        'function',
      );
    });
  });

  describe('storage integration', () => {
    it('persist state changes to storage correctly', async () => {
      // Arrange
      const keyringIds = ['test-keyring'];

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(keyringIds);

      // Assert
      expect(mockStorageWrapper.setItem).toHaveBeenCalledWith(
        PENDING_SRP_DISCOVERY,
        expect.any(String),
      );

      // Verify the JSON content structure
      const setItemCalls = mockStorageWrapper.setItem.mock.calls;
      const lastCall = setItemCalls[setItemCalls.length - 1];
      const storedJSON = JSON.parse(lastCall[1]);
      expect(storedJSON).toEqual({
        'test-keyring': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      });
    });

    it('load state from storage on initialization', async () => {
      // Arrange
      const storedState = {
        'stored-keyring': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: false,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(storedState);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual(storedState);
    });
  });

  describe('error handling', () => {
    it('handle client creation errors during discovery', async () => {
      // Arrange
      mockMultichainWalletSnapFactory.createClient.mockImplementation(() => {
        throw new Error('Client creation failed');
      });
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act & Assert
      await expect(AccountDiscovery.performAccountDiscovery()).rejects.toThrow(
        'Client creation failed',
      );

      // We intentionally access a private property for test verification.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect((AccountDiscovery as any).discoveryRunning).toBe(false);
    });

    it('handle addDiscoveredAccounts errors and continue with other discoveries', async () => {
      // Arrange
      mockClient.addDiscoveredAccounts
        .mockRejectedValueOnce(new Error('First discovery failed'))
        .mockResolvedValueOnce(0);

      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      };

      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act & Assert
      await expect(AccountDiscovery.performAccountDiscovery()).rejects.toThrow(
        'First discovery failed',
      );
    });
  });

  describe('edge cases', () => {
    it('handle empty pending keyring during discovery', async () => {
      // Arrange
      const pendingKeyring = {};
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).not.toHaveBeenCalled();

      // We intentionally access a private property for test verification.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      expect((AccountDiscovery as any).discoveryRunning).toBe(false);
    });

    it('handle wallet types with all false values', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: false,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).not.toHaveBeenCalled();
    });
  });
});
