import {
  MultichainWalletSnapClient,
  MultichainWalletSnapFactory,
  WALLET_SNAP_MAP,
  WalletClientType,
} from '../SnapKeyring/MultichainWalletSnapClient';
import StorageWrapper from '../../store/storage-wrapper';
import { AccountDiscoveryService } from './AccountDiscovery';
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
  let AccountDiscovery: AccountDiscoveryService;
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
    // Clear storage scratch pad
    Object.keys(storageScratchPad).forEach(
      (key) => delete storageScratchPad[key],
    );

    AccountDiscovery = await AccountDiscoveryService.getInstance();
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

    it('initialize with empty string from storage', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue('');

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });

    it('initialize with null from storage', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue(null);

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });

    it('reset discovery running flag during initialization', async () => {
      // Arrange
      // We intentionally access a private property for test setup.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (AccountDiscovery as any).discoveryRunning = true;

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('handle multiple consecutive initialization calls', async () => {
      // Arrange
      const storedData = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(storedData);

      // Act
      await AccountDiscovery.init();
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual(storedData);
      expect(mockStorageWrapper.getItem).toHaveBeenCalledTimes(2);
    });

    it('handle invalid JSON that parses to falsy values', async () => {
      // Arrange
      mockStorageWrapper.getItem.mockResolvedValue('null');

      // Act
      await AccountDiscovery.init();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });
  });

  describe('pendingKeyring getter', () => {
    it('return empty object when no pending keyrings exist', async () => {
      // Arrange
      await AccountDiscovery.init();

      // Act & Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
      expect(typeof AccountDiscovery.pendingKeyring).toBe('object');
    });

    it('return the current pending keyring state', async () => {
      // Arrange
      const expectedState = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: false,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(expectedState);
      await AccountDiscovery.init();

      // Act
      const result = AccountDiscovery.pendingKeyring;

      // Assert
      expect(result).toEqual(expectedState);
      expect(result).toBe(AccountDiscovery.pendingKeyring); // Should return same reference
    });

    it('reflect changes made through addKeyringForAcccountDiscovery', async () => {
      // Arrange
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(['test-keyring']);

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'test-keyring': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      });
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

    it('not affect storage when clearing pending keyring', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();
      jest.clearAllMocks();

      // Act
      AccountDiscovery.clearPendingKeyring();

      // Assert
      expect(mockStorageWrapper.setItem).not.toHaveBeenCalled();
      expect(mockStorageWrapper.removeItem).not.toHaveBeenCalled();
    });

    it('clear complex pending keyring structures', async () => {
      // Arrange
      const complexPendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: false,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: true,
        },
        'keyring-3': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(
        complexPendingKeyring,
      );
      await AccountDiscovery.init();

      // Act
      AccountDiscovery.clearPendingKeyring();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({});
    });
  });

  describe('isDiscoveryRunning getter', () => {
    it('return false when discovery is not running', async () => {
      // Arrange
      await AccountDiscovery.init();

      // Act & Assert
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('return true when discovery is running', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      const discoveryPromise = AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(AccountDiscovery.isDiscoveryRunning).toBe(true);

      // Clean up
      await discoveryPromise;
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });
  });

  describe('syncRunningDiscovery', () => {
    it('resolve immediately when no discovery is running', async () => {
      // Arrange
      await AccountDiscovery.init();

      // Act
      const startTime = Date.now();
      await AccountDiscovery.syncRunningDiscovery();
      const endTime = Date.now();

      // Assert
      expect(endTime - startTime).toBeLessThan(50); // Should resolve quickly
    });

    it('wait for ongoing discovery to complete', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      let discoveryCompleted = false;
      mockClient.addDiscoveredAccounts.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate delay
        discoveryCompleted = true;
        return 0;
      });

      // Act
      const discoveryPromise = AccountDiscovery.attemptAccountDiscovery();

      // Start sync after a small delay to ensure discovery has started
      await new Promise((resolve) => setTimeout(resolve, 10));
      const syncPromise = AccountDiscovery.syncRunningDiscovery();

      // Assert
      expect(discoveryCompleted).toBe(false);
      await syncPromise;
      expect(discoveryCompleted).toBe(true);

      // Clean up
      await discoveryPromise;
    });
  });

  describe('attemptAccountDiscovery', () => {
    it('successfully perform discovery for pending keyrings', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.attemptAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('throw error when attempting discovery while already running', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      mockClient.addDiscoveredAccounts.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 0;
      });

      // Act
      const firstDiscovery = AccountDiscovery.attemptAccountDiscovery();

      // Assert
      await expect(AccountDiscovery.attemptAccountDiscovery()).rejects.toThrow(
        'discovery is running',
      );

      // Clean up
      await firstDiscovery;
    });

    it('handle discovery errors and reset running state', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      mockClient.addDiscoveredAccounts.mockRejectedValue(
        new Error('Discovery failed'),
      );

      // Act & Assert
      await expect(AccountDiscovery.attemptAccountDiscovery()).rejects.toThrow(
        'Discovery failed',
      );
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });
  });

  describe('concurrent discovery management', () => {
    it('manage discovery promise correctly across multiple calls', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
        'keyring-2': { [WalletClientType.Solana]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      let callCount = 0;
      mockClient.addDiscoveredAccounts.mockImplementation(async () => {
        callCount++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 0;
      });

      // Act
      const discovery1 = AccountDiscovery.attemptAccountDiscovery();
      const sync1 = AccountDiscovery.syncRunningDiscovery();
      const sync2 = AccountDiscovery.syncRunningDiscovery();

      // Assert
      await Promise.all([discovery1, sync1, sync2]);
      expect(callCount).toBeGreaterThan(0);
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('handle multiple sync calls when no discovery is running', async () => {
      // Arrange
      await AccountDiscovery.init();

      // Act
      const syncPromises = [
        AccountDiscovery.syncRunningDiscovery(),
        AccountDiscovery.syncRunningDiscovery(),
        AccountDiscovery.syncRunningDiscovery(),
      ];

      // Assert
      await Promise.all(syncPromises);
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('ensure discovery promise is reset after completion', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.attemptAccountDiscovery();

      // Start new discovery after first one completes
      await AccountDiscovery.addKeyringForAcccountDiscovery(['keyring-2']);
      await AccountDiscovery.attemptAccountDiscovery();

      // Assert
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-2',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
    });

    it('handle rapid successive sync calls during active discovery', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      let discoveryInProgress = false;
      mockClient.addDiscoveredAccounts.mockImplementation(async () => {
        discoveryInProgress = true;
        await new Promise((resolve) => setTimeout(resolve, 100));
        discoveryInProgress = false;
        return 0;
      });

      // Act
      const discoveryPromise = AccountDiscovery.attemptAccountDiscovery();

      // Create multiple sync promises in rapid succession
      const syncPromises = [];
      for (let i = 0; i < 10; i++) {
        syncPromises.push(AccountDiscovery.syncRunningDiscovery());
      }

      // Assert
      expect(discoveryInProgress || AccountDiscovery.isDiscoveryRunning).toBe(
        true,
      );

      await Promise.all([discoveryPromise, ...syncPromises]);
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
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

    it('add duplicate keyring with different client types', async () => {
      // Arrange
      await AccountDiscovery.init();
      await AccountDiscovery.addKeyringForAcccountDiscovery(
        ['keyring-1'],
        [WalletClientType.Bitcoin],
      );

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(
        ['keyring-1'],
        [WalletClientType.Solana],
      );

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      });
    });

    it('handle empty client types array', async () => {
      // Arrange
      await AccountDiscovery.init();
      const keyringIds = ['keyring-1'];

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(keyringIds, []);

      // Assert - When empty array is passed, no wallet types should be added
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {},
      });
    });

    it('preserve existing client types when adding new ones', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
        },
        'keyring-2': {
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(
        ['keyring-1', 'keyring-3'],
        [WalletClientType.Solana],
      );

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: false, // preserved
          [WalletClientType.Solana]: true, // added
        },
        'keyring-2': {
          [WalletClientType.Solana]: true, // unchanged
        },
        'keyring-3': {
          [WalletClientType.Solana]: true, // new keyring
        },
      });
    });

    it('handle large number of keyring IDs', async () => {
      // Arrange
      await AccountDiscovery.init();
      const keyringIds = Array.from({ length: 100 }, (_, i) => `keyring-${i}`);

      // Act
      await AccountDiscovery.addKeyringForAcccountDiscovery(keyringIds, [
        WalletClientType.Bitcoin,
      ]);

      // Assert
      expect(Object.keys(AccountDiscovery.pendingKeyring)).toHaveLength(100);
      expect(AccountDiscovery.pendingKeyring['keyring-0']).toEqual({
        [WalletClientType.Bitcoin]: true,
      });
      expect(AccountDiscovery.pendingKeyring['keyring-99']).toEqual({
        [WalletClientType.Bitcoin]: true,
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

    it('return the same instance on multiple getInstance calls', async () => {
      // Act
      const instance1 = await AccountDiscoveryService.getInstance();
      const instance2 = await AccountDiscoveryService.getInstance();

      // Assert
      expect(instance1).toBe(instance2);
      expect(instance1).toBe(AccountDiscovery);
    });

    it('prevent direct instantiation', () => {
      // Act & Assert
      expect(() => new AccountDiscoveryService({} as symbol)).toThrow(
        'Cannot instantiate AccountDiscoveryService directly',
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

    it('handle keyring with missing wallet client types', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {}, // Empty wallet types
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).not.toHaveBeenCalled();
    });

    it('verify final storage state after successful discovery', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(AccountDiscovery.pendingKeyring).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: false,
        },
      });

      // Verify final storage contains updated state
      const finalStorageCall =
        mockStorageWrapper.setItem.mock.calls[
          mockStorageWrapper.setItem.mock.calls.length - 1
        ];
      const finalStoredData = JSON.parse(finalStorageCall[1]);
      expect(finalStoredData).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: false,
        },
      });
    });

    it('handle discovery with mixed pending and completed items', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true, // pending
          [WalletClientType.Solana]: false, // already completed
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: false, // already completed
          [WalletClientType.Solana]: true, // pending
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledTimes(2);
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-2',
        WALLET_SNAP_MAP[WalletClientType.Solana].discoveryScope,
      );
    });

    it('handle undefined values in pending keyring structure', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: undefined, // undefined value
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert - Should only process truthy values
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledTimes(1);
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
    });
  });

  describe('advanced integration scenarios', () => {
    it('handle complete workflow from initialization to discovery completion', async () => {
      // Arrange
      const initialPendingData = {
        'existing-keyring': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: false,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] =
        JSON.stringify(initialPendingData);

      // Act & Assert - Complete workflow

      // 1. Initialize and verify existing data is loaded
      await AccountDiscovery.init();
      expect(AccountDiscovery.pendingKeyring).toEqual(initialPendingData);

      // 2. Add new keyrings
      await AccountDiscovery.addKeyringForAcccountDiscovery([
        'new-keyring-1',
        'new-keyring-2',
      ]);
      expect(Object.keys(AccountDiscovery.pendingKeyring)).toHaveLength(3);

      // 3. Perform discovery
      await AccountDiscovery.attemptAccountDiscovery();

      // 4. Verify all pending items are now false
      expect(
        AccountDiscovery.pendingKeyring['existing-keyring'][
          WalletClientType.Bitcoin
        ],
      ).toBe(false);
      expect(
        AccountDiscovery.pendingKeyring['new-keyring-1'][
          WalletClientType.Bitcoin
        ],
      ).toBe(false);
      expect(
        AccountDiscovery.pendingKeyring['new-keyring-1'][
          WalletClientType.Solana
        ],
      ).toBe(false);
      expect(
        AccountDiscovery.pendingKeyring['new-keyring-2'][
          WalletClientType.Bitcoin
        ],
      ).toBe(false);
      expect(
        AccountDiscovery.pendingKeyring['new-keyring-2'][
          WalletClientType.Solana
        ],
      ).toBe(false);

      // 5. Verify discovery is no longer running
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);
    });

    it('handle storage errors during discovery and maintain state consistency', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': { [WalletClientType.Bitcoin]: true },
        'keyring-2': { [WalletClientType.Solana]: true },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Make storage fail after first discovery
      let storageCallCount = 0;
      mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
        storageCallCount++;
        if (storageCallCount === 1) {
          storageScratchPad[key] = value; // First call succeeds
        } else {
          throw new Error('Storage failure'); // Subsequent calls fail
        }
      });

      // Act & Assert
      await expect(AccountDiscovery.performAccountDiscovery()).rejects.toThrow(
        'Storage failure',
      );

      // Verify discovery is no longer running even after error
      expect(AccountDiscovery.isDiscoveryRunning).toBe(false);

      // Verify that first discovery completed and updated local state
      expect(
        AccountDiscovery.pendingKeyring['keyring-1'][WalletClientType.Bitcoin],
      ).toBe(false);
    });

    it('verify discovery progress updates storage incrementally', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Track storage updates
      const storageUpdates: string[] = [];
      mockStorageWrapper.setItem.mockImplementation(async (key, value) => {
        storageUpdates.push(value);
        storageScratchPad[key] = value;
      });

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert - Storage should be updated after each successful discovery
      expect(storageUpdates.length).toBeGreaterThan(1);

      // Verify intermediate updates contain proper state progression
      const finalUpdate = JSON.parse(storageUpdates[storageUpdates.length - 1]);
      expect(finalUpdate).toEqual({
        'keyring-1': {
          [WalletClientType.Bitcoin]: false,
          [WalletClientType.Solana]: false,
        },
        'keyring-2': {
          [WalletClientType.Bitcoin]: false,
        },
      });
    });

    it('handle client creation with different configurations', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert - Verify client was created with correct configuration for each wallet type
      expect(mockMultichainWalletSnapFactory.createClient).toHaveBeenCalledWith(
        WalletClientType.Bitcoin,
        { setSelectedAccount: false },
      );
      expect(mockMultichainWalletSnapFactory.createClient).toHaveBeenCalledWith(
        WalletClientType.Solana,
        { setSelectedAccount: false },
      );
    });

    it('handle discovery scope configuration for different wallet types', async () => {
      // Arrange
      const pendingKeyring = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(pendingKeyring);
      await AccountDiscovery.init();

      // Act
      await AccountDiscovery.performAccountDiscovery();

      // Assert - Verify correct discovery scopes are used
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Bitcoin].discoveryScope,
      );
      expect(mockClient.addDiscoveredAccounts).toHaveBeenCalledWith(
        'keyring-1',
        WALLET_SNAP_MAP[WalletClientType.Solana].discoveryScope,
      );
    });

    it('maintain instance consistency across multiple getInstance calls with different states', async () => {
      // Arrange - Get instance and modify state
      const instance1 = await AccountDiscoveryService.getInstance();
      await instance1.addKeyringForAcccountDiscovery(['test-keyring']);

      // Act - Get instance again
      const instance2 = await AccountDiscoveryService.getInstance();

      // Assert - Should be same instance with same state
      expect(instance1).toBe(instance2);
      expect(instance2.pendingKeyring).toEqual({
        'test-keyring': {
          [WalletClientType.Bitcoin]: true,
          [WalletClientType.Solana]: true,
        },
      });
    });

    it('handle initialization with corrupted but parseable storage data', async () => {
      // Arrange - Set storage with unexpected structure
      const corruptedData = {
        'keyring-1': {
          [WalletClientType.Bitcoin]: 'not-a-boolean',
          'unknown-wallet-type': true,
        },
        'keyring-2': 'not-an-object',
      };
      storageScratchPad[PENDING_SRP_DISCOVERY] = JSON.stringify(corruptedData);

      // Act
      await AccountDiscovery.init();

      // Assert - Should load the data as-is (allowing for graceful handling)
      expect(AccountDiscovery.pendingKeyring).toEqual(corruptedData);
    });
  });
});
